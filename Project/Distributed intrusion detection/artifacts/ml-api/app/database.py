"""
Async SQLAlchemy engine + session factory.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# SQLite (used in tests) doesn't support pool_size/max_overflow
_is_sqlite = settings.database_url.startswith("sqlite")
_engine_kwargs: dict = dict(pool_pre_ping=True, echo=False)
if not _is_sqlite:
    _engine_kwargs.update(pool_size=10, max_overflow=20)

engine = create_async_engine(settings.database_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def create_tables() -> None:
    """Create all tables if they don't exist (used in dev/test)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
