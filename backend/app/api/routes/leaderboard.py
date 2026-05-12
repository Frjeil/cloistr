from fastapi import APIRouter

from app.repositories.leaderboard import build_leaderboard
from app.schemas.leaderboard import LeaderboardResponse

router = APIRouter()


@router.get("/", response_model=LeaderboardResponse)
async def get_leaderboard() -> LeaderboardResponse:
    return await build_leaderboard()
