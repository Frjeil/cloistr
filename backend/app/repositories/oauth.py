from fastapi import HTTPException

from app.core import database as mongodb_database
from app.core.auth_security import DEFAULT_DEMO_PASSWORD, AuthTokens, hash_password
from app.models import ProfileDocument
from app.repositories.account import (
    _MEMORY_PROFILE,
    AuthGrant,
    _active_checkin_by_account_key,
    _build_session_user,
    _issue_session,
    document_to_profile_details,
    get_memory_profile_details,
)


async def find_or_create_profile_by_oauth(
    provider: str,
    provider_id: str,
    email: str,
    username: str,
) -> AuthGrant:
    id_field = f"{provider}_id"

    if mongodb_database.mongodb_database is None:
        return _find_or_create_oauth_memory(provider, provider_id)

    document = await ProfileDocument.find_one({id_field: provider_id})

    if document is None:
        document = await ProfileDocument.find_one({"email": email})

    if document is None:
        account_key = provider_id
        candidate = await _unique_username(username)
        document = ProfileDocument(
            account_key=account_key,
            username=candidate,
            email=email,
            password_hash=hash_password(DEFAULT_DEMO_PASSWORD),
            email_verified=True,
            **{id_field: provider_id},
        )
        await document.insert()
    else:
        existing = getattr(document, id_field, None)
        if existing != provider_id:
            setattr(document, id_field, provider_id)
            await document.save()

    tokens: AuthTokens = await _issue_session(document.account_key)
    profile_details = document_to_profile_details(document)
    return AuthGrant(
        user=_build_session_user(
            profile_details,
            await _active_checkin_by_account_key(document.account_key),
        ),
        tokens=tokens,
    )


def _find_or_create_oauth_memory(
    provider: str,
    provider_id: str,
) -> AuthGrant:
    import asyncio

    id_field = f"{provider}_id"
    existing_id = getattr(_MEMORY_PROFILE, id_field, None)
    if existing_id == provider_id:
        tokens = asyncio.get_event_loop().run_until_complete(
            _issue_session(_MEMORY_PROFILE.account_key)
        )
        profile = get_memory_profile_details()
        return AuthGrant(
            user=_build_session_user(profile, None),
            tokens=tokens,
        )

    raise HTTPException(
        status_code=400,
        detail="OAuth not available in demo mode. Configure MongoDB.",
    )


async def _unique_username(base: str) -> str:
    candidate = base
    suffix = 1
    while True:
        existing = await ProfileDocument.find_one({"username": candidate})
        if existing is None:
            return candidate
        candidate = f"{base}{suffix}"
        suffix += 1
