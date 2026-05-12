from datetime import datetime

from beanie import Document


class SessionDocument(Document):
    account_key: str
    session_token_hash: str
    csrf_token_hash: str
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime

    class Settings:
        name = "sessions"
