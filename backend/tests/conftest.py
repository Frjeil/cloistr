from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.email import clear_email_outbox
from app.main import app
from app.repositories.account import reset_memory_state


@pytest.fixture(scope="session", autouse=True)
def _trigger_lifespan() -> None:
    """Start/stop the FastAPI lifespan so main.py coverage is complete."""
    with TestClient(app):
        pass


@pytest.fixture(scope="function", autouse=True)
def _reset_api_state() -> None:
    """Reset in-memory backend state before each API test."""
    reset_memory_state()
    clear_email_outbox()
