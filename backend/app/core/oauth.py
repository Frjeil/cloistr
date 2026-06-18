from authlib.integrations.starlette_client import OAuth

from app.core.config import get_settings

oauth = OAuth()

settings = get_settings()

if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name="google",
        server_metdata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        client_kwargs={"scope": "openid email profile"},
    )

if settings.github_client_id and settings.github_client_secret:
    oauth.register(
        name="github",
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        client_kwargs={"scope": "user:email"},
    )
