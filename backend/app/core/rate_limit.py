from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request
from starlette.types import ASGIApp, Receive, Scope, Send


class InMemoryRateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clients: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.monotonic()
        timestamps = self._clients[key]
        cutoff = now - self.window_seconds

        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)

        if len(timestamps) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests")

        timestamps.append(now)

    def reset(self, key: str) -> None:
        self._clients.pop(key, None)


login_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60)
register_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
password_reset_limiter = InMemoryRateLimiter(max_requests=3, window_seconds=300)
contact_limiter = InMemoryRateLimiter(max_requests=3, window_seconds=60)

RATE_LIMITED_PATHS: dict[str, InMemoryRateLimiter] = {
    "/api/auth/login": login_limiter,
    "/api/auth/register": register_limiter,
    "/api/auth/password/reset/request": password_reset_limiter,
    "/api/contacts": contact_limiter,
}

ALL_LIMITERS: list[InMemoryRateLimiter] = [
    login_limiter,
    register_limiter,
    password_reset_limiter,
    contact_limiter,
]


def reset_all_limiters() -> None:
    for limiter in ALL_LIMITERS:
        limiter._clients.clear()


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path.rstrip("/")

        limiter = RATE_LIMITED_PATHS.get(path)
        if limiter is not None:
            limiter.check(client_ip)

        await self.app(scope, receive, send)
