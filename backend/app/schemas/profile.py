from datetime import date

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


class ProfileUpdatePayload(BaseModel):
    username: str = ""
    email: str = ""
    current_password: str = ""
    discord_handle: str = ""
    share_presence: bool = True
