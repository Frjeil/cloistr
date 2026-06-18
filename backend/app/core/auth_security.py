from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import get_settings

password_hash = PasswordHash(
    (
        Argon2Hasher(),
        BcryptHasher(),
    )
)
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


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded_password: str) -> bool:
    try:
        result, _updated = password_hash.verify_and_update(password, encoded_password)
        return result
    except UnknownHashError:
        return False


def validate_token(candidate: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_secret(candidate), expected_hash)
