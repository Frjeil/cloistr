from authlib.integrations.starlette_client import OAuthError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.oauth import oauth
from app.repositories.account import _set_session_cookies
from app.repositories.oauth import find_or_create_profile_by_oauth

router = APIRouter()


def _check_provider(provider: str) -> None:
    if provider not in ("google", "github"):
        raise HTTPException(status_code=404, detail=f"Unknown OAuth provider: {provider}")


@router.get("/{provider}/login/")
async def oauth_login(provider: str, request: Request) -> RedirectResponse:
    _check_provider(provider)
    client = oauth.create_client(provider)
    if client is None:
        raise HTTPException(status_code=404, detail=f"OAuth provider not configured: {provider}")
    redirect_uri = request.url_for("oauth_callback", provider=provider)
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback/")
async def oauth_callback(provider: str, request: Request) -> RedirectResponse:
    _check_provider(provider)
    client = oauth.create_client(provider)
    if client is None:
        raise HTTPException(status_code=404, detail=f"OAuth provider not configured: {provider}")

    try:
        token_response = await client.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(status_code=400, detail="OAuth authentication failed")

    provider_id: str | None = None
    email = ""
    name = ""

    if provider == "google":
        user_info = token_response.get("userinfo")
        if not user_info:
            user_info = await client.parse_id_token(request, token_response)
        provider_id = (user_info or {}).get("sub")
        email = (user_info or {}).get("email", "")
        name = (user_info or {}).get("name", "")

    elif provider == "github":
        user_info = token_response.get("userinfo")
        if not user_info:
            resp = await client.get("https://api.github.com/user", token_response)
            user_info = resp.json()
        provider_id = str(user_info.get("id", ""))
        name = user_info.get("login", "")
        email = user_info.get("email", "")
        if not email:
            emails_resp = await client.get("https://api.github.com/user/emails", token_response)
            emails = emails_resp.json()
            for e in emails:
                if e.get("primary"):
                    email = e.get("email", "")
                    break
            if not email and emails:
                email = emails[0].get("email", "")

    if not provider_id:
        raise HTTPException(
            status_code=400, detail="Could not retrieve user identity from provider"
        )

    grant = await find_or_create_profile_by_oauth(
        provider=provider,
        provider_id=provider_id,
        email=email,
        username=name or email.split("@")[0],
    )

    redirect = RedirectResponse(url=get_settings().frontend_base_url, status_code=302)
    _set_session_cookies(redirect, grant.tokens)
    return redirect
