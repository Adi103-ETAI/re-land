"""Auth service — officer registration, login, sessions (unified User model)."""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrganizationUnit, User, UserRole
from app.models.auth import RefreshToken, Session

PBKDF2_ITERATIONS = 100_000


class AuthService:
    """Authentication and session management for LANDLENS officers."""

    @staticmethod
    def _hash_password(password: str) -> str:
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS
        ).hex()
        return f"{salt}${hashed}"

    @staticmethod
    def _verify_password(password: str, password_hash: str) -> bool:
        try:
            salt, hashed = password_hash.split("$")
        except ValueError:
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS
        ).hex()
        return secrets.compare_digest(candidate, hashed)

    @staticmethod
    def _username_from_email(email: str) -> str:
        return email.split("@")[0].strip().lower() or f"user_{uuid.uuid4().hex[:6]}"

    async def register(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        name: str,
        role: UserRole = UserRole.DIGITIZATION_OFFICER,
        org_unit_id: Optional[int] = None,
    ) -> User:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing is not None:
            raise ValueError(f"user with email {email} already exists")

        unit_id = org_unit_id
        if unit_id is None:
            from app.models import OrgLevel

            unit = OrganizationUnit(name="Pune District", level=OrgLevel.DISTRICT)
            db.add(unit)
            await db.flush()
            unit_id = unit.id

        user = User(
            username=self._username_from_email(email) or name,
            email=email,
            hashed_password=self._hash_password(password),
            role=role,
            org_unit_id=unit_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    async def login(self, db: AsyncSession, email: str, password: str) -> Optional[dict]:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None or not self._verify_password(password, user.hashed_password):
            return None

        token = secrets.token_urlsafe(48)
        session = Session(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(session)
        refresh = RefreshToken(
            user_id=user.id,
            token=secrets.token_urlsafe(48),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(refresh)
        await db.commit()

        return {
            "access_token": token,
            "refresh_token": refresh.token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.username,
                "role": user.role.value,
            },
        }

    @staticmethod
    async def validate_token(db: AsyncSession, token: str) -> Optional[User]:
        session = (await db.execute(
            select(Session).where(Session.token == token)
        )).scalar_one_or_none()
        if session is None:
            return None
        expires = session.expires_at
        # SQLite yields naive UTC datetimes — normalize before comparing.
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            return None
        return (await db.execute(select(User).where(User.id == session.user_id))).scalar_one_or_none()

    @staticmethod
    async def logout(db: AsyncSession, token: str) -> bool:
        session = (await db.execute(select(Session).where(Session.token == token))).scalar_one_or_none()
        if session is None:
            return False
        await db.delete(session)
        await db.commit()
        return True


async def seed_default_users(db: AsyncSession) -> None:
    """Idempotently create the demo officer accounts."""
    from app.core.config import DATA_DIR  # noqa: F401 — ensures dirs exist

    demo = [
        ("operator", "operator@landlens.local", "operator123", UserRole.DIGITIZATION_OFFICER),
        ("verifier", "verifier@landlens.local", "verifier123", UserRole.VERIFICATION_OFFICER),
        ("admin", "admin@landlens.local", "admin123", UserRole.ADMINISTRATOR),
    ]
    unit = (await db.execute(
        select(OrganizationUnit).where(OrganizationUnit.name == "Pune District")
    )).scalar_one_or_none()
    if unit is None:
        from app.models import OrgLevel

        unit = OrganizationUnit(name="Pune District", level=OrgLevel.DISTRICT)
        db.add(unit)
        await db.flush()

    svc = AuthService()
    for username, email, password, role in demo:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing is not None:
            continue
        db.add(User(
            username=username,
            email=email,
            hashed_password=svc._hash_password(password),
            role=role,
            org_unit_id=unit.id,
        ))
    await db.commit()
