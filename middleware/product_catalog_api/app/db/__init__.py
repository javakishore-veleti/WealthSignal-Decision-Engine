"""SQLAlchemy wiring for the Product Catalog service."""

from .models import Base, Product, metadata
from .session import get_engine, get_session, session_factory

__all__ = [
    "Base",
    "Product",
    "metadata",
    "get_engine",
    "get_session",
    "session_factory",
]
