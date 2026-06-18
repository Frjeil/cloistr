from datetime import date
from typing import Literal

from beanie import Document


class ProfileDocument(Document):
    account_key: str
    username: str
    email: str | None = None
    password_hash: str = ""
    email_verified: bool = True
    xp: int = 0
    total_checkins: int = 0
    activity_streak_days: int = 0
    last_checkin_date: date | None = None
    avatar_url: str | None = None
    share_presence: bool = True
    discord_handle: str | None = None
    earned_badges: list[str] = []
    total_hours_studied: float = 0.0
    longest_session: int = 0
    favorite_space_id: str | None = None
    favorite_space_name: str | None = None
    most_active_day: int = 0
    avg_checkin_duration: int = 0
    favorite_time_slot: Literal["morning", "afternoon", "evening", "night"] = "morning"
    total_spaces_visited: int = 0
    power_checkins: int = 0
    has_early_bird: bool = False
    has_night_owl: bool = False
    has_social_checkins: bool = False
    favorite_spaces: list[str] = []
    google_id: str | None = None
    github_id: str | None = None

    class Settings:
        name = "profiles"
