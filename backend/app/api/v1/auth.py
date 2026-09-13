"""Authentication API endpoints — wired to the real AuthService + DB."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, field_validator, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.services.auth.service import AuthService
from app.models.auth import UserRole

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _validate_email(v: str) -> str:
    """Basic email format check (allows reserved demo TLDs like .local)."""
    import re
    v = (v or "").strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
        raise ValueError("Invalid email address")
    return v


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.OPERATOR
    org_scope: Optional[dict] = None

    _validate_email = field_validator("email")(_validate_email)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str

    _validate_email = field_validator("email")(_validate_email)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    org_scope: Optional[dict] = None


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new officer account."""
    try:
        user = await AuthService.register(
            db, email=req.email, password=req.password,
            name=req.name, role=req.role, org_scope=req.org_scope,
        )
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role.value if isinstance(user.role, UserRole) else str(user.role),
            org_scope=user.org_scope,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + password and receive session tokens."""
    try:
        tokens = await AuthService.login(db, email=req.email, password=req.password)
        return TokenResponse(**tokens)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Invalidate the current session token."""
    deleted = await AuthService.logout(db, token)
    return {"message": "Logged out successfully", "session_invalidated": deleted}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Validate the session token and return the current user."""
    user = await AuthService.validate_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid — please sign in again",
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value if isinstance(user.role, UserRole) else str(user.role),
        org_scope=user.org_scope,
    )
