import logging

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.auth_security import DEFAULT_DEMO_PASSWORD, hash_password
from app.core.config import get_settings
from app.core.sample_data import (
    SAMPLE_ACCOUNT_KEY,
    SAMPLE_ACCOUNT_USERNAME,
    get_sample_profile_document,
    get_sample_space_documents,
)
from app.models import (
    CheckinDocument,
    CheckinHistoryDocument,
    PasswordResetDocument,
    ProfileDocument,
    SessionDocument,
    SpaceDocument,
)

logger = logging.getLogger(__name__)

mongodb_client = None
mongodb_database = None


async def seed_spaces_if_empty() -> None:
    count = await SpaceDocument.count()
    if count > 0:
        return

    sample_documents = [SpaceDocument(**payload) for payload in get_sample_space_documents()]
    if not sample_documents:
        return

    await SpaceDocument.insert_many(sample_documents)
    logger.info("Seeded MongoDB spaces collection with %s sample records", len(sample_documents))


async def sync_spaces() -> None:
    """Ensure all sample spaces exist in MongoDB (adds missing ones, keeps existing)."""
    all_docs = [SpaceDocument(**p) for p in get_sample_space_documents()]
    existing_ids = set()
    async for doc in SpaceDocument.find_all():
        if doc.external_id:
            existing_ids.add(doc.external_id)

    inserted = 0
    for doc in all_docs:
        if doc.external_id not in existing_ids:
            await doc.insert()
            inserted += 1

    if inserted:
        logger.info("Synced %s new spaces into MongoDB", inserted)


async def seed_profile_if_empty() -> None:
    count = await ProfileDocument.count()
    if count > 0:
        return

    await ProfileDocument(
        **get_sample_profile_document(hash_password(DEFAULT_DEMO_PASSWORD))
    ).insert()
    logger.info("Seeded MongoDB profiles collection with the default profile")


async def migrate_demo_profile_if_needed() -> None:
    document = await ProfileDocument.find_one(ProfileDocument.username == SAMPLE_ACCOUNT_USERNAME)
    if document is None:
        return

    sample_profile = get_sample_profile_document(hash_password(DEFAULT_DEMO_PASSWORD))
    changed = False
    if document.account_key != SAMPLE_ACCOUNT_KEY:
        document.account_key = SAMPLE_ACCOUNT_KEY
        changed = True
    if not document.password_hash:
        document.password_hash = hash_password(DEFAULT_DEMO_PASSWORD)
        changed = True
    if not document.email_verified:
        document.email_verified = True
        changed = True
    if not document.total_checkins:
        document.total_checkins = int(sample_profile["total_checkins"])
        changed = True
    if not document.activity_streak_days:
        document.activity_streak_days = int(sample_profile["activity_streak_days"])
        changed = True
    if document.last_checkin_date is None:
        document.last_checkin_date = sample_profile["last_checkin_date"]
        changed = True

    if changed:
        await document.save()
        logger.info("Migrated demo profile to the new auth schema")


async def connect_mongodb() -> None:
    global mongodb_client, mongodb_database

    settings = get_settings()
    if not settings.mongodb_uri:
        logger.warning("MONGODB_URI not set; backend is running without a live database connection")
        return

    mongodb_client = AsyncIOMotorClient(settings.mongodb_uri)
    mongodb_database = mongodb_client[settings.mongodb_db]
    await init_beanie(
        database=mongodb_database,
        document_models=[
            SpaceDocument,
            ProfileDocument,
            CheckinDocument,
            CheckinHistoryDocument,
            SessionDocument,
            PasswordResetDocument,
        ],
    )
    await seed_spaces_if_empty()
    await sync_spaces()
    await seed_profile_if_empty()
    await migrate_demo_profile_if_needed()


async def close_mongodb() -> None:
    global mongodb_client, mongodb_database

    if mongodb_client is not None:
        mongodb_client.close()

    mongodb_client = None
    mongodb_database = None
