from __future__ import annotations

import pytest

from app.core.auth_security import hash_password, hash_secret, validate_token, verify_password
from app.core.email import (
    _build_login_url,
    clear_email_outbox,
    get_email_outbox,
    send_registration_confirmation_email,
)
from app.core.levels import LEVEL_THRESHOLDS, compute_level
from app.core.rate_limit import (
    InMemoryRateLimiter,
    RateLimitMiddleware,
    login_limiter,
    register_limiter,
)
from app.core.sample_data import (
    get_sample_profile_details,
    get_sample_profile_document,
    get_sample_space_docs_by_external_id,
    get_sample_space_documents,
    get_sample_spaces,
)

# --- auth_security ---

class TestAuthSecurity:
    def test_verify_password_correct(self) -> None:
        hashed = hash_password("correct-password")
        assert verify_password("correct-password", hashed) is True

    def test_verify_password_incorrect(self) -> None:
        hashed = hash_password("correct-password")
        assert verify_password("wrong-password", hashed) is False

    def test_verify_password_malformed_hash(self) -> None:
        assert verify_password("pwd", "not-a-valid-hash") is False

    def test_verify_password_empty_strings(self) -> None:
        assert verify_password("", "") is False

    def test_verify_password_wrong_format(self) -> None:
        assert verify_password("pwd", "only-one-dollar$sign") is False

    def test_verify_password_invalid_base64(self) -> None:
        assert verify_password("pwd", "10000$!!!invalid-base64!!!$!!!") is False

    def test_validate_token_correct(self) -> None:
        assert validate_token("my-token", hash_secret("my-token")) is True

    def test_validate_token_incorrect(self) -> None:
        assert validate_token("my-token", hash_secret("other-token")) is False

    def test_validate_token_mismatch(self) -> None:
        assert validate_token("", hash_secret("not-empty")) is False


# --- levels ---

class TestLevels:
    def test_levels_empty_thresholds(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("app.core.levels.LEVEL_THRESHOLDS", [])
        assert compute_level(100) is None

    def test_level_first_level(self) -> None:
        level = compute_level(0)
        assert level is not None
        assert level.slug == "novice"
        assert level.position == 1
        assert level.progress_percentage == 0

    def test_level_mid_level(self) -> None:
        level = compute_level(4200)
        assert level is not None
        assert level.slug == "luminary"
        assert level.position == 8
        assert level.xp_into_level == 200

    def test_level_max_level(self) -> None:
        level = compute_level(12000)
        assert level is not None
        assert level.slug == "mythic"
        assert level.is_max_level is True
        assert level.next_level is None

    def test_level_beyond_max(self) -> None:
        level = compute_level(99999)
        assert level is not None
        assert level.slug == "mythic"
        assert level.is_max_level is True

    def test_level_exact_threshold(self) -> None:
        level = compute_level(100)
        assert level is not None
        assert level.slug == "student"
        assert level.xp_into_level == 0

    def test_level_just_below_next(self) -> None:
        level = compute_level(599)
        assert level is not None
        assert level.slug == "scholar"
        assert level.progress_percentage == 99

    def test_level_negative_xp(self) -> None:
        level = compute_level(-5)
        assert level is not None
        assert level.slug == "novice"
        assert level.progress_percentage == 0

    def test_level_thresholds_ascending(self) -> None:
        for i in range(1, len(LEVEL_THRESHOLDS)):
            assert LEVEL_THRESHOLDS[i][0] > LEVEL_THRESHOLDS[i - 1][0]


# --- rate_limit ---

class TestRateLimiter:
    def test_allows_within_limit(self) -> None:
        limiter = InMemoryRateLimiter(max_requests=3, window_seconds=60)
        limiter.check("test-key")
        limiter.check("test-key")
        limiter.check("test-key")

    def test_blocks_over_limit(self) -> None:
        limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60)
        limiter.check("test-key")
        limiter.check("test-key")
        with pytest.raises(Exception, match="Too many requests"):
            limiter.check("test-key")

    def test_reset_clears_key(self) -> None:
        limiter = InMemoryRateLimiter(max_requests=1, window_seconds=60)
        limiter.check("test-key")
        with pytest.raises(Exception):
            limiter.check("test-key")
        limiter.reset("test-key")
        limiter.check("test-key")

    def test_different_keys_independent(self) -> None:
        limiter = InMemoryRateLimiter(max_requests=1, window_seconds=60)
        limiter.check("key-a")
        with pytest.raises(Exception):
            limiter.check("key-a")
        limiter.check("key-b")

    def test_login_limiter(self) -> None:
        assert login_limiter.max_requests == 20
        assert login_limiter.window_seconds == 60

    def test_register_limiter(self) -> None:
        assert register_limiter.max_requests == 5
        assert register_limiter.window_seconds == 60

    def test_prunes_expired_timestamps(self) -> None:
        limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60)
        import time
        old_time = time.monotonic() - 120
        key = "test-key"
        limiter._clients[key] = [old_time, old_time]
        limiter.check(key)
        assert len(limiter._clients[key]) == 1

    def test_rate_limit_middleware_routes_non_http(self) -> None:
        async def noop_app(scope, receive, send) -> None:
            pass

        middleware = RateLimitMiddleware(noop_app)

        async def run() -> None:
            await middleware({"type": "websocket"}, None, None)

        import anyio
        anyio.run(run)

    def test_rate_limit_middleware_passthrough_non_limited(self) -> None:
        async def ok_app(scope, receive, send) -> None:
            pass

        middleware = RateLimitMiddleware(ok_app)

        async def send(message):
            pass

        async def receive():
            return {"type": "http.request"}

        scope = {
            "type": "http",
            "method": "GET",
            "path": "/api/health/",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "query_string": b"",
        }

        async def run() -> None:
            await middleware(scope, receive, send)

        import anyio
        anyio.run(run)

    def test_rate_limit_middleware_blocks_over_limit(self) -> None:
        async def ok_app(scope, receive, send) -> None:
            pass

        middleware = RateLimitMiddleware(ok_app)

        async def send(message):
            pass

        async def receive():
            return {"type": "http.request"}

        scope = {
            "type": "http",
            "method": "POST",
            "path": "/api/auth/login",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "query_string": b"",
        }

        from app.core.rate_limit import login_limiter as ll
        ll.reset("127.0.0.1")
        # Fill the limiter
        for _ in range(20):
            ll.check("127.0.0.1")

        async def run() -> None:
            with pytest.raises(Exception, match="Too many requests"):
                await middleware(scope, receive, send)

        import anyio
        anyio.run(run)
        ll.reset("127.0.0.1")


