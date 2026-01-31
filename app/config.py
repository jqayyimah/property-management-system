from pydantic import BaseModel
import os


class Settings(BaseModel):
    # 🔐 JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # 🧑‍💼 Roles
    ROLE_ADMIN: str = "ADMIN"
    ROLE_LANDLORD: str = "LANDLORD"


settings = Settings()
