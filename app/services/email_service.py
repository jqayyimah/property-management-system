import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import requests

from app.config.settings import settings


def _send_via_resend(to_email: str, subject: str, body: str):
    from_email = settings.RESEND_FROM_EMAIL or settings.SMTP_FROM_EMAIL
    if not from_email:
        raise RuntimeError("RESEND_FROM_EMAIL or SMTP_FROM_EMAIL must be configured")

    response = requests.post(
        f"{settings.RESEND_BASE_URL}/emails",
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": body,
        },
        timeout=15,
    )
    response.raise_for_status()


def _send_via_smtp(to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    from_email = settings.SMTP_FROM_EMAIL
    from_name = settings.SMTP_FROM_NAME or "Property Management App"

    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.login(
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD,
        )
        server.send_message(msg)


def send_email(to_email: str, subject: str, body: str):
    print("RESEND_API_KEY SET =", bool(settings.RESEND_API_KEY))
    print("SMTP_HOST:", settings.SMTP_HOST)
    print("SMTP_PORT:", settings.SMTP_PORT)
    print("SMTP_USERNAME:", settings.SMTP_USERNAME)
    print("SMTP_PASSWORD SET =", bool(settings.SMTP_PASSWORD))
    if settings.RESEND_API_KEY:
        try:
            _send_via_resend(to_email, subject, body)
            print(f"✅ Email sent to {to_email} via Resend")
            return
        except Exception as e:
            print("❌ Resend email send failed:", repr(e))

    # DEV fallback (only when no provider is configured)
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
        print("=" * 50)
        print("[DEV EMAIL]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(body)
        print("=" * 50)
        return

    try:
        _send_via_smtp(to_email, subject, body)
        print(f"✅ Email sent to {to_email} via SMTP")

    except Exception as e:
        # 🚨 NEVER crash auth flow
        print("❌ Email send failed:", repr(e))
