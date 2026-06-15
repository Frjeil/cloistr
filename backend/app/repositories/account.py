from __future__ import annotations

from base64 import b64encode
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace

from fastapi import HTTPException, Request, UploadFile

from app.core import database as mongodb_database
from app.core.auth_security import (
    CSRF_COOKIE_NAME,
    DEFAULT_DEMO_PASSWORD,
    PASSWORD_RESET_TTL,
    SESSION_COOKIE_NAME,
    SESSION_TTL,
    AuthTokens,
    generate_token,
    hash_password,
    hash_secret,
    is_secure_env,
    utc_now,
    verify_password,
)
from app.core.badges import compute_badges
from app.core.checkin_constants import (
    MAX_CHECKIN_DURATION_MINUTES,
    XP_PER_CHECKIN_BASE,
    XP_PER_MINUTE,
)
from app.core.email import send_password_reset_email
from app.core.profile_helpers import document_to_profile_details
from app.core.rate_limit import reset_all_limiters
from app.core.sample_data import get_sample_profile_details
from app.models import (
    CheckinDocument,
    CheckinHistoryDocument,
    PasswordResetDocument,
    ProfileDocument,
    SessionDocument,
)
from app.repositories.spaces import get_sample_space_by_external_id, get_space_by_external_id
from app.schemas.auth import (
    LoginPayload,
    PasswordChangePayload,
    PasswordResetConfirmPayload,
    PasswordResetPayload,
    RegisterPayload,
)
from app.schemas.checkin import (
    ActiveCheckinUser,
    CheckinHistoryEntry,
    EndCheckinPayload,
    StartCheckinPayload,
)
from app.schemas.profile import (
    BadgeInfo,
    BadgeListResponse,
    FavoriteSpace,
    FavoriteSpaceRef,
    PersonalStatsResponse,
    ProfileDetails,
    ProfileUpdatePayload,
)
from app.schemas.session import ActiveCheckin, SessionUser


@dataclass(slots=True)
class AuthGrant:
    user: SessionUser
    tokens: AuthTokens


@dataclass(slots=True)
class PasswordResetGrant:
    account_key: str
    token: str


_MEMORY_PROFILE = get_sample_profile_details()
_MEMORY_PASSWORD_HASH = hash_password(DEFAULT_DEMO_PASSWORD)
_MEMORY_ACTIVE_CHECKIN: ActiveCheckin | None = None
_MEMORY_CHECKIN_HISTORY: list[CheckinHistoryEntry] = []
_MEMORY_SESSIONS: dict[str, dict[str, object]] = {}
_MEMORY_PASSWORD_RESETS: dict[str, dict[str, object]] = {}


def _build_session_user(
    profile: ProfileDetails, active_checkin: ActiveCheckin | None
) -> SessionUser:
    return SessionUser(
        id=profile.id,
        username=profile.username,
        email=profile.email,
        profile=profile,
        active_checkin=active_checkin,
    )


def _memory_profile_document() -> SimpleNamespace:
    return SimpleNamespace(
        account_key=_MEMORY_PROFILE.id,
        username=_MEMORY_PROFILE.username,
        email=_MEMORY_PROFILE.email,
        password_hash=_MEMORY_PASSWORD_HASH,
        email_verified=True,
        xp=_MEMORY_PROFILE.xp,
        total_checkins=_MEMORY_PROFILE.total_checkins,
        activity_streak_days=_MEMORY_PROFILE.activity_streak_days,
        last_checkin_date=_MEMORY_PROFILE.last_checkin_date,
        avatar_url=_MEMORY_PROFILE.avatar_url,
        share_presence=_MEMORY_PROFILE.share_presence,
        discord_handle=_MEMORY_PROFILE.discord_handle,
        earned_badges=_MEMORY_PROFILE.earned_badges,
        total_hours_studied=0.0,
        longest_session=0,
        favorite_space_id=None,
        favorite_space_name=None,
        most_active_day=0,
        avg_checkin_duration=0,
        favorite_time_slot="morning",
        total_spaces_visited=0,
        power_checkins=0,
        has_early_bird=False,
        has_night_owl=False,
        has_social_checkins=False,
    )


