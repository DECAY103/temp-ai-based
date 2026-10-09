"""Registration, password login, email-OTP / TOTP verification, JWT issuance, password reset, and activity logging.

OTP_MODE env var controls which second factor is used:
  email  — a 6-digit code is emailed after a successful password check  (default)
  totp   — the user scans a QR / provisioning URI into an authenticator app
"""
from __future__ import annotations
import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import pyotp
from fastapi import APIRouter, HTTPException, Request, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.models import (
    ActivityLogEntry, ActivityLogsResponse,
    LoginRequest, LoginResponse,
    PasswordResetConfirm, PasswordResetRequest, PasswordResetResponse,
    PasswordStrengthResponse,
    RegisterRequest, RegisterResponse,
    TokenResponse, VerifyRequest,
)
from app.persistence import repository
from app.security import CurrentUser, current_user
from fastapi import Depends

logger = logging.getLogger(__name__)
router = APIRouter()
# PBKDF2 avoids the passlib/bcrypt 5.x compatibility break and is available in
# Python's standard hashlib on every deployment target.
_passwords = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

_USE_EMAIL_OTP: bool = settings.otp_mode.lower() == "email"


def _token(claims: dict, minutes: int) -> str:
    return jwt.encode({**claims, "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _client_info(request: Request) -> tuple[str | None, str | None]:
    """Extract client IP and User-Agent from the request."""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    ua = request.headers.get("user-agent")
    return ip, ua


def _hash_otp(code: str) -> str:
    """SHA-256 hash of the plain OTP code — cheap, fast, reversible-compare."""
    return hashlib.sha256(code.encode()).hexdigest()


# ─── SMTP helpers ────────────────────────────────────────────────────────────

def _smtp_send_sync(to_email: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    """Synchronous low-level SMTP send. Runs inside a background thread pool."""
    if not settings.smtp_host:
        logger.warning("[SMTP] Host not configured. Code/message for %s: %s", to_email, body_text)
        return
    msg = MIMEMultipart("alternative") if body_html else MIMEText(body_text, "plain")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    if body_html:
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

    # Strict timeout (5s) prevents Vercel proxy timeouts if SMTP server hangs
    timeout_secs = 5.0
    is_ssl = (settings.smtp_port == 465)
    logger.info("[SMTP] Connecting to %s:%s (SSL=%s, timeout=%ss)...", settings.smtp_host, settings.smtp_port, is_ssl, timeout_secs)

    if is_ssl:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=timeout_secs) as server:
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=timeout_secs) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

    logger.info("[SMTP] Successfully sent email to %s (subject: %s)", to_email, subject)


async def _send_otp_email(to_email: str, code: str) -> None:
    """Email the 6-digit OTP code to the user in a non-blocking thread."""
    expire_min = settings.smtp_otp_expire_minutes
    plain = (
        f"Your Resume Screening login code is: {code}\n\n"
        f"This code expires in {expire_min} minutes.\n"
        "If you did not attempt to sign in, you can safely ignore this email."
    )
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px">
      <p style="margin:0 0 8px;color:#315247;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Resume Screening</p>
      <h1 style="margin:0 0 20px;font-size:1.6rem;color:#1f2933;letter-spacing:-.03em">Your sign-in code</h1>
      <div style="display:inline-block;padding:18px 32px;background:#f3f6f4;border-radius:10px;font-size:2.2rem;font-weight:800;letter-spacing:.18em;color:#315247">{code}</div>
      <p style="margin:20px 0 0;color:#667085;font-size:.9rem;line-height:1.6">
        This code expires in <strong>{expire_min} minutes</strong>.<br>
        If you did not try to sign in, ignore this email.
      </p>
    </div>
    """
    await asyncio.to_thread(_smtp_send_sync, to_email, "Your Resume Screening sign-in code", plain, html)


async def _send_reset_email(to_email: str, reset_url: str) -> None:
    """Send password reset email via SMTP asynchronously."""
    expire_min = settings.password_reset_expire_minutes
    plain = (
        f"Click the link below to reset your password. This link expires in {expire_min} minutes.\n\n"
        f"{reset_url}\n\nIf you did not request this, ignore this email."
    )
    logger.info("[Password Reset] Reset link for %s: %s", to_email, reset_url)
    try:
        await asyncio.wait_for(
            asyncio.to_thread(_smtp_send_sync, to_email, "Password Reset — Resume Screening", plain),
            timeout=5.0,
        )
    except Exception as exc:
        logger.warning("[Password Reset] Could not deliver email to %s: %s", to_email, exc)


# ─── Password Strength (client-side check endpoint) ──────────────────────────

@router.post("/password-strength", response_model=PasswordStrengthResponse)
async def check_password_strength(body: dict) -> PasswordStrengthResponse:
    password = body.get("password", "")
    result = RegisterRequest.check_password_strength(password)
    return PasswordStrengthResponse(**result)


# ─── Register ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request) -> RegisterResponse:
    ip, ua = _client_info(request)

    # Enforce password strength server-side
    strength = RegisterRequest.check_password_strength(body.password)
    if not strength["is_acceptable"]:
        await repository.log_activity("register_failed_weak_password", email=body.email, detail=f"Password strength: {strength['level']}", ip_address=ip, user_agent=ua)
        raise HTTPException(status_code=400, detail=f"Password too weak ({strength['level']}). Must include uppercase, lowercase, digit, and special character.")

    # totp_secret is always generated but only surfaced to the user in TOTP mode
    secret = pyotp.random_base32()
    try:
        user = await repository.create_user(body.email, _passwords.hash(body.password), body.role, secret)
    except ValueError as exc:
        await repository.log_activity("register_failed_duplicate", email=body.email, detail=str(exc), ip_address=ip, user_agent=ua)
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    await repository.log_activity("register_success", user_id=str(user["id"]), email=body.email, detail=f"Role: {body.role.value}", ip_address=ip, user_agent=ua)

    if _USE_EMAIL_OTP:
        return RegisterResponse(
            message="Account created. Sign in with your email and password — a one-time code will be emailed to you.",
            otpauth_uri="",  # not used in email-OTP mode
            otp_mode="email",
        )
    return RegisterResponse(
        message="Add this account to an authenticator app, then sign in.",
        otpauth_uri=pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="Resume Screening"),
        otp_mode="totp",
    )


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request) -> LoginResponse:
    ip, ua = _client_info(request)
    user = await repository.get_user_by_email(body.email)
    if not user or not _passwords.verify(body.password, user["password_hash"]):
        await repository.log_activity("login_failed", email=body.email, detail="Invalid email or password", ip_address=ip, user_agent=ua)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    await repository.log_activity("login_password_ok", user_id=str(user["id"]), email=body.email, detail="Proceeding to 2FA", ip_address=ip, user_agent=ua)
    token = _token({"sub": str(user["id"]), "email": user["email"], "purpose": "2fa"}, settings.temp_token_expire_minutes)

    if _USE_EMAIL_OTP:
        # Generate a 6-digit OTP, store its hash, and send via email
        plain_code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.smtp_otp_expire_minutes)
        await repository.create_email_otp(str(user["id"]), _hash_otp(plain_code), expires_at)

        # Always log the OTP in server logs so it is visible in Render logs even if SMTP fails
        logger.info("[2FA OTP] Generated code for %s: %s (expires in %sm)", user["email"], plain_code, settings.smtp_otp_expire_minutes)

        try:
            await asyncio.wait_for(_send_otp_email(user["email"], plain_code), timeout=6.0)
        except Exception as exc:
            logger.error("Failed to send OTP email to %s: %s", user["email"], exc)
            # Surface the error only when SMTP is expected to be configured
            if settings.smtp_host:
                raise HTTPException(
                    status_code=503,
                    detail=f"Could not send verification email ({str(exc) or 'timeout'}). Check SMTP settings on Render or retrieve your login code from server logs."
                ) from exc

        return LoginResponse(
            message=f"A 6-digit code has been sent to {user['email']}. Enter it below.",
            temp_token=token,
            otp_mode="email",
        )

    return LoginResponse(
        message="Enter the current code from your authenticator app.",
        temp_token=token,
        otp_mode="totp",
    )


# ─── 2FA Verification ────────────────────────────────────────────────────────

@router.post("/verify", response_model=TokenResponse)
async def verify_2fa(body: VerifyRequest, response: Response, request: Request) -> TokenResponse:
    ip, ua = _client_info(request)
    try:
        claims = jwt.decode(body.temp_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if claims.get("purpose") != "2fa": raise JWTError("wrong token")
    except JWTError as exc:
        await repository.log_activity("verify_failed_expired", detail="Verification session expired", ip_address=ip, user_agent=ua)
        raise HTTPException(status_code=401, detail="Verification session expired.") from exc
    user = await repository.get_user(claims["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if _USE_EMAIL_OTP:
        otp_row = await repository.get_valid_email_otp(claims["sub"])
        if not otp_row or otp_row["code"] != _hash_otp(body.code):
            await repository.log_activity("verify_failed_bad_code", user_id=claims["sub"], email=claims.get("email"), detail="Invalid or expired email OTP", ip_address=ip, user_agent=ua)
            raise HTTPException(status_code=401, detail="Invalid or expired verification code.")
        await repository.mark_email_otp_used(str(otp_row["id"]))
    else:
        if not pyotp.TOTP(user["totp_secret"]).verify(body.code, valid_window=1):
            await repository.log_activity("verify_failed_bad_code", user_id=claims["sub"], email=claims.get("email"), detail="Invalid authenticator code", ip_address=ip, user_agent=ua)
            raise HTTPException(status_code=401, detail="Invalid authenticator code.")

    # Update last login and get previous value
    previous_login = await repository.update_last_login(claims["sub"])
    await repository.log_activity("login_success", user_id=str(user["id"]), email=user["email"], detail=f"Previous login: {previous_login or 'first login'}", ip_address=ip, user_agent=ua)

    access = _token({"sub": str(user["id"]), "email": user["email"], "role": user["role"]}, settings.jwt_expire_minutes)
    response.set_cookie("access_token", access, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.jwt_expire_minutes * 60)
    return TokenResponse(access_token=access, role=user["role"], last_login_at=previous_login)


# ─── Password Reset — Request ────────────────────────────────────────────────

@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(body: PasswordResetRequest, request: Request) -> PasswordResetResponse:
    ip, ua = _client_info(request)
    # Always return success to avoid email enumeration
    user = await repository.get_user_by_email(body.email)
    if user:
        token = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_expire_minutes)
        await repository.create_password_reset_token(str(user["id"]), token, expires_at)
        reset_url = f"{settings.frontend_url}/auth/reset-password?token={token}"
        try:
            await _send_reset_email(body.email, reset_url)
        except Exception:
            pass  # Don't expose SMTP errors
        await repository.log_activity("password_reset_requested", user_id=str(user["id"]), email=body.email, ip_address=ip, user_agent=ua)
    else:
        await repository.log_activity("password_reset_unknown_email", email=body.email, ip_address=ip, user_agent=ua)
    return PasswordResetResponse(message="If an account with that email exists, a reset link has been sent.")


# ─── Password Reset — Confirm ────────────────────────────────────────────────

@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(body: PasswordResetConfirm, request: Request) -> PasswordResetResponse:
    ip, ua = _client_info(request)
    token_record = await repository.get_valid_reset_token(body.token)
    if not token_record:
        await repository.log_activity("password_reset_invalid_token", detail="Token invalid or expired", ip_address=ip, user_agent=ua)
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    # Enforce password strength
    strength = RegisterRequest.check_password_strength(body.new_password)
    if not strength["is_acceptable"]:
        raise HTTPException(status_code=400, detail=f"Password too weak ({strength['level']}). Must include uppercase, lowercase, digit, and special character.")

    user_id = str(token_record["user_id"])
    await repository.update_password(user_id, _passwords.hash(body.new_password))
    await repository.mark_reset_token_used(body.token)
    await repository.log_activity("password_reset_success", user_id=user_id, ip_address=ip, user_agent=ua)
    return PasswordResetResponse(message="Your password has been reset. You can now sign in with the new password.")


# ─── Activity Logs ────────────────────────────────────────────────────────────

@router.get("/activity-logs", response_model=ActivityLogsResponse)
async def get_activity_logs(user: CurrentUser = Depends(current_user)) -> ActivityLogsResponse:
    logs = await repository.get_activity_logs(user_id=user.user_id, limit=50)
    entries = [
        ActivityLogEntry(
            id=str(log["id"]),
            user_id=str(log["user_id"]) if log["user_id"] else None,
            email=log["email"],
            action=log["action"],
            detail=log["detail"],
            ip_address=log["ip_address"],
            created_at=log["created_at"].isoformat() if log["created_at"] else "",
        )
        for log in logs
    ]
    return ActivityLogsResponse(logs=entries)
