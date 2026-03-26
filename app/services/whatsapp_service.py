"""
WhatsApp delivery via Termii.

Termii routes WhatsApp messages through the same Send Message API as SMS,
using channel="whatsapp". The sender ID must be a Termii-approved
WhatsApp sender (usually a business phone number or brand name).

Dev mode: when TERMII_API_KEY is not set, messages are printed to stdout.
"""

import logging
import requests

from app.config.settings import settings
from app.services.sms_service import normalize_phone  # shared util

logger = logging.getLogger(__name__)

TERMII_SEND_URL = "https://api.ng.termii.com/api/sms/send"


def send_whatsapp(phone_number: str, message: str) -> bool:
    """
    Send a WhatsApp message via Termii.

    Returns True on success, False on any failure.
    Never raises.
    """
    if not settings.TERMII_API_KEY:
        logger.info("[DEV WHATSAPP] To: %s | %s", phone_number, message[:60])
        print(f"[DEV WHATSAPP] To={phone_number} | {message[:80]}")
        return True

    normalized = normalize_phone(phone_number)

    payload = {
        "to": normalized,
        "from": settings.TERMII_WHATSAPP_SENDER_ID,
        "sms": message,
        "type": "plain",
        "channel": "whatsapp",
        "api_key": settings.TERMII_API_KEY,
    }

    try:
        resp = requests.post(TERMII_SEND_URL, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") == "ok":
            logger.info("✅ WhatsApp sent to %s (msg_id=%s)", normalized, data.get("message_id"))
            return True
        else:
            logger.error("❌ WhatsApp rejected for %s: %s", normalized, data)
            return False

    except requests.exceptions.Timeout:
        logger.error("❌ WhatsApp timeout for %s", normalized)
        return False
    except requests.exceptions.RequestException as exc:
        logger.error("❌ WhatsApp request error for %s: %s", normalized, exc)
        return False
    except Exception as exc:
        logger.error("❌ WhatsApp unexpected error for %s: %s", normalized, exc)
        return False
