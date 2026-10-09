"""Runtime configuration, read from environment variables.

Everything has a sensible default so the app runs locally with zero setup.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'typeform.db'}")
    )
    # Comma-separated list of allowed origins, or "*" for any origin.
    # The API uses no cookies, so allowing any origin is safe here.
    cors_origins: list[str] = field(default_factory=lambda: _split_csv(os.getenv("CORS_ORIGINS", "*")))
    # Seed demo data on startup when the database is empty.
    seed_on_startup: bool = field(default_factory=lambda: os.getenv("SEED_ON_STARTUP", "true").lower() == "true")


settings = Settings()
