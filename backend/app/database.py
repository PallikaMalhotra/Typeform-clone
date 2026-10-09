"""SQLAlchemy engine, session factory and the declarative base."""

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str, **engine_kwargs) -> Engine:
    is_sqlite = url.startswith("sqlite")
    engine = create_engine(
        url,
        # FastAPI runs sync endpoints in a thread pool, so the SQLite
        # connection must be usable from threads other than its creator.
        connect_args={"check_same_thread": False} if is_sqlite else {},
        **engine_kwargs,
    )
    if is_sqlite:

        @event.listens_for(engine, "connect")
        def _sqlite_pragmas(dbapi_connection, _record):  # pragma: no cover - trivial
            cursor = dbapi_connection.cursor()
            # SQLite ignores foreign keys (and therefore ON DELETE CASCADE) unless asked.
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


engine = make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
