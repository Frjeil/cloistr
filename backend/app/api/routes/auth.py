from fastapi import APIRouter, Request, Response

from app.core.auth_security import CSRF_COOKIE_NAME, SESSION_TTL, generate_token, is_secure_env
from app.repositories.account import (
    AuthGrant,
    _require_csrf,
    _set_session_cookies,
    change_password,
    clear_session_cookies,
    confirm_password_reset,
    get_session_user,
    login,
    logout,
    register_account,
    request_password_reset,
)
from app.schemas.auth import (
    LoginPayload,
    PasswordChangePayload,
    PasswordResetConfirmPayload,
    PasswordResetPayload,
    RegisterPayload,
)
from app.schemas.session import SessionUser

router = APIRouter()


@router.get("/csrf/")
async def csrf(response: Response) -> dict[str, str]:
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=generate_token(),
        httponly=False,
        secure=is_secure_env(),
        samesite="lax",
        path="/",
        max_age=int(SESSION_TTL.total_seconds()),
    )
    return {"detail": "CSRF cookie set"}


@router.get("/me/", response_model=SessionUser)
async def me(request: Request) -> SessionUser:
    return await get_session_user(request)


@router.post("/login/", response_model=SessionUser)
async def login_route(payload: LoginPayload, request: Request, response: Response) -> SessionUser:
    _require_csrf(request)
    grant: AuthGrant = await login(payload)
    _set_session_cookies(response, grant.tokens)
    return grant.user


@router.post("/register/", response_model=SessionUser)
async def register_route(
    payload: RegisterPayload,
    request: Request,
    response: Response,
) -> SessionUser:
    _require_csrf(request)
    grant: AuthGrant = await register_account(payload)
    _set_session_cookies(response, grant.tokens)
    return grant.user


@router.post("/logout/")
async def logout_route(request: Request, response: Response) -> dict[str, str]:
    _require_csrf(request)
    await logout(request)
    clear_session_cookies(response)
    return {"detail": "Logged out"}


@router.post("/password/reset/request/")
async def password_reset_request_route(
    payload: PasswordResetPayload, request: Request
) -> dict[str, str]:
    _require_csrf(request)
    await request_password_reset(payload)
    return {"detail": "Password reset requested"}


@router.post("/password/reset/confirm/")
async def password_reset_confirm_route(
    payload: PasswordResetConfirmPayload,
    request: Request,
) -> dict[str, str]:
    _require_csrf(request)
    await confirm_password_reset(payload)
    return {"detail": "Password reset confirmed"}


@router.post("/password/change/")
async def password_change_route(payload: PasswordChangePayload, request: Request) -> dict[str, str]:
    _require_csrf(request)
    await change_password(request, payload)
    return {"detail": "Password changed"}
