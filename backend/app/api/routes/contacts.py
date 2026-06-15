from fastapi import APIRouter

from app.core.config import get_settings
from app.core.email import _send_email
from app.schemas.contact import ContactPayload

router = APIRouter()


@router.post("/")
async def contact_form(payload: ContactPayload) -> dict[str, str]:
    settings = get_settings()
    subject = f"Contact form: {payload.name}"
    body = f"From: {payload.name} <{payload.email}>\n\nMessage:\n{payload.message}"
    _send_email(recipient_email=settings.mail_from_address, subject=subject, body=body)
    return {"detail": "Message sent"}
