import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config.settings import settings


def send_email(to_email: str, subject: str, body: str):
    print("SMTP_HOST:", settings.SMTP_HOST)
    print("SMTP_PORT:", settings.SMTP_PORT)
    print("SMTP_USERNAME:", settings.SMTP_USERNAME)
    print("SMTP_PASSWORD SET =", bool(settings.SMTP_PASSWORD))
    # DEV fallback (only when SMTP is not configured)
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
        print("=" * 50)
        print("[DEV EMAIL]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(body)
        print("=" * 50)
        return

    try:
        msg = MIMEMultipart()
        from_email = settings.SMTP_FROM_EMAIL
        from_name = settings.SMTP_FROM_NAME or "Property Management App"

        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        # ✅ IMPORTANT FIXES:
        # - timeout to prevent hanging
        # - EHLO before & after STARTTLS (required by Gmail)
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.set_debuglevel(1)  # keep for now
            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )
            server.send_message(msg)

        print(f"✅ Email sent to {to_email}")

    except Exception as e:
        # 🚨 NEVER crash auth flow
        print("❌ Email send failed:", repr(e))
