from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import HTTPException, status
from jose import JWTError, jwt


ALGORITHM = "HS256"


def _get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET must be set")
    return secret


def create_token(user_id: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "exp": expires_at,
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=ALGORITHM)


def verify_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

