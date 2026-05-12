from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import close_mongodb, connect_mongodb
from app.core.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_mongodb()
    try:
        yield
    finally:
        await close_mongodb()


settings = get_settings()

app = FastAPI(
    title="Cloistr API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(api_router, prefix="/api")
