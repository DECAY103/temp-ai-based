"""JWT authentication and role guards shared by protected routes."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import JWTError, jwt

from datetime import datetime, timezone
from app.config import settings
from app.models import UserRole


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    email: str
    role: UserRole
    token: str = ""


async def current_user(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
) -> CurrentUser:
    token = access_token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = str(payload["sub"])
        role = UserRole(payload["role"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.") from exc

    try:
        from app.persistence import repository
        if await repository.is_token_revoked(token):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked.")

        user_row = await repository.get_user(user_id)
        if user_row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account no longer exists.")

        revoked_before = await repository.get_user_tokens_revoked_before(user_id)
        iat = payload.get("iat")
        if revoked_before and iat:
            iat_dt = datetime.fromtimestamp(iat, tz=timezone.utc)
            if iat_dt < revoked_before:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    except RuntimeError:
        pass

    return CurrentUser(user_id=user_id, email=payload["email"], role=role, token=token)


def require_roles(*roles: UserRole) -> Callable:
    async def guard(user: CurrentUser = Depends(current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
        return user
    return guard
