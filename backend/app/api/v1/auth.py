"""Authentication API endpoints — backed by the real AuthService + database.

Flow:
  POST /auth/register  -> create officer account (PBKDF2-hashed password)
  POST /auth/login     -> verify credentials, issue session + refresh tokens
  POST /auth/logout    -> invalidate the presented session token
  GET  /auth/me        -> resolve the authenticated officer from the token
  POST /auth/refresh   -> rotate an expired access token via the refresh token
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import AfterValidator, BaseModel, Field, field_validator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import RefreshToken, Session
from app.models.user import User, UserRole
from app.services.auth.service import AuthService
from app.services.pipeline_db import SessionFactory

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ACCESS_TTL_HOURS = 1
REFRESH_TTL_DAYS = 30


def _validate_email(v: str) -> str:
    """Pragmatic syntax check for login emails.

    Full RFC validation (email-validator) is intentionally not used: it
    unconditionally rejects special-use domains such as `.local`, which the
    seeded demo officers use. Address validity is not a security control for
    password auth — regex syntax + length bounds are sufficient here.
    """
    import re

    v = v.strip().lower()
    pattern = r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
    if not re.fullmatch(pattern, v) or len(v) > 254:
        raise ValueError("not a valid email address")
    return v


Email = Annotated[str, AfterValidator(_validate_email)]

async def get_db() -> AsyncSession:
    """FastAPI dependency yielding an async session from the shared factory."""
    async with SessionFactory() as session:
        yield session


# ── Request / response schemas ──────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: Email
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=120)
    role: UserRole = UserRole.DIGITIZATION_OFFICER

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
            raise ValueError("password must contain letters and digits")
        return v


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str

    @classmethod
    def from_user(cls, user: User) -> "UserResponse":
        return cls(id=user.id, email=user.email, name=user.username, role=user.role.value)


TokenResponse.model_rebuild()


# ── Token helpers ───────────────────────────────────────────────────────


async def _issue_tokens(user: User, db: AsyncSession) -> TokenResponse:
    access = secrets.token_urlsafe(48)
    refresh = secrets.token_urlsafe(48)
    db.add(Session(
        user_id=user.id,
        token=access,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
    ))
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
    ))
    await db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=ACCESS_TTL_HOURS * 3600,
        user=UserResponse.from_user(user),
    )


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: resolve the officer behind the presented bearer token."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await AuthService.validate_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ── Endpoints ───────────────────────────────────────────────────────────


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new officer account."""
    try:
        user = await AuthService().register(
            db, email=req.email, password=req.password, name=req.name, role=req.role
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return UserResponse.from_user(user)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Verify credentials and issue session + refresh tokens."""
    result = await AuthService().login(db, email=req.email, password=req.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(**result)


@router.post("/logout")
async def logout(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Invalidate the presented session token (idempotent)."""
    if token:
        await AuthService.logout(db, token)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current: User = Depends(get_current_user)):
    """Return the authenticated officer's profile."""
    return UserResponse.from_user(current)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: "RefreshRequest", db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a fresh session."""
    row = (await db.execute(
        select(RefreshToken).where(RefreshToken.token == req.refresh_token)
    )).scalar_one_or_none()
    if row is None or _as_aware(row.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user = (await db.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user for refresh token")
    await db.delete(row)  # rotate: one-time use
    return await _issue_tokens(user, db)


class RefreshRequest(BaseModel):
    refresh_token: str


def _as_aware(dt: datetime) -> datetime:
    """SQLite returns naive UTC datetimes; normalize before comparisons."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