def _advance_checkin_stats(
    total_checkins: int,
    activity_streak_days: int,
    last_checkin_date: date | None,
    current_date: date,
) -> tuple[int, int, date]:
    if last_checkin_date == current_date:
        return total_checkins, activity_streak_days, current_date

    if last_checkin_date == current_date - timedelta(days=1):
        return total_checkins + 1, activity_streak_days + 1, current_date

    return total_checkins + 1, 1, current_date


def _memory_active_checkin_value() -> ActiveCheckin | None:
    return _MEMORY_ACTIVE_CHECKIN.model_copy(deep=True) if _MEMORY_ACTIVE_CHECKIN else None


def _memory_history_value(limit: int) -> list[CheckinHistoryEntry]:
    return [entry.model_copy(deep=True) for entry in _MEMORY_CHECKIN_HISTORY[:limit]]


def _ensure_utc_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def get_memory_profile_details() -> ProfileDetails:
    doc = _memory_profile_document()
    return document_to_profile_details(doc)


async def get_profile_badges(request: Request) -> BadgeListResponse:
    from app.core.badges import BADGE_DEFINITIONS

    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        return BadgeListResponse(
            earned=[],
            all=[
                BadgeInfo(slug=b.slug, name=b.name, description=b.description, icon=b.icon)
                for b in BADGE_DEFINITIONS.values()
            ],
        )

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    return BadgeListResponse(
        earned=document.earned_badges,
        all=[
            BadgeInfo(slug=b.slug, name=b.name, description=b.description, icon=b.icon)
            for b in BADGE_DEFINITIONS.values()
        ],
    )


async def get_profile_stats(request: Request) -> PersonalStatsResponse:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        return PersonalStatsResponse()

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    history_docs = await CheckinHistoryDocument.find(
        CheckinHistoryDocument.account_key == account_key
    ).to_list()

    computed = _compute_stats_from_history(history_docs)

    total_hours = round(sum(d.duration_minutes or 0 for d in history_docs) / 60, 1)
    longest = max((d.duration_minutes or 0 for d in history_docs), default=0)

    return PersonalStatsResponse(
        total_hours_studied=total_hours,
        longest_session=longest,
        favorite_space=FavoriteSpaceRef(
            id=computed["favorite_space_id"],
            name=computed["favorite_space_name"],
        )
        if computed["favorite_space_id"]
        else None,
        most_active_day=computed["most_active_day"],
        avg_checkin_duration=computed["avg_checkin_duration"],
        favorite_time_slot=computed["favorite_time_slot"],
        total_spaces_visited=computed["total_spaces_visited"],
    )


async def get_favorites(request: Request) -> list[FavoriteSpace]:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        return []

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    results: list[FavoriteSpace] = []
    for space_id in document.favorite_spaces:
        space = await get_space_by_external_id(space_id)
        if space:
            results.append(
                FavoriteSpace(
                    id=space.id,
                    name=space.name,
                    address=space.address,
                    kind=space.kind,
                    latitude=space.latitude,
                    longitude=space.longitude,
                )
            )
    return results


async def add_favorite(request: Request, space_id: str) -> None:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        return

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    if space_id not in document.favorite_spaces:
        document.favorite_spaces.append(space_id)
        await document.save()


async def remove_favorite(request: Request, space_id: str) -> None:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        return

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    if space_id in document.favorite_spaces:
        document.favorite_spaces.remove(space_id)
        await document.save()


async def get_checkin_history(request: Request, limit: int = 5) -> list[CheckinHistoryEntry]:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        _ = account_key
        return _memory_history_value(limit)

    documents = (
        await CheckinHistoryDocument.find(CheckinHistoryDocument.account_key == account_key)
        .sort(-CheckinHistoryDocument.ended_at)
        .limit(max(1, limit))
        .to_list()
    )

    return [
        CheckinHistoryEntry(
            id=str(document.id),
            space_id=document.space_external_id,
            space_name=document.space_name,
            space_address=document.space_address,
            uses_power=document.uses_power,
            started_at=document.started_at.isoformat(),
            ended_at=document.ended_at.isoformat(),
            duration_minutes=document.duration_minutes,
        )
        for document in documents
    ]


