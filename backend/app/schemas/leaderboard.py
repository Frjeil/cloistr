from pydantic import BaseModel


class LeaderboardLevelInfo(BaseModel):
    slug: str | None = None
    name: str | None = None


class LeaderboardLevel(BaseModel):
    slug: str | None = None
    name: str | None = None
    xp_to_next_level: int | None = None
    next_level: LeaderboardLevelInfo | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    avatar_url: str | None = None
    discord_handle: str | None = None
    xp: int | None = None
    total_checkins: int | None = None
    activity_streak_days: int | None = None
    level: LeaderboardLevel | None = None


class LeaderboardResults(BaseModel):
    xp: list[LeaderboardEntry]
    levels: list[LeaderboardEntry]
    checkins: list[LeaderboardEntry]
    streak: list[LeaderboardEntry]


class LeaderboardResponse(BaseModel):
    results: LeaderboardResults
