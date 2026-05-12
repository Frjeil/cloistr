from __future__ import annotations

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from urllib.parse import urljoin

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class OutboundEmail:
    to_address: str
    subject: str
    body: str


_EMAIL_OUTBOX: list[OutboundEmail] = []


def clear_email_outbox() -> None:
    _EMAIL_OUTBOX.clear()


def get_email_outbox() -> list[OutboundEmail]:
    return [entry for entry in _EMAIL_OUTBOX]


def _build_reset_url(account_key: str, token: str) -> str:
    settings = get_settings()
    base_url = settings.frontend_base_url.rstrip("/") + "/"
    return urljoin(base_url, f"password-reset-confirm/{account_key}/{token}")


def _build_login_url() -> str:
    settings = get_settings()
    return settings.frontend_base_url.rstrip("/") + "/login"


def _send_email(recipient_email: str, subject: str, body: str) -> None:
    settings = get_settings()

    # Dev mode: always queue, never send live
    if settings.env == "development" or not settings.smtp_host:
        _EMAIL_OUTBOX.append(OutboundEmail(to_address=recipient_email, subject=subject, body=body))
        return

    message = EmailMessage()
    message["From"] = settings.mail_from_address
    message["To"] = recipient_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            ) as client:
                if settings.smtp_username and settings.smtp_password:
                    client.login(settings.smtp_username, settings.smtp_password)
                client.send_message(message)
            return

        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        ) as client:
            client.ehlo()
            if settings.smtp_use_tls:
                client.starttls()
                client.ehlo()
            if settings.smtp_username and settings.smtp_password:
                client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
    except Exception:
        logger.exception("Failed to send email to %s", recipient_email)
        # Queue to outbox as fallback so tests / inspection still see it
        _EMAIL_OUTBOX.append(OutboundEmail(to_address=recipient_email, subject=subject, body=body))


def send_password_reset_email(
    *,
    recipient_email: str,
    account_key: str,
    token: str,
    display_name: str | None = None,
) -> str:
    settings = get_settings()
    reset_url = _build_reset_url(account_key, token)
    greeting_name = display_name or recipient_email
    subject = "Reset your Cloistr password"
    body = (
        f"Hello {greeting_name},\n\n"
        "We received a request to reset your Cloistr password.\n\n"
        f"Use this link to choose a new password:\n{reset_url}\n\n"
        "If you did not request this reset, you can ignore this email.\n"
    )

    _send_email(recipient_email, subject, body)
    return reset_url


def send_registration_confirmation_email(
    *,
    recipient_email: str,
    display_name: str | None = None,
) -> str:
    settings = get_settings()
    login_url = _build_login_url()
    greeting_name = display_name or recipient_email
    subject = "Welcome to Cloistr"
    body = (
        f"Hello {greeting_name},\n\n"
        "Your Cloistr account has been created successfully.\n\n"
        f"You can sign in here: {login_url}\n\n"
        "If you did not create this account, you can ignore this email.\n"
    )

    _send_email(recipient_email, subject, body)
    return login_url