async def get_active_checkins_by_space(space_id: str) -> list[ActiveCheckinUser]:
    if mongodb_database.mongodb_database is None:
        if _MEMORY_ACTIVE_CHECKIN is not None and _MEMORY_ACTIVE_CHECKIN.space_id == space_id:
            profile = get_memory_profile_details()
            return [
                ActiveCheckinUser(
                    id=profile.id,
                    username=profile.username,
                    avatar_url=profile.avatar_url if profile.share_presence else None,
                    discord_handle=profile.discord_handle,
                    level_slug=profile.level.slug if profile.level else None,
                    level_name=profile.level.name if profile.level else None,
                )
            ]
        return []

    documents = await CheckinDocument.find(CheckinDocument.space_external_id == space_id).to_list()

    results: list[ActiveCheckinUser] = []
    for doc in documents:
        profile = await ProfileDocument.find_one(ProfileDocument.account_key == doc.account_key)
        if profile is None:
            continue
        details = document_to_profile_details(profile)
        results.append(
            ActiveCheckinUser(
                id=profile.account_key,
                username=profile.username,
                avatar_url=profile.avatar_url if profile.share_presence else None,
                discord_handle=profile.discord_handle,
                level_slug=details.level.slug if details.level else None,
                level_name=details.level.name if details.level else None,
            )
        )
    return results


def reset_memory_state() -> None:
    global _MEMORY_PROFILE, _MEMORY_PASSWORD_HASH, _MEMORY_ACTIVE_CHECKIN
    global _MEMORY_CHECKIN_HISTORY, _MEMORY_SESSIONS, _MEMORY_PASSWORD_RESETS

    _MEMORY_PROFILE = get_sample_profile_details()
    _MEMORY_PASSWORD_HASH = hash_password(DEFAULT_DEMO_PASSWORD)
    _MEMORY_ACTIVE_CHECKIN = None
    _MEMORY_CHECKIN_HISTORY = []
    _MEMORY_SESSIONS = {}
    _MEMORY_PASSWORD_RESETS = {}
    reset_all_limiters()


def _checkin_history_entry_from_active_checkin(
    checkin: ActiveCheckin,
    *,
    ended_at: datetime,
    duration_minutes: int,
) -> CheckinHistoryEntry:
    return CheckinHistoryEntry(
        id=checkin.id,
        space_id=checkin.space_id,
        space_name=checkin.space_name,
        space_address=checkin.space_address,
        uses_power=checkin.uses_power,
        started_at=checkin.started_at or ended_at.isoformat(),
        ended_at=ended_at.isoformat(),
        duration_minutes=duration_minutes,
    )


def _require_csrf(request: Request) -> None:
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRFToken") or request.headers.get("X-CSRF-Token")
    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=403, detail="Invalid CSRF token")


def _set_session_cookies(response: object, tokens: AuthTokens) -> None:
    max_age = int(SESSION_TTL.total_seconds())
    secure = is_secure_env()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=tokens.session_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
        max_age=max_age,
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=tokens.csrf_token,
        httponly=False,
        secure=secure,
        samesite="lax",
        path="/",
        max_age=max_age,
    )


def clear_session_cookies(response: object) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


async def _profile_document_by_login(login: str) -> ProfileDocument | None:
    if mongodb_database.mongodb_database is None:
        if login in {_MEMORY_PROFILE.id, _MEMORY_PROFILE.username, _MEMORY_PROFILE.email or ""}:
            return _memory_profile_document()
        return None

    document = await ProfileDocument.find_one(ProfileDocument.account_key == login)
    if document is not None:
        return document

    document = await ProfileDocument.find_one(ProfileDocument.username == login)
    if document is not None:
        return document

    return await ProfileDocument.find_one(ProfileDocument.email == login)


