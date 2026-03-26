import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()  # MUST be first


class Settings(BaseModel):
    # 🔐 JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # 🧑‍💼 Roles
    ROLE_ADMIN: str = "ADMIN"
    ROLE_LANDLORD: str = "LANDLORD"

    # 🌍 Frontend
    FRONTEND_BASE_URL: str

    # 📧 Email (SMTP)
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str | None = None

    # 📲 Termii messaging
    TERMII_API_KEY: str | None = None
    TERMII_SENDER_ID: str | None = None
    TERMII_WHATSAPP_SENDER_ID: str | None = None

    # 💳 Flutterwave billing
    FLW_SECRET_KEY: str | None = None
    FLW_PUBLIC_KEY: str | None = None
    FLW_BASE_URL: str = "https://api.flutterwave.com/v3"
    FLW_CURRENCY: str = "NGN"


settings = Settings(
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY"),
    FRONTEND_BASE_URL=os.getenv("FRONTEND_BASE_URL"),
    SMTP_HOST=os.getenv("SMTP_HOST"),
    SMTP_PORT=int(os.getenv("SMTP_PORT")) if os.getenv("SMTP_PORT") else None,
    SMTP_USERNAME=os.getenv("SMTP_USERNAME"),
    SMTP_PASSWORD=os.getenv("SMTP_PASSWORD"),
    SMTP_FROM_EMAIL=os.getenv("SMTP_FROM_EMAIL"),
    SMTP_FROM_NAME=os.getenv("SMTP_FROM_NAME"),
    TERMII_API_KEY=os.getenv("TERMII_API_KEY"),
    TERMII_SENDER_ID=os.getenv("TERMII_SENDER_ID"),
    TERMII_WHATSAPP_SENDER_ID=os.getenv("TERMII_WHATSAPP_SENDER_ID"),
    FLW_SECRET_KEY=os.getenv("FLW_SECRET_KEY"),
    FLW_PUBLIC_KEY=os.getenv("FLW_PUBLIC_KEY"),
    FLW_BASE_URL=os.getenv("FLW_BASE_URL") or "https://api.flutterwave.com/v3",
    FLW_CURRENCY=os.getenv("FLW_CURRENCY") or "NGN",
)

if not settings.JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set in environment")
