from datetime import datetime

from beanie import Document


class CheckinDocument(Document):
    account_key: str
    space_external_id: str
    space_name: str | None = None
    space_latitude: float | None = None
    space_longitude: float | None = None
    space_address: str | None = None
    uses_power: bool = False
    started_at: datetime

    class Settings:
        name = "checkins"
