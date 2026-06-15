from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core import database as mongodb_database
from app.core.checkin_constants import MAX_CHECKIN_DURATION
from app.models import CheckinDocument, CheckinHistoryDocument
from app.repositories.account import _ensure_utc_datetime

scheduler = AsyncIOScheduler()


async def _close_single_expired_checkin(active_checkin: CheckinDocument) -> None:
    now = datetime.now(tz=UTC)
    duration_minutes = int(
        (now - _ensure_utc_datetime(active_checkin.started_at)).total_seconds() // 60
    )
    duration_minutes = max(min(duration_minutes, MAX_CHECKIN_DURATION.total_seconds() // 60), 1)
    ended_at = _ensure_utc_datetime(active_checkin.started_at) + timedelta(minutes=duration_minutes)

    history_document = CheckinHistoryDocument(
        account_key=active_checkin.account_key,
        space_external_id=active_checkin.space_external_id,
        space_name=active_checkin.space_name,
        space_latitude=active_checkin.space_latitude,
        space_longitude=active_checkin.space_longitude,
        space_address=active_checkin.space_address,
        uses_power=active_checkin.uses_power,
        started_at=active_checkin.started_at,
        ended_at=ended_at,
        duration_minutes=duration_minutes,
    )
    await history_document.insert()
    await active_checkin.delete()


async def close_expired_checkins() -> None:
    if mongodb_database.mongodb_database is None:
        return

    cutoff = datetime.now(tz=UTC) - MAX_CHECKIN_DURATION
    stale_checkins = await CheckinDocument.find(CheckinDocument.started_at < cutoff).to_list()

    for checkin in stale_checkins:
        try:
            await _close_single_expired_checkin(checkin)
        except Exception:
            pass


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        close_expired_checkins,
        trigger=IntervalTrigger(minutes=15),
        id="close_expired_checkins",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
