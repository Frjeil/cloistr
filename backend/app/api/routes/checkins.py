from fastapi import APIRouter, Query, Request

from app.repositories.account import end_checkin as end_checkin_repository
from app.repositories.account import get_checkin_history as get_checkin_history_repository
from app.repositories.account import start_checkin as start_checkin_repository
from app.schemas.checkin import CheckinHistoryResponse, EndCheckinPayload, StartCheckinPayload

router = APIRouter()


@router.post("/start/")
async def start_checkin(request: Request, payload: StartCheckinPayload) -> dict[str, str]:
    checkin = await start_checkin_repository(request, payload)
    return {"id": checkin.id, "space_id": checkin.space_id}


@router.post("/end/")
async def end_checkin(request: Request, payload: EndCheckinPayload) -> dict[str, str]:
    await end_checkin_repository(request, payload)
    return {"ok": "true"}


@router.get("/history/", response_model=CheckinHistoryResponse)
async def get_history(
    request: Request, limit: int = Query(default=5, ge=1, le=20)
) -> CheckinHistoryResponse:
    return CheckinHistoryResponse(results=await get_checkin_history_repository(request, limit))
