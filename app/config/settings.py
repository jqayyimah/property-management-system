from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    # 🔐 JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # 🧑‍💼 Roles
    ROLE_ADMIN: str = "ADMIN"
    ROLE_LANDLORD: str = "LANDLORD"

    # 📧 Email (SMTP)
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str | None = None   # ✅ MOVED INSIDE


settings = Settings(
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "CHANGE_ME_SECRET"),
    SMTP_HOST=os.getenv("SMTP_HOST"),
    SMTP_PORT=int(os.getenv("SMTP_PORT")) if os.getenv("SMTP_PORT") else None,
    SMTP_USERNAME=os.getenv("SMTP_USERNAME"),
    SMTP_PASSWORD=os.getenv("SMTP_PASSWORD"),
    SMTP_FROM_EMAIL=os.getenv("SMTP_FROM_EMAIL"),
    SMTP_FROM_NAME=os.getenv("SMTP_FROM_NAME"),
)
