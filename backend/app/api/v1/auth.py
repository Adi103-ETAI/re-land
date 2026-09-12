"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
import asyncio

from app.services.auth.service import AuthService, seed_default_users
from app.models.auth import UserRole

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[UserRole] = UserRole.DIGITIZATION_OFFICER
    org_scope: Optional[dict] = None


class LoginRequest(BaseModel):
    email: str
    password: str


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


@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest):
    """Register a new officer."""
    try:
        # Placeholder - in real impl, would use DB session
        user = {
            "id": 1,
            "email": req.email,
            "name": req.name,
            "role": req.role.value if req.role else UserRole.DIGITIZATION_OFFICER.value,
            "org_scope": req.org_scope
        }
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Login and get tokens."""
    try:
        # Placeholder for prototype
        token = asyncio.get_event_loop().run_in_executor(
            None, 
            lambda: {"access_token": "mock_token_123", "refresh_token": "mock_refresh_123"}
        )
        
        user = {
            "id": 1,
            "email": req.email,
            "name": "Demo Officer",
            "role": "verifier",
            "org_scope": {"district": "Pune"}
        }
        
        return TokenResponse(
            access_token="mock_jwt_token",
            refresh_token="mock_refresh_token",
            token_type="bearer",
            expires_in=3600,
            user=user
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/logout")
async def logout():
    """Logout (invalidate token)."""
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user info."""
    # In prototype, return mock user
    return {
        "id": 1,
        "email": "verifier@landlens.local",
        "name": "Verification Officer",
        "role": "verifier",
        "org_scope": {"district": "Pune", "tehsil": "Haveli"}
    }
