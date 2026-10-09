import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, make_engine
from app.main import app
from app.models import User


@pytest.fixture()
def client(monkeypatch):
    # One shared in-memory database per test.
    engine = make_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with session_factory() as db:
        db.add(User(name="Tester", email="tester@example.com"))
        db.commit()

    def override_get_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    # Skip the startup seeding against the real database file.
    monkeypatch.setattr("app.main.settings", type("S", (), {"seed_on_startup": False})())
    monkeypatch.setattr("app.main.engine", engine)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