async def _profile_document_by_account_key(account_key: str) -> ProfileDocument | None:
    if mongodb_database.mongodb_database is None:
        return _memory_profile_document() if _MEMORY_PROFILE.id == account_key else None

    return await ProfileDocument.find_one(ProfileDocument.account_key == account_key)


async def _active_checkin_by_account_key(account_key: str) -> ActiveCheckin | None:
    if mongodb_database.mongodb_database is None:
        return _memory_active_checkin_value() if _MEMORY_PROFILE.id == account_key else None

    document = await CheckinDocument.find_one(CheckinDocument.account_key == account_key)
    if document is None:
        return None

    return ActiveCheckin(
        id=str(document.id),
        space_id=document.space_external_id,
        space_name=document.space_name,
        space_latitude=document.space_latitude,
        space_longitude=document.space_longitude,
        space_address=document.space_address,
        started_at=document.started_at.isoformat(),
    )


async def _session_account_key(request: Request) -> str:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token_hash = hash_secret(session_token)
    now = utc_now()

    if mongodb_database.mongodb_database is None:
        record = _MEMORY_SESSIONS.get(token_hash)
        if record is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        expires_at = record.get("expires_at")
        if not isinstance(expires_at, datetime) or expires_at <= now:
            _MEMORY_SESSIONS.pop(token_hash, None)
            raise HTTPException(status_code=401, detail="Session expired")

        record["last_seen_at"] = now
        return str(record["account_key"])

    session_document = await SessionDocument.find_one(
        SessionDocument.session_token_hash == token_hash
    )
    if session_document is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if _ensure_utc_datetime(session_document.expires_at) <= now:
        await session_document.delete()
        raise HTTPException(status_code=401, detail="Session expired")

    session_document.last_seen_at = now
    await session_document.save()
    return session_document.account_key


async def _issue_session(account_key: str) -> AuthTokens:
    session_token = generate_token()
    csrf_token = generate_token()
    now = utc_now()
    expires_at = now + SESSION_TTL

    if mongodb_database.mongodb_database is None:
        _MEMORY_SESSIONS[hash_secret(session_token)] = {
            "account_key": account_key,
            "expires_at": expires_at,
            "last_seen_at": now,
        }
        return AuthTokens(session_token=session_token, csrf_token=csrf_token)

    session_document = SessionDocument(
        account_key=account_key,
        session_token_hash=hash_secret(session_token),
        csrf_token_hash="",
        created_at=now,
        last_seen_at=now,
        expires_at=expires_at,
    )
    await session_document.insert()
    return AuthTokens(session_token=session_token, csrf_token=csrf_token)


async def _delete_all_sessions(account_key: str) -> None:
    if mongodb_database.mongodb_database is None:
        keys_to_delete = [
            token_hash
            for token_hash, record in _MEMORY_SESSIONS.items()
            if record.get("account_key") == account_key
        ]
        for token_hash in keys_to_delete:
            _MEMORY_SESSIONS.pop(token_hash, None)
        return None

    await SessionDocument.find(SessionDocument.account_key == account_key).delete()
    return None


async def get_profile_details(request: Request) -> ProfileDetails:
    account_key = await _session_account_key(request)
    if mongodb_database.mongodb_database is None:
        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return document_to_profile_details(_memory_profile_document())

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return document_to_profile_details(document)


async def get_active_checkin(request: Request) -> ActiveCheckin | None:
    account_key = await _session_account_key(request)
    return await _active_checkin_by_account_key(account_key)


async def get_session_user(request: Request) -> SessionUser:
    profile = await get_profile_details(request)
    return _build_session_user(profile, await _active_checkin_by_account_key(profile.id))


async def login(payload: LoginPayload) -> AuthGrant:
    login_value = payload.login.strip()
    document = await _profile_document_by_login(login_value)
    if document is None or not document.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, document.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    tokens = await _issue_session(document.account_key)
    profile = document_to_profile_details(document)
    return AuthGrant(
        user=_build_session_user(
            profile, await _active_checkin_by_account_key(document.account_key)
        ),
        tokens=tokens,
    )


