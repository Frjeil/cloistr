from fastapi import APIRouter, Query

from app.repositories.spaces import search_spaces as search_spaces_repository
from app.schemas.space import (
    SpaceAvailability,
    SpaceKind,
    SpaceSearchFilters,
    SpaceSearchResponse,
)

router = APIRouter()


@router.get("/search/", response_model=SpaceSearchResponse)
async def search_spaces(
    q: str = "",
    kind: SpaceKind | None = None,
    min_capacity: int = Query(default=0, ge=0),
    availability: SpaceAvailability | None = None,
    wifi: bool = False,
    power: bool = False,
    quiet: bool = False,
    air_conditioning: bool = False,
) -> SpaceSearchResponse:
    filters = SpaceSearchFilters(
        q=q,
        kind=kind,
        min_capacity=min_capacity,
        availability=availability,
        wifi=wifi,
        power=power,
        quiet=quiet,
        air_conditioning=air_conditioning,
    )

    return SpaceSearchResponse(results=await search_spaces_repository(filters))
