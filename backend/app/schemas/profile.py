from datetime import date
from typing import Literal

from pydantic import BaseModel


class ProfileLevelRef(BaseModel):
    slug: str | None = None
    name: str | None = None


class ProfileLevel(BaseModel):
    slug: str | None = None
    name: str | None = None
    xp_into_level: int | None = None
    xp_required_for_next_level: int | None = None
    xp_to_next_level: int | None = None
    progress_percentage: int | None = None
    position: int | None = None
    total_levels: int | None = None
    is_max_level: bool = False
    next_level: ProfileLevelRef | None = None


class ProfileDetails(BaseModel):
    id: str
    username: str
    email: str | None = None
    xp: int = 0
    total_checkins: int = 0
    activity_streak_days: int = 0
    last_checkin_date: date | None = None
    avatar_url: str | None = None
    share_presence: bool = True
    discord_handle: str | None = None
    level: ProfileLevel | None = None
    earned_badges: list[str] = []


class ProfileUpdatePayload(BaseModel):
    username: str = ""
    email: str = ""
    current_password: str = ""
    discord_handle: str = ""
    share_presence: bool = True


class BadgeInfo(BaseModel):
    slug: str
    name: str
    description: str
    icon: str


class BadgeListResponse(BaseModel):
    earned: list[str]
    all: list[BadgeInfo]


class FavoriteSpaceRef(BaseModel):
    id: str | None = None
    name: str | None = None


class FavoriteSpace(BaseModel):
    id: str
    name: str
    address: str | None = None
    kind: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class PersonalStatsResponse(BaseModel):
    total_hours_studied: float = 0.0
    longest_session: int = 0
    favorite_space: FavoriteSpaceRef | None = None
    most_active_day: int = 0
    avg_checkin_duration: int = 0
    favorite_time_slot: Literal["morning", "afternoon", "evening", "night"] = "morning"
    total_spaces_visited: int = 0