async def register_account(payload: RegisterPayload) -> AuthGrant:
    username = payload.username.strip()
    email = payload.email.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if payload.password1 != payload.password2:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if await _profile_document_by_login(username) is not None:
        raise HTTPException(status_code=400, detail="Username already exists")
    if await _profile_document_by_login(email) is not None:
        raise HTTPException(status_code=400, detail="Email already exists")

    if mongodb_database.mongodb_database is None:
        global _MEMORY_PROFILE, _MEMORY_PASSWORD_HASH
        _MEMORY_PROFILE = ProfileDetails(
            id=username,
            username=username,
            email=email,
            xp=0,
            avatar_url=None,
            share_presence=True,
            discord_handle=None,
            level=None,
        )
        _MEMORY_PASSWORD_HASH = hash_password(payload.password1)
        tokens = await _issue_session(username)
        return AuthGrant(
            user=_build_session_user(_MEMORY_PROFILE.model_copy(deep=True), None), tokens=tokens
        )

    document = ProfileDocument(
        account_key=username,
        username=username,
        email=email,
        password_hash=hash_password(payload.password1),
        email_verified=True,
        xp=0,
        avatar_url=None,
        share_presence=True,
        discord_handle=None,
    )
    await document.insert()
    tokens = await _issue_session(username)
    return AuthGrant(
        user=_build_session_user(document_to_profile_details(document), None), tokens=tokens
    )


async def logout(request: Request) -> None:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        return None

    token_hash = hash_secret(session_token)
    if mongodb_database.mongodb_database is None:
        _MEMORY_SESSIONS.pop(token_hash, None)
        return None

    document = await SessionDocument.find_one(SessionDocument.session_token_hash == token_hash)
    if document is not None:
        await document.delete()
    return None


async def request_password_reset(payload: PasswordResetPayload) -> PasswordResetGrant | None:
    document = await _profile_document_by_login(payload.email.strip().lower())
    if document is None:
        return None

    reset_token = generate_token()
    now = utc_now()
    expires_at = now + PASSWORD_RESET_TTL

    if mongodb_database.mongodb_database is None:
        _MEMORY_PASSWORD_RESETS[hash_secret(reset_token)] = {
            "account_key": document.account_key,
            "expires_at": expires_at,
            "consumed_at": None,
        }
        send_password_reset_email(
            recipient_email=document.email or payload.email.strip().lower(),
            account_key=document.account_key,
            token=reset_token,
        )
        return PasswordResetGrant(account_key=document.account_key, token=reset_token)

    reset_document = PasswordResetDocument(
        account_key=document.account_key,
        token_hash=hash_secret(reset_token),
        created_at=now,
        expires_at=expires_at,
        consumed_at=None,
    )
    send_password_reset_email(
        recipient_email=document.email or payload.email.strip().lower(),
        account_key=document.account_key,
        token=reset_token,
    )
    await reset_document.insert()
    return PasswordResetGrant(account_key=document.account_key, token=reset_token)


