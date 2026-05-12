from fastapi import APIRouter

from app.api.routes import auth, checkins, contacts, health, leaderboard, profile, spaces

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(spaces.router, prefix="/spaces", tags=["spaces"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(checkins.router, prefix="/checkins", tags=["checkins"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
