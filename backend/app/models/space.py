from beanie import Document

from app.schemas.space import SpaceAvailability, SpaceKind


class SpaceDocument(Document):
    external_id: str | None = None
    name: str
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    kind: SpaceKind | None = None
    capacity: int | None = None
    power_capacity: int | None = None
    wifi: bool = False
    power: bool = False
    quiet: bool = False
    air_conditioning: bool = False
    availability: SpaceAvailability | None = None

    class Settings:
        name = "spaces"
