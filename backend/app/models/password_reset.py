from datetime import datetime

from beanie import Document


class PasswordResetDocument(Document):
    account_key: str
    token_hash: str
    created_at: datetime
    expires_at: datetime
    consumed_at: datetime | None = None

    class Settings:
        name = "password_resets"
