from fastapi import APIRouter, File, Request, UploadFile

from app.repositories.account import add_favorite as add_favorite_repository
from app.repositories.account import delete_avatar as delete_avatar_repository
from app.repositories.account import get_favorites as get_favorites_repository
from app.repositories.account import get_profile_badges, get_profile_details, get_profile_stats
from app.repositories.account import remove_favorite as remove_favorite_repository
from app.repositories.account import set_avatar as set_avatar_repository
from app.repositories.account import update_profile as update_profile_repository
from app.schemas.profile import (
    BadgeListResponse,
    FavoriteSpace,
    PersonalStatsResponse,
    ProfileDetails,
    ProfileUpdatePayload,
)

router = APIRouter()


@router.get("/me/", response_model=ProfileDetails)
async def get_profile(request: Request) -> ProfileDetails:
    return await get_profile_details(request)


@router.patch("/me/", response_model=ProfileDetails)
async def update_profile(request: Request, payload: ProfileUpdatePayload) -> ProfileDetails:
    return await update_profile_repository(request, payload)


@router.post("/avatar/", response_model=ProfileDetails)
async def upload_avatar(
    request: Request, avatar: UploadFile = File(..., alias="avatar")
) -> ProfileDetails:
    return await set_avatar_repository(request, avatar)


@router.delete("/avatar/")
async def delete_avatar(request: Request) -> dict[str, bool]:
    await delete_avatar_repository(request)
    return {"ok": True}


@router.get("/badges/", response_model=BadgeListResponse)
async def get_badges(request: Request) -> BadgeListResponse:
    return await get_profile_badges(request)


@router.get("/stats/", response_model=PersonalStatsResponse)
async def get_stats(request: Request) -> PersonalStatsResponse:
    return await get_profile_stats(request)


@router.get("/favorites/", response_model=list[FavoriteSpace])
async def get_favorites(request: Request) -> list[FavoriteSpace]:
    return await get_favorites_repository(request)


@router.post("/favorites/{space_id}/")
async def add_favorite(request: Request, space_id: str) -> dict[str, bool]:
    await add_favorite_repository(request, space_id)
    return {"ok": True}


@router.delete("/favorites/{space_id}/")
async def remove_favorite(request: Request, space_id: str) -> dict[str, bool]:
    await remove_favorite_repository(request, space_id)
    return {"ok": True}
