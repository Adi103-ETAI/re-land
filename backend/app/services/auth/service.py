"""Authentication service for LANDLENS."""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.auth import User, Session, RefreshToken, UserRole
from app.models.audit import AuditEvent, ActionType, EntityType


class AuthService:
    """Handle registration, login, session management."""
    
    @staticmethod
    async def register(
        db: AsyncSession,
        email: str,
        password: str,
        name: str,
        role: UserRole = UserRole.OPERATOR,
        org_scope: Optional[dict] = None
    ) -> User:
        """Register a new officer."""
        # Check existing
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")
        
        # Hash password
        password_hash = AuthService._hash_password(password)
        
        # Create user
        user = User(
            email=email,
            name=name,
            password_hash=password_hash,
            role=role,
            org_scope=org_scope,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        return user
    
    @staticmethod
    async def login(
        db: AsyncSession,
        email: str,
        password: str
    ) -> dict:
        """Login and return tokens + user info."""
        # Find user
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise ValueError("Invalid credentials")
        
        # Verify password
        if not AuthService._verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        
        # Create session
        access_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        
        session = Session(
            user_id=user.id,
            token=access_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
        )
        
        refresh = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        db.add(session)
        db.add(refresh)
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        
        await db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "org_scope": user.org_scope
            }
        }
    
    @staticmethod
    async def validate_token(db: AsyncSession, token: str) -> Optional[User]:
        """Validate access token and return user."""
        stmt = select(Session).where(
            Session.token == token,
            Session.expires_at > datetime.now(timezone.utc)
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if not session:
            return None
        
        stmt = select(User).where(User.id == session.user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def logout(db: AsyncSession, token: str) -> bool:
        """Invalidate session."""
        stmt = select(Session).where(Session.token == token)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if session:
            await db.delete(session)
            await db.commit()
            return True
        return False
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """Simple hash for prototype (use bcrypt in production)."""
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}${hashed.hex()}"
    
    @staticmethod
    def _verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash."""
        try:
            salt, hashed = password_hash.split('$')
            computed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
            return computed.hex() == hashed
        except ValueError:
            return False


# Seed default users for prototype
async def seed_default_users(db: AsyncSession):
    """Create default officer accounts for testing."""
    default_users = [
        {
            "email": "operator@landlens.local",
            "password": "operator123",
            "name": "Digitization Operator",
            "role": UserRole.OPERATOR,
            "org_scope": {"district": "Pune", "tehsil": "Haveli"}
        },
        {
            "email": "verifier@landlens.local",
            "password": "verifier123",
            "name": "Verification Officer",
            "role": UserRole.VERIFIER,
            "org_scope": {"district": "Pune", "tehsil": "Haveli", "village": "Wagholi"}
        },
        {
            "email": "admin@landlens.local",
            "password": "admin123",
            "name": "System Admin",
            "role": UserRole.ADMIN,
            "org_scope": None
        },
    ]
    
    for user_data in default_users:
        existing = await db.execute(
            select(User).where(User.email == user_data["email"])
        )
        if not existing.scalar_one_or_none():
            await AuthService.register(db, **user_data)
