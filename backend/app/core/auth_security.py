from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.core.config import get_settings

PASSWORD_HASH_ITERATIONS = 210_000
SESSION_COOKIE_NAME = "cloistr_session"
CSRF_COOKIE_NAME = "cloistr_csrf"
SESSION_TTL = timedelta(days=30)
PASSWORD_RESET_TTL = timedelta(hours=24)
DEFAULT_DEMO_PASSWORD = "cloistr"


@dataclass(slots=True)
class AuthTokens:
    session_token: str
    csrf_token: str


def is_secure_env() -> bool:
    return get_settings().env != "development"


def utc_now() -> datetime:
    return datetime.now(tz=UTC)


def generate_token(byte_count: int = 32) -> str:
    return secrets.token_urlsafe(byte_count)


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        PASSWORD_HASH_ITERATIONS,
    )
    salt_text = base64.urlsafe_b64encode(salt_bytes).decode("ascii")
    key_text = base64.urlsafe_b64encode(derived_key).decode("ascii")
    return f"{PASSWORD_HASH_ITERATIONS}${salt_text}${key_text}"


def verify_password(password: str, encoded_password: str) -> bool:
    try:
        iterations_text, salt_text, key_text = encoded_password.split("$", maxsplit=2)
        iterations = int(iterations_text)
        salt_bytes = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected_key = base64.urlsafe_b64decode(key_text.encode("ascii"))
    except (ValueError, TypeError, base64.binascii.Error):
        return False

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        iterations,
    )
    return hmac.compare_digest(derived_key, expected_key)


def validate_token(candidate: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_secret(candidate), expected_hash)