async def confirm_password_reset(payload: PasswordResetConfirmPayload) -> None:
    if payload.new_password1 != payload.new_password2:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    account_key = payload.uid.strip()
    token_hash = hash_secret(payload.token.strip())
    now = utc_now()

    if mongodb_database.mongodb_database is None:
        record = _MEMORY_PASSWORD_RESETS.get(token_hash)
        if record is None or record.get("account_key") != account_key:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        expires_at = record.get("expires_at")
        consumed_at = record.get("consumed_at")
        if not isinstance(expires_at, datetime) or expires_at <= now or consumed_at is not None:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=404, detail="Profile not found")

        global _MEMORY_PASSWORD_HASH
        _MEMORY_PASSWORD_HASH = hash_password(payload.new_password1)
        record["consumed_at"] = now
        await _delete_all_sessions(account_key)
        return None

    reset_document = await PasswordResetDocument.find_one(
        PasswordResetDocument.token_hash == token_hash
    )
    if reset_document is None or reset_document.account_key != account_key:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if _ensure_utc_datetime(reset_document.expires_at) <= now or (
        reset_document.consumed_at is not None
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    document.password_hash = hash_password(payload.new_password1)
    await document.save()

    reset_document.consumed_at = now
    await reset_document.save()
    await _delete_all_sessions(account_key)
    return None


async def change_password(request: Request, payload: PasswordChangePayload) -> None:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        global _MEMORY_PASSWORD_HASH
        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=404, detail="Profile not found")
        if not verify_password(payload.old_password, _MEMORY_PASSWORD_HASH):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if payload.new_password1 != payload.new_password2:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        _MEMORY_PASSWORD_HASH = hash_password(payload.new_password1)
        await _delete_all_sessions(account_key)
        return None

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not verify_password(payload.old_password, document.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.new_password1 != payload.new_password2:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    document.password_hash = hash_password(payload.new_password1)
    await document.save()
    await _delete_all_sessions(account_key)
    return None


async def update_profile(request: Request, payload: ProfileUpdatePayload) -> ProfileDetails:
    account_key = await _session_account_key(request)

    wants_identity_change = bool(payload.username.strip()) or bool(payload.email.strip())

    if mongodb_database.mongodb_database is None:
        global _MEMORY_PROFILE
        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=404, detail="Profile not found")

        if wants_identity_change:
            if not payload.current_password or not verify_password(
                payload.current_password, _MEMORY_PASSWORD_HASH
            ):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            new_username = payload.username.strip() or _MEMORY_PROFILE.username
            new_email = payload.email.strip() or _MEMORY_PROFILE.email
            _MEMORY_PROFILE = _MEMORY_PROFILE.model_copy(
                update={
                    "id": new_username,
                    "username": new_username,
                    "email": new_email,
                    "share_presence": payload.share_presence,
                    "discord_handle": payload.discord_handle.strip() or None,
                }
            )

        else:
            _MEMORY_PROFILE = _MEMORY_PROFILE.model_copy(
                update={
                    "share_presence": payload.share_presence,
                    "discord_handle": payload.discord_handle.strip() or None,
                }
            )
        return _MEMORY_PROFILE.model_copy(deep=True)

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    if wants_identity_change:
        if not payload.current_password or not verify_password(
            payload.current_password, document.password_hash
        ):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        new_username = payload.username.strip()
        new_email = payload.email.strip()
        if new_username and new_username != document.username:
            existing = await _profile_document_by_login(new_username)
            if existing is not None:
                raise HTTPException(status_code=400, detail="Username already exists")
            document.username = new_username
            document.account_key = new_username
        if new_email and new_email != document.email:
            existing = await _profile_document_by_login(new_email)
            if existing is not None:
                raise HTTPException(status_code=400, detail="Email already exists")
            document.email = new_email

    document.discord_handle = payload.discord_handle.strip() or None
    document.share_presence = payload.share_presence
    await document.save()
    return document_to_profile_details(document)


async def set_avatar(request: Request, file: UploadFile) -> ProfileDetails:
    account_key = await _session_account_key(request)
    content = await file.read()
    mime_type = file.content_type or "image/png"
    data_url = f"data:{mime_type};base64,{b64encode(content).decode('ascii')}"

    if mongodb_database.mongodb_database is None:
        global _MEMORY_PROFILE
        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=404, detail="Profile not found")

        _MEMORY_PROFILE = _MEMORY_PROFILE.model_copy(
            update={
                "avatar_url": data_url,
            }
        )
        return _MEMORY_PROFILE.model_copy(deep=True)

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    document.avatar_url = data_url
    await document.save()
    return document_to_profile_details(document)


async def delete_avatar(request: Request) -> ProfileDetails:
    account_key = await _session_account_key(request)

    if mongodb_database.mongodb_database is None:
        global _MEMORY_PROFILE
        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=404, detail="Profile not found")

        _MEMORY_PROFILE = _MEMORY_PROFILE.model_copy(
            update={
                "avatar_url": None,
            }
        )
        return _MEMORY_PROFILE.model_copy(deep=True)

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    document.avatar_url = None
    await document.save()
    return document_to_profile_details(document)


