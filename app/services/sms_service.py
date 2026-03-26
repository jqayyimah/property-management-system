"""
SMS delivery via Termii.

Termii docs: https://developers.termii.com/messaging
Channel: "dnd" routes through DND-registered numbers (recommended for Nigerian numbers).
         "generic" is a fallback channel.

Dev mode: when TERMII_API_KEY is not set, messages are printed to stdout and
          the function returns True so the rest of the flow is unaffected.
"""

import re
import logging
import requests

from app.config.settings import settings

logger = logging.getLogger(__name__)

TERMII_SEND_URL = "https://api.ng.termii.com/api/sms/send"


def normalize_phone(phone: str) -> str:
    """
    Normalize a Nigerian phone number to Termii's expected format.

    Termii expects the number without a leading '+':
        2348012345678  ✔
       +2348012345678  ✗
        08012345678    ✗  (local format)

    Handles:
        08XXXXXXXXX  →  2348XXXXXXXXX
        07XXXXXXXXX  →  2347XXXXXXXXX
        09XXXXXXXXX  →  2349XXXXXXXXX
       +234XXXXXXXXX →  234XXXXXXXXX
        234XXXXXXXXX →  234XXXXXXXXX  (already correct)
    """
    # Strip whitespace, dashes, parentheses
    phone = re.sub(r"[\s\-()]", "", phone)

    # Remove leading +
    if phone.startswith("+"):
        phone = phone[1:]

    # Convert local 11-digit Nigerian format: 0XXXXXXXXXX → 234XXXXXXXXX
    if re.match(r"^0[7-9]\d{9}$", phone):
        phone = "234" + phone[1:]

    return phone


def send_sms(phone_number: str, message: str) -> bool:
    """
    Send an SMS via Termii.

    Returns True on success, False on any failure.
    Never raises — callers must not crash on notification failure.
    """
    if not settings.TERMII_API_KEY:
        # Dev / unconfigured: print and pretend success
        logger.info("[DEV SMS] To: %s | %s", phone_number, message[:60])
        print(f"[DEV SMS] To={phone_number} | {message[:80]}")
        return True

    normalized = normalize_phone(phone_number)

    payload = {
        "to": normalized,
        "from": settings.TERMII_SENDER_ID,
        "sms": message,
        "type": "plain",
        "channel": "dnd",
        "api_key": settings.TERMII_API_KEY,
    }

    try:
        resp = requests.post(TERMII_SEND_URL, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") == "ok":
            logger.info("✅ SMS sent to %s (msg_id=%s)", normalized, data.get("message_id"))
            return True
        else:
            logger.error("❌ SMS rejected for %s: %s", normalized, data)
            return False

    except requests.exceptions.Timeout:
        logger.error("❌ SMS timeout for %s", normalized)
        return False
    except requests.exceptions.RequestException as exc:
        logger.error("❌ SMS request error for %s: %s", normalized, exc)
        return False
    except Exception as exc:
        logger.error("❌ SMS unexpected error for %s: %s", normalized, exc)
        return False
