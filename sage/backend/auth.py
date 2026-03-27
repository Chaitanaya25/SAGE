import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

JWT_SECRET: str = os.environ.get("JWT_SECRET", "changeme")
ALGORITHM: str = "HS256"
TOKEN_EXPIRE_MINUTES: int = 60 * 24

_bearer = HTTPBearer()


def create_token(user_id: str, role: str) -> str:
    """Create a signed JWT containing the user's ID, role, and expiry."""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """Decode and validate a JWT, returning its payload.

    Raises HTTPException 401 if the token is missing, expired, or invalid.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency that extracts and validates the Bearer token.

    Returns the decoded JWT payload (includes ``sub`` and ``role`` fields).
    """
    return verify_token(credentials.credentials)
