from fastapi import APIRouter, File, Request, UploadFile

from app.repositories.account import delete_avatar as delete_avatar_repository
from app.repositories.account import get_profile_details
from app.repositories.account import set_avatar as set_avatar_repository
from app.repositories.account import update_profile as update_profile_repository
from app.schemas.profile import ProfileDetails, ProfileUpdatePayload

router = APIRouter()


@router.get("/me/", response_model=ProfileDetails)
async def get_profile(request: Request) -> ProfileDetails:
    return await get_profile_details(request)


@router.patch("/me/", response_model=ProfileDetails)
async def update_profile(request: Request, payload: ProfileUpdatePayload) -> ProfileDetails:
    return await update_profile_repository(request, payload)


@router.post("/avatar/", response_model=ProfileDetails)
async def upload_avatar(request: Request, avatar: UploadFile = File(..., alias="avatar")) -> ProfileDetails:
    return await set_avatar_repository(request, avatar)


@router.delete("/avatar/")
async def delete_avatar(request: Request) -> dict[str, bool]:
    await delete_avatar_repository(request)
    return {"ok": True}
