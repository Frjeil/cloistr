from datetime import date

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

    class Settings:
        name = "profiles"