async def start_checkin(request: Request, payload: StartCheckinPayload) -> ActiveCheckin:
    account_key = await _session_account_key(request)
    space = await get_space_by_external_id(str(payload.space_id))
    if space is None:
        space = get_sample_space_by_external_id(str(payload.space_id))

    if space is None:
        raise HTTPException(status_code=404, detail=f"Unknown space id: {payload.space_id}")

    started_at = datetime.now(tz=UTC)

    if mongodb_database.mongodb_database is None:
        global _MEMORY_ACTIVE_CHECKIN
        _MEMORY_ACTIVE_CHECKIN = ActiveCheckin(
            id="local-checkin",
            space_id=space.id,
            space_name=space.name,
            space_latitude=space.latitude,
            space_longitude=space.longitude,
            space_address=space.address,
            uses_power=payload.uses_power,
            started_at=started_at.isoformat(),
        )
        return _MEMORY_ACTIVE_CHECKIN

    await CheckinDocument.find(CheckinDocument.account_key == account_key).delete()
    document = CheckinDocument(
        account_key=account_key,
        space_external_id=space.id,
        space_name=space.name,
        space_latitude=space.latitude,
        space_longitude=space.longitude,
        space_address=space.address,
        uses_power=payload.uses_power,
        started_at=started_at,
    )
    await document.insert()
    return ActiveCheckin(
        id=str(document.id),
        space_id=document.space_external_id,
        space_name=document.space_name,
        space_latitude=document.space_latitude,
        space_longitude=document.space_longitude,
        space_address=document.space_address,
        uses_power=document.uses_power,
        started_at=document.started_at.isoformat(),
    )


def _compute_stats_from_history(history_docs: list[CheckinHistoryDocument]) -> dict:
    if not history_docs:
        return {
            "total_spaces_visited": 0,
            "favorite_space_id": None,
            "favorite_space_name": None,
            "most_active_day": 0,
            "avg_checkin_duration": 0,
            "favorite_time_slot": "morning",
        }

    space_counts: Counter[str] = Counter()
    day_counts: Counter[int] = Counter()
    duration_sum = 0
    slot_counts: Counter[str] = Counter()

    for doc in history_docs:
        if doc.space_external_id:
            space_counts[doc.space_external_id] += 1
        day_counts[doc.ended_at.weekday()] += 1
        duration_sum += doc.duration_minutes or 0
        hour = doc.started_at.hour
        if 6 <= hour < 12:
            slot = "morning"
        elif 12 <= hour < 18:
            slot = "afternoon"
        elif 18 <= hour < 22:
            slot = "evening"
        else:
            slot = "night"
        slot_counts[slot] += 1

    total_spaces = len(space_counts)
    favorite_space_id = space_counts.most_common(1)[0][0] if space_counts else None
    favorite_space_name = None
    if favorite_space_id:
        for doc in history_docs:
            if doc.space_external_id == favorite_space_id and doc.space_name:
                favorite_space_name = doc.space_name
                break
    most_active_day = day_counts.most_common(1)[0][0] if day_counts else 0
    avg_duration = duration_sum // len(history_docs) if history_docs else 0
    favorite_slot = slot_counts.most_common(1)[0][0] if slot_counts else "morning"

    return {
        "total_spaces_visited": total_spaces,
        "favorite_space_id": favorite_space_id,
        "favorite_space_name": favorite_space_name,
        "most_active_day": most_active_day,
        "avg_checkin_duration": avg_duration,
        "favorite_time_slot": favorite_slot,
    }


