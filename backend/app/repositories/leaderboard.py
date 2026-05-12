from __future__ import annotations

from app.core.database import mongodb_database
from app.core.profile_helpers import document_to_profile_details
from app.models import ProfileDocument
from app.repositories.account import get_memory_profile_details
from app.schemas.leaderboard import (
    LeaderboardEntry,
    LeaderboardLevel,
    LeaderboardLevelInfo,
    LeaderboardResponse,
    LeaderboardResults,
)
from app.schemas.profile import ProfileDetails, ProfileLevel

LEADERBOARD_LIMIT = 10



def _profile_level_from_details(level: ProfileLevel | None) -> LeaderboardLevel | None:
    if level is None:
        return None

    return LeaderboardLevel(
        slug=level.slug,
        name=level.name,
        xp_to_next_level=level.xp_to_next_level,
        next_level=LeaderboardLevelInfo(
            slug=level.next_level.slug,
            name=level.next_level.name,
        )
        if level.next_level
        else None,
    )


def _leaderboard_entry(
    profile: ProfileDetails,
    rank: int,
) -> LeaderboardEntry:
    return LeaderboardEntry(
        rank=rank,
        username=profile.username,
        avatar_url=profile.avatar_url,
        discord_handle=profile.discord_handle,
        xp=profile.xp,
        total_checkins=profile.total_checkins,
        activity_streak_days=profile.activity_streak_days,
        level=_profile_level_from_details(profile.level),
    )


def _sort_profiles_by_xp(profiles: list[ProfileDetails]) -> list[ProfileDetails]:
    return sorted(profiles, key=lambda profile: (-profile.xp, profile.username.lower()))


def _sort_profiles_by_level(profiles: list[ProfileDetails]) -> list[ProfileDetails]:
    def sort_key(profile: ProfileDetails) -> tuple[int, int, str]:
        level_position = (
            profile.level.position
            if profile.level and profile.level.position is not None
            else 10_000
        )
        return (level_position, -profile.xp, profile.username.lower())

    return sorted(profiles, key=sort_key)


async def build_leaderboard() -> LeaderboardResponse:
    if mongodb_database is None:
        profile = get_memory_profile_details()
        return LeaderboardResponse(
            results=LeaderboardResults(
                xp=[_leaderboard_entry(profile, 1)],
                levels=[_leaderboard_entry(profile, 1)],
                checkins=[_leaderboard_entry(profile, 1)],
                streak=[_leaderboard_entry(profile, 1)],
            )
        )

    profile_documents = await ProfileDocument.find_all().to_list()
    profiles = [document_to_profile_details(document) for document in profile_documents]

    xp_entries = [
        _leaderboard_entry(profile, rank)
        for rank, profile in enumerate(_sort_profiles_by_xp(profiles)[:LEADERBOARD_LIMIT], start=1)
    ]
    level_entries = [
        _leaderboard_entry(profile, rank)
        for rank, profile in enumerate(
            _sort_profiles_by_level(profiles)[:LEADERBOARD_LIMIT], start=1
        )
    ]
    checkin_entries = [
        _leaderboard_entry(
            profile,
            rank,
        )
        for rank, profile in enumerate(
            sorted(
                profiles,
                key=lambda profile: (-profile.total_checkins, profile.username.lower()),
            )[:LEADERBOARD_LIMIT],
            start=1,
        )
    ]
    streak_entries = [
        _leaderboard_entry(
            profile,
            rank,
        )
        for rank, profile in enumerate(
            sorted(
                profiles,
                key=lambda profile: (-profile.activity_streak_days, profile.username.lower()),
            )[:LEADERBOARD_LIMIT],
            start=1,
        )
    ]

    return LeaderboardResponse(
        results=LeaderboardResults(
            xp=xp_entries,
            levels=level_entries,
            checkins=checkin_entries,
            streak=streak_entries,
        )
    )
