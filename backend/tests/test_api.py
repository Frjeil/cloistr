from __future__ import annotations

import io

from fastapi.testclient import TestClient

from app.core.auth_security import CSRF_COOKIE_NAME, DEFAULT_DEMO_PASSWORD
from app.core.email import get_email_outbox
from app.core.levels import compute_level
from app.main import app

client = TestClient(app)


def _login() -> str | None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    client.post(
        "/api/auth/login/",
        json={"login": "cloistr", "password": DEFAULT_DEMO_PASSWORD},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    return csrf_token


# --- Health ---


def test_healthcheck() -> None:
    response = client.get("/api/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# --- CSRF ---


def test_csrf_route_sets_cookie() -> None:
    response = client.get("/api/auth/csrf/")
    assert response.status_code == 200
    assert response.cookies.get(CSRF_COOKIE_NAME)


# --- Spaces ---


def test_spaces_search_returns_seed_data() -> None:
    response = client.get("/api/spaces/search/")
    assert response.status_code == 200
    body = response.json()
    assert "results" in body
    assert len(body["results"]) >= 3


def test_spaces_search_filters_by_kind() -> None:
    response = client.get("/api/spaces/search/", params={"kind": "library"})
    assert response.status_code == 200
    body = response.json()
    assert body["results"]
    assert all(space["kind"] == "library" for space in body["results"])


def test_spaces_search_filters_by_wifi() -> None:
    response = client.get("/api/spaces/search/", params={"wifi": "1"})
    assert response.status_code == 200
    body = response.json()
    assert body["results"]
    assert all(space["wifi"] for space in body["results"])


def test_spaces_search_empty_for_nonexistent_query() -> None:
    response = client.get("/api/spaces/search/", params={"q": "xyznonexistent"})
    assert response.status_code == 200
    body = response.json()
    assert body["results"] == []


# --- Leaderboard ---


def test_leaderboard_returns_expected_shape() -> None:
    response = client.get("/api/leaderboard/")
    assert response.status_code == 200
    body = response.json()
    assert body["results"]["xp"]
    assert body["results"]["xp"][0]["username"] == "cloistr"
    assert body["results"]["checkins"][0]["username"] == "cloistr"
    assert body["results"]["checkins"][0]["total_checkins"] == 12
    assert body["results"]["streak"][0]["username"] == "cloistr"
    assert body["results"]["streak"][0]["activity_streak_days"] == 4


# --- Auth ---


def test_login_succeeds() -> None:
    _login()
    response = client.get("/api/auth/me/")
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "cloistr"


def test_login_fails_with_wrong_password() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/login/",
        json={"login": "cloistr", "password": "wrong-password"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_fails_with_wrong_username() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/login/",
        json={"login": "nonexistent", "password": DEFAULT_DEMO_PASSWORD},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 401


def test_login_requires_csrf() -> None:
    response = client.post(
        "/api/auth/login/",
        json={"login": "cloistr", "password": DEFAULT_DEMO_PASSWORD},
    )
    assert response.status_code == 403


def test_unauthenticated_access_returns_401() -> None:
    response = client.get("/api/auth/me/")
    assert response.status_code == 401

    response = client.get("/api/profile/me/")
    assert response.status_code == 401

    response = client.get("/api/checkins/history/")
    assert response.status_code == 401


def test_register_creates_new_profile() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/register/",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password1": "Secret123!",
            "password2": "Secret123!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "newuser"


def test_register_rejects_duplicate_username() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/register/",
        json={
            "username": "cloistr",
            "email": "another@example.com",
            "password1": "Secret123!",
            "password2": "Secret123!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 400


def test_register_rejects_password_mismatch() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/register/",
        json={
            "username": "another",
            "email": "another@example.com",
            "password1": "Secret123!",
            "password2": "Different456!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Passwords do not match"


def test_logout_clears_session() -> None:
    _login()
    response = client.get("/api/auth/me/")
    assert response.status_code == 200

    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/logout/",
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200

    response = client.get("/api/auth/me/")
    assert response.status_code == 401


# --- Password Reset ---


def test_password_reset_request_queues_email() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/reset/request/",
        json={"email": "hello@cloistr.local"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    assert response.json() == {"detail": "Password reset requested"}
    outbox = get_email_outbox()
    assert len(outbox) == 1
    assert outbox[0].to_address == "hello@cloistr.local"
    assert "password-reset-confirm/cloistr/" in outbox[0].body


def test_password_reset_request_silent_for_unknown_email() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/reset/request/",
        json={"email": "unknown@example.com"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    assert response.json() == {"detail": "Password reset requested"}
    assert len(get_email_outbox()) == 0


def test_password_reset_confirm_changes_password() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/reset/request/",
        json={"email": "hello@cloistr.local"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    outbox = get_email_outbox()
    assert len(outbox) == 1
    body = outbox[0].body
    token = body.split("password-reset-confirm/cloistr/")[1].split("\n")[0].strip()

    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/reset/confirm/",
        json={
            "uid": "cloistr",
            "token": token,
            "new_password1": "NewPassword123!",
            "new_password2": "NewPassword123!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200

    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/login/",
        json={"login": "cloistr", "password": "NewPassword123!"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200


def test_password_reset_confirm_rejects_mismatch() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    client.post(
        "/api/auth/password/reset/request/",
        json={"email": "hello@cloistr.local"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    outbox = get_email_outbox()
    token = outbox[0].body.split("password-reset-confirm/cloistr/")[1].split("\n")[0].strip()

    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/reset/confirm/",
        json={
            "uid": "cloistr",
            "token": token,
            "new_password1": "NewPassword123!",
            "new_password2": "Different456!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 400


# --- Profile ---


def test_profile_get_details() -> None:
    _login()
    response = client.get("/api/profile/me/")
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "cloistr"
    assert body["xp"] == 4200
    assert body["level"]["slug"] == "luminary"
    assert body["level"]["position"] == 8
    assert body["level"]["xp_into_level"] == 200


def test_profile_update() -> None:
    _login()
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.patch(
        "/api/profile/me/",
        json={
            "discord_handle": "@updated",
            "share_presence": False,
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["discord_handle"] == "@updated"
    assert body["share_presence"] is False


def test_profile_update_preserves_unchanged_fields() -> None:
    _login()
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.patch(
        "/api/profile/me/",
        json={
            "discord_handle": "",
            "share_presence": True,
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200


def test_profile_avatar_upload_and_delete() -> None:
    _login()
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02"
        b"\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT"
        b"\x08\xd7c\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    png_data = io.BytesIO(png_bytes)
    response = client.post(
        "/api/profile/avatar/",
        files={"avatar": ("test.png", png_data, "image/png")},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["avatar_url"] is not None
    assert body["avatar_url"].startswith("data:image/png;base64,")

    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.delete(
        "/api/profile/avatar/",
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    response = client.get("/api/profile/me/")
    assert response.json()["avatar_url"] is None


# --- Password Change ---


def test_password_change() -> None:
    _login()
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/change/",
        json={
            "old_password": DEFAULT_DEMO_PASSWORD,
            "new_password1": "NewPassword123!",
            "new_password2": "NewPassword123!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200

    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/login/",
        json={"login": "cloistr", "password": "NewPassword123!"},
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200


def test_password_change_rejects_wrong_old_password() -> None:
    _login()
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/auth/password/change/",
        json={
            "old_password": "wrong-password",
            "new_password1": "NewPassword123!",
            "new_password2": "NewPassword123!",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 400


# --- Check-in flow ---


def test_checkin_routes_start_and_clear_session_state() -> None:
    _login()
    response = client.post("/api/checkins/start/", json={"space_id": "1", "uses_power": False})
    assert response.status_code == 200
    assert response.json()["space_id"] == "1"

    session_response = client.get("/api/auth/me/")
    assert session_response.status_code == 200
    assert session_response.json()["active_checkin"]["space_id"] == "1"

    end_response = client.post("/api/checkins/end/", json={"checkin_id": "checkin-1"})
    assert end_response.status_code == 200

    session_after_end = client.get("/api/auth/me/")
    assert session_after_end.status_code == 200
    assert session_after_end.json()["active_checkin"] is None

    leaderboard_response = client.get("/api/leaderboard/")
    assert leaderboard_response.status_code == 200
    leaderboard_body = leaderboard_response.json()
    assert leaderboard_body["results"]["checkins"][0]["total_checkins"] == 13
    assert leaderboard_body["results"]["streak"][0]["activity_streak_days"] == 5

    history_response = client.get("/api/checkins/history/")
    assert history_response.status_code == 200
    history_body = history_response.json()
    assert history_body["results"]
    assert history_body["results"][0]["space_id"] == "1"
    assert history_body["results"][0]["duration_minutes"] >= 1
    assert history_body["results"][0]["uses_power"] is False


def test_checkin_gives_xp() -> None:
    _login()
    client.post("/api/checkins/start/", json={"space_id": "1", "uses_power": False})
    client.post("/api/checkins/end/", json={"checkin_id": "checkin-1"})

    profile = client.get("/api/profile/me/").json()
    assert profile["xp"] > 4200


def test_checkin_start_fails_for_missing_space() -> None:
    _login()
    response = client.post("/api/checkins/start/", json={"space_id": "999", "uses_power": False})
    assert response.status_code == 404


def test_checkin_end_fails_without_active_checkin() -> None:
    _login()
    response = client.post("/api/checkins/end/", json={"checkin_id": "nonexistent"})
    assert response.status_code == 404


# --- Levels ---


def test_level_first_level() -> None:
    level = compute_level(0)
    assert level is not None
    assert level.slug == "novice"
    assert level.position == 1
    assert level.is_max_level is False
    assert level.progress_percentage == 0
    assert level.next_level is not None
    assert level.next_level.slug == "student"


def test_level_mid_level() -> None:
    level = compute_level(4200)
    assert level is not None
    assert level.slug == "luminary"
    assert level.position == 8
    assert level.is_max_level is False
    assert level.xp_into_level == 200
    assert level.xp_required_for_next_level == 2000
    assert level.xp_to_next_level == 1800
    assert level.progress_percentage == 10


def test_level_max_level() -> None:
    level = compute_level(12000)
    assert level is not None
    assert level.slug == "mythic"
    assert level.position == 11
    assert level.is_max_level is True
    assert level.next_level is None
    assert level.progress_percentage == 100


def test_level_beyond_max() -> None:
    level = compute_level(20000)
    assert level is not None
    assert level.slug == "mythic"
    assert level.is_max_level is True
    assert level.xp_into_level == 8000


def test_level_exact_threshold() -> None:
    level = compute_level(100)
    assert level is not None
    assert level.slug == "student"
    assert level.xp_into_level == 0
    assert level.progress_percentage == 0
    assert level.xp_to_next_level == 200


def test_level_just_below_next() -> None:
    level = compute_level(599)
    assert level is not None
    assert level.slug == "scholar"
    assert level.xp_into_level == 299
    assert level.progress_percentage == 99


def test_level_negative_xp() -> None:
    level = compute_level(-5)
    assert level is not None
    assert level.slug == "novice"
    assert level.position == 1
    assert level.xp_into_level == -5
    assert level.progress_percentage == 0


# --- Contact ---


def test_contact_form_sends_email() -> None:
    client.get("/api/auth/csrf/")
    csrf_token = client.cookies.get(CSRF_COOKIE_NAME)
    response = client.post(
        "/api/contacts/",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "message": "Hello, I have a question.",
        },
        headers={"X-CSRFToken": csrf_token or ""},
    )
    assert response.status_code == 200
    assert response.json() == {"detail": "Message sent"}
    outbox = get_email_outbox()
    assert len(outbox) == 1
    assert outbox[0].subject == "Contact form: Test User"
    assert "test@example.com" in outbox[0].body
    assert "Hello, I have a question." in outbox[0].body


def test_contact_form_works_without_auth() -> None:
    response = client.post(
        "/api/contacts/",
        json={"name": "Test", "email": "test@test.com", "message": "Hello"},
    )
    assert response.status_code == 200
    assert response.json() == {"detail": "Message sent"}
