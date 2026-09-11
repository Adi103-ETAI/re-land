"""SQLAlchemy base with PostGIS support."""
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, String, Integer, Float, JSON
from datetime import datetime, timezone

class Base(DeclarativeBase):
    pass

class BaseRecord(Base):
    """Base class with common fields for all entities."""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
