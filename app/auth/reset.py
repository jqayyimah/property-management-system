import secrets
from datetime import datetime, timedelta

RESET_TOKEN_TTL_MINUTES = 30


def generate_reset_token():
    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
    return token, expiry