# --- sample_data ---

class TestSampleData:
    def test_get_sample_spaces(self) -> None:
        response = get_sample_spaces()
        assert len(response.results) > 0
        assert response.results[0].id == "1"
        assert response.results[0].name == "Biblioteca Sormani"

    def test_get_sample_space_documents(self) -> None:
        docs = get_sample_space_documents()
        assert len(docs) > 0
        assert docs[0]["external_id"] == "1"
        assert docs[0]["name"] == "Biblioteca Sormani"

    def test_get_sample_space_docs_by_external_id(self) -> None:
        by_id = get_sample_space_docs_by_external_id()
        assert "1" in by_id
        assert by_id["1"]["name"] == "Biblioteca Sormani"

    def test_get_sample_profile_details(self) -> None:
        profile = get_sample_profile_details()
        assert profile.id == "cloistr"
        assert profile.username == "cloistr"
        assert profile.xp == 4200

    def test_get_sample_profile_document(self) -> None:
        doc = get_sample_profile_document("test-hash")
        assert doc["account_key"] == "cloistr"
        assert doc["password_hash"] == "test-hash"
        assert doc["xp"] == 4200


# --- email ---

class TestEmail:
    def setup_method(self) -> None:
        clear_email_outbox()

    def test_build_login_url(self) -> None:
        url = _build_login_url()
        assert url.endswith("/login")

    def test_send_registration_confirmation(self) -> None:
        result = send_registration_confirmation_email(
            recipient_email="test@example.com",
        )
        assert result.endswith("/login")
        outbox = get_email_outbox()
        assert len(outbox) == 1
        assert outbox[0].to_address == "test@example.com"
        assert "Welcome" in outbox[0].subject
        assert "test@example.com" in outbox[0].body

    def test_send_registration_confirmation_no_name(self) -> None:
        clear_email_outbox()
        result = send_registration_confirmation_email(recipient_email="user@example.com")
        assert result.endswith("/login")
        outbox = get_email_outbox()
        assert len(outbox) == 1
        assert "user@example.com" in outbox[0].body
