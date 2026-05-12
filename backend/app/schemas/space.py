from typing import Literal

from pydantic import BaseModel

SpaceAvailability = Literal["free", "moderate", "busy"]
SpaceKind = Literal["library", "cafe", "classroom", "coworking", "other"]


class SpaceSummary(BaseModel):
    id: str
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


class SpaceSearchFilters(BaseModel):
    q: str = ""
    kind: SpaceKind | None = None
    min_capacity: int = 0
    availability: SpaceAvailability | None = None
    wifi: bool = False
    power: bool = False
    quiet: bool = False
    air_conditioning: bool = False


class SpaceSearchResponse(BaseModel):
    results: list[SpaceSummary]
