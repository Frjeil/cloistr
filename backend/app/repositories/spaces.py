from app.core import database as mongodb_database
from app.core.sample_data import SAMPLE_SPACES
from app.models import SpaceDocument
from app.schemas.space import SpaceSearchFilters, SpaceSummary


def _document_to_summary(document: SpaceDocument) -> SpaceSummary:
    return SpaceSummary(
        id=document.external_id or str(document.id),
        name=document.name,
        address=document.address,
        latitude=document.latitude,
        longitude=document.longitude,
        kind=document.kind,
        capacity=document.capacity,
        power_capacity=document.power_capacity,
        wifi=document.wifi,
        power=document.power,
        quiet=document.quiet,
        air_conditioning=document.air_conditioning,
        availability=document.availability,
    )


def _matches_filters(space: SpaceSummary, filters: SpaceSearchFilters) -> bool:
    if filters.q.strip():
        needle = filters.q.strip().lower()
        if needle not in space.name.lower() and needle not in (space.address or "").lower():
            return False

    if filters.kind and space.kind != filters.kind:
        return False

    if filters.availability and space.availability != filters.availability:
        return False

    if filters.wifi and not space.wifi:
        return False
    if filters.power and not space.power:
        return False
    if filters.quiet and not space.quiet:
        return False
    if filters.air_conditioning and not space.air_conditioning:
        return False

    return True


def _sample_search(filters: SpaceSearchFilters) -> list[SpaceSummary]:
    return [space for space in SAMPLE_SPACES if _matches_filters(space, filters)]


def get_sample_space_by_external_id(external_id: str) -> SpaceSummary | None:
    for space in SAMPLE_SPACES:
        if space.id == external_id:
            return space

    return None


async def get_space_by_external_id(external_id: str) -> SpaceSummary | None:
    if mongodb_database.mongodb_database is None:
        return get_sample_space_by_external_id(external_id)

    document = await SpaceDocument.find_one(SpaceDocument.external_id == external_id)
    if document is None:
        documents = await SpaceDocument.find_all().to_list()
        document = next((item for item in documents if str(item.id) == external_id), None)
        if document is None:
            return None

    return _document_to_summary(document)


async def search_spaces(filters: SpaceSearchFilters) -> list[SpaceSummary]:
    if mongodb_database.mongodb_database is None:
        return _sample_search(filters)

    query: dict[str, object] = {}

    if filters.q.strip():
        needle = filters.q.strip()
        query["$or"] = [
            {"name": {"$regex": needle, "$options": "i"}},
            {"address": {"$regex": needle, "$options": "i"}},
        ]

    if filters.kind:
        query["kind"] = filters.kind

    if filters.availability:
        query["availability"] = filters.availability

    if filters.wifi:
        query["wifi"] = True
    if filters.power:
        query["power"] = True
    if filters.quiet:
        query["quiet"] = True
    if filters.air_conditioning:
        query["air_conditioning"] = True

    documents = await SpaceDocument.find(query).limit(200).to_list()

    return [_document_to_summary(document) for document in documents if document.name]
