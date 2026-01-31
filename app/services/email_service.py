import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config.settings import settings
from app.config.settings import settings

print("SMTP_FROM_NAME =", settings.SMTP_FROM_NAME)


def send_email(to_email: str, subject: str, body: str):
    """
    Sends email via SMTP if configured.
    Falls back to console print in dev.
    """

    # ✅ DEV FALLBACK (no SMTP configured)
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
        print("=" * 50)
        print("[DEV EMAIL]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(body)
        print("=" * 50)
        return

    # ✅ REAL SMTP (Gmail)
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD,
        )
        server.send_message(msg)
