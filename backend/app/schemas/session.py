from pydantic import BaseModel

from app.schemas.profile import ProfileDetails


class ActiveCheckin(BaseModel):
    id: str
    space_id: str
    space_name: str | None = None
    space_latitude: float | None = None
    space_longitude: float | None = None
    space_address: str | None = None
    uses_power: bool = False
    started_at: str | None = None


class SessionUser(BaseModel):
    id: str
    username: str
    email: str | None = None
    profile: ProfileDetails | None = None
    active_checkin: ActiveCheckin | None = None
