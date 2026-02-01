import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config.settings import settings


def send_email(to_email: str, subject: str, body: str):
    # DEV fallback
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

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.set_debuglevel(1)  # remove later in prod
            server.starttls()
            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )
            server.send_message(msg)

    except Exception as e:
        # 🚨 NEVER crash auth flow
        print("Email send failed:", str(e))
