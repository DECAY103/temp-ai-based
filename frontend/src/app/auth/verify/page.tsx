/**
 * 2FA verification page — supports both email-OTP and TOTP.
 * Owner: Person 1 (M.2)
 *
 * Key behaviours:
 *  - Reads temp_token, otp_mode, and hint from search params.
 *  - Shows appropriate instructions based on otp_mode ("email" vs "totp").
 *  - After verification: shows last-login banner PERMANENTLY (no auto-redirect timer).
 *    The user clicks "Go to dashboard" to proceed.
 */
"use client";

import { Suspense, useState } from "react";
import { authApi } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tempToken = params.get("temp_token") ?? "";
  const otpMode = params.get("otp_mode") ?? "email";
  const hint = params.get("hint") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { role: userRole, last_login_at } = await authApi.verify(tempToken, code);
      setRole(userRole);
      setLastLogin(last_login_at);
      setVerified(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Post-verification screen (stays until the user clicks the button) ──────
  if (verified) {
    const formattedLogin = lastLogin
      ? new Date(lastLogin).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : null;
    const destination = role === "recruiter" ? "/recruiter" : "/candidate";

    return (
      <main className="auth-shell">
        <div className="auth-bg-decoration" aria-hidden="true">
          <div className="auth-orb auth-orb--1" />
          <div className="auth-orb auth-orb--2" />
        </div>
        <section className="auth-card-v2">
          <div className="auth-brand">
            <span className="brand-mark" aria-hidden="true">R</span>
            <span className="brand-name">Resume Screening</span>
          </div>

          <div className="auth-success-icon verified-checkmark">✓</div>
          <h1 className="auth-title" style={{ marginTop: "12px" }}>Session verified!</h1>
          <p className="auth-subtitle">Your identity has been confirmed.</p>

          {formattedLogin ? (
            <div className="last-login-banner">
              <span className="last-login-icon">🕐</span>
              <div>
                <p className="last-login-label">Your last login was</p>
                <p className="last-login-time">{formattedLogin}</p>
              </div>
            </div>
          ) : (
            <div className="last-login-banner">
              <span className="last-login-icon">🎉</span>
              <div>
                <p className="last-login-label">First login</p>
                <p className="last-login-time">Welcome to Resume Screening!</p>
              </div>
            </div>
          )}

          <button
            className="primary auth-submit-btn"
            style={{ marginTop: "24px" }}
            onClick={() => router.push(destination)}
          >
            Go to dashboard →
          </button>
        </section>
      </main>
    );
  }

  // ── Verification form ─────────────────────────────────────────────────────
  const isEmail = otpMode === "email";

  return (
    <main className="auth-shell">
      <div className="auth-bg-decoration" aria-hidden="true">
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
      </div>
      <section className="auth-card-v2">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span className="brand-name">Resume Screening</span>
        </div>

        <h1 className="auth-title">Two-factor verification</h1>
        <p className="auth-subtitle">
          {hint ||
            (isEmail
              ? "A 6-digit code was sent to your email address."
              : "Enter the current code from your authenticator app.")}
        </p>

        {isEmail && (
          <div className="otp-email-badge">
            <span>📧</span> Check your inbox — the code expires in 10 minutes
          </div>
        )}

        <form className="form-stack" onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <div>
            <label className="field-label" htmlFor="2fa-code">
              {isEmail ? "Email verification code" : "Authenticator code"}
            </label>
            <input
              id="2fa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              className="otp-input"
            />
          </div>
          {error && <p className="message error-message" role="alert">{error}</p>}
          <button className="primary auth-submit-btn" id="verify-submit" type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Verify →"}
          </button>
        </form>

        <div className="auth-footer-links" style={{ marginTop: "16px" }}>
          <button className="link-button" onClick={() => router.push("/auth/login")}>
            ← Back to sign in
          </button>
        </div>
      </section>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <main className="auth-shell">
        <section className="auth-card-v2">
          <p style={{ color: "var(--muted)", textAlign: "center" }}>Loading…</p>
        </section>
      </main>
    }>
      <VerifyForm />
    </Suspense>
  );
}
