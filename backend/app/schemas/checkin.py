from pydantic import BaseModel


class CheckinHistoryEntry(BaseModel):
    id: str
    space_id: str
    space_name: str | None = None
    space_address: str | None = None
    uses_power: bool = False
    started_at: str
    ended_at: str
    duration_minutes: int


class CheckinHistoryResponse(BaseModel):
    results: list[CheckinHistoryEntry]


class StartCheckinPayload(BaseModel):
    space_id: str
    uses_power: bool = False


class EndCheckinPayload(BaseModel):
    checkin_id: str | None = None


class ActiveCheckinUser(BaseModel):
    id: str
    username: str
    avatar_url: str | None = None
    discord_handle: str | None = None
    level_slug: str | None = None
    level_name: str | None = None


class ActiveCheckinUsersResponse(BaseModel):
    results: list[ActiveCheckinUser]