async def end_checkin(request: Request, payload: EndCheckinPayload) -> None:
    account_key = await _session_account_key(request)
    _ = payload
    now = utc_now()
    current_date = now.date()

    if mongodb_database.mongodb_database is None:
        global _MEMORY_ACTIVE_CHECKIN, _MEMORY_PROFILE
        if _MEMORY_PROFILE.id != account_key:
            raise HTTPException(status_code=404, detail="Profile not found")

        if _MEMORY_ACTIVE_CHECKIN is None:
            raise HTTPException(status_code=404, detail="No active check-in")

        total_checkins, activity_streak_days, last_checkin_date = _advance_checkin_stats(
            _MEMORY_PROFILE.total_checkins,
            _MEMORY_PROFILE.activity_streak_days,
            _MEMORY_PROFILE.last_checkin_date,
            current_date,
        )
        started_at = _MEMORY_ACTIVE_CHECKIN.started_at or now.isoformat()
        started_at_dt = datetime.fromisoformat(started_at)
        duration_minutes = max(int((now - started_at_dt).total_seconds() // 60), 1)
        duration_minutes = min(duration_minutes, MAX_CHECKIN_DURATION_MINUTES)
        xp_gained = XP_PER_CHECKIN_BASE + duration_minutes * XP_PER_MINUTE
        _MEMORY_CHECKIN_HISTORY.insert(
            0,
            _checkin_history_entry_from_active_checkin(
                _MEMORY_ACTIVE_CHECKIN,
                ended_at=now,
                duration_minutes=duration_minutes,
            ),
        )
        _MEMORY_PROFILE = _MEMORY_PROFILE.model_copy(
            update={
                "total_checkins": total_checkins,
                "activity_streak_days": activity_streak_days,
                "last_checkin_date": last_checkin_date,
                "xp": _MEMORY_PROFILE.xp + xp_gained,
            }
        )
        _MEMORY_ACTIVE_CHECKIN = None
        return None

    document = await _profile_document_by_account_key(account_key)
    if document is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    active_checkin = await CheckinDocument.find_one(CheckinDocument.account_key == account_key)
    if active_checkin is None:
        raise HTTPException(status_code=404, detail="No active check-in")

    total_checkins, activity_streak_days, last_checkin_date = _advance_checkin_stats(
        document.total_checkins,
        document.activity_streak_days,
        document.last_checkin_date,
        current_date,
    )

    duration_minutes = max(
        int((now - _ensure_utc_datetime(active_checkin.started_at)).total_seconds() // 60),
        1,
    )
    duration_minutes = min(duration_minutes, MAX_CHECKIN_DURATION_MINUTES)
    xp_gained = XP_PER_CHECKIN_BASE + duration_minutes * XP_PER_MINUTE
    history_document = CheckinHistoryDocument(
        account_key=account_key,
        space_external_id=active_checkin.space_external_id,
        space_name=active_checkin.space_name,
        space_latitude=active_checkin.space_latitude,
        space_longitude=active_checkin.space_longitude,
        space_address=active_checkin.space_address,
        uses_power=active_checkin.uses_power,
        started_at=active_checkin.started_at,
        ended_at=now,
        duration_minutes=duration_minutes,
    )
    await history_document.insert()

    history_docs = await CheckinHistoryDocument.find(
        CheckinHistoryDocument.account_key == account_key
    ).to_list()

    computed = _compute_stats_from_history(history_docs)

    document.total_checkins = total_checkins
    document.activity_streak_days = activity_streak_days
    document.last_checkin_date = last_checkin_date
    document.xp += xp_gained
    document.total_hours_studied = round(document.total_hours_studied + duration_minutes / 60, 1)
    document.longest_session = max(document.longest_session, duration_minutes)
    document.total_spaces_visited = computed["total_spaces_visited"]
    document.favorite_space_id = computed["favorite_space_id"]
    document.favorite_space_name = computed["favorite_space_name"]
    document.most_active_day = computed["most_active_day"]
    document.avg_checkin_duration = computed["avg_checkin_duration"]
    document.favorite_time_slot = computed["favorite_time_slot"]
    if active_checkin.uses_power:
        document.power_checkins = document.power_checkins + 1
    started_hour = _ensure_utc_datetime(active_checkin.started_at).hour
    if started_hour < 8:
        document.has_early_bird = True
    if started_hour >= 22:
        document.has_night_owl = True
    document.earned_badges = compute_badges(
        total_checkins=document.total_checkins,
        activity_streak_days=document.activity_streak_days,
        power_checkins=document.power_checkins,
        distinct_spaces=document.total_spaces_visited,
        has_early_bird=document.has_early_bird,
        has_night_owl=document.has_night_owl,
        has_social_checkins=document.has_social_checkins,
    )
    await document.save()

    await active_checkin.delete()
    return None
