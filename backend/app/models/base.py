"""SQLAlchemy base with common record fields.

``BaseRecord`` is a plain mixin (NOT a declarative class). Model classes use
``class X(Base, BaseRecord)`` — a valid MRO because the hierarchies are
disjoint. Inheriting ``BaseRecord`` from ``Base`` made every model class
raise ``TypeError: Cannot create a consistent method resolution order``.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, DateTime, String, Integer, Boolean, Enum, Float, JSON
from datetime import datetime, timezone
import enum

class Base(DeclarativeBase):
    pass

class BaseRecord:
    """Mixin with common fields for all entities."""
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}