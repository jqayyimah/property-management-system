from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def _normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {
            str(key): _normalize_value(item)
            for key, item in value.items()
            if item is not None
        }
    if isinstance(value, (list, tuple, set)):
        return [_normalize_value(item) for item in value]
    return str(value)


def create_audit_log(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: Any = None,
    actor: dict | None = None,
    actor_role: str | None = None,
    landlord_id: int | None = None,
    description: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    resolved_actor_role = actor_role or (actor.get("role") if actor else None) or "SYSTEM"
    resolved_landlord_id = landlord_id if landlord_id is not None else (
        actor.get("landlord_id") if actor else None
    )

    audit_log = AuditLog(
        actor_user_id=actor.get("id") if actor else None,
        actor_role=resolved_actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        landlord_id=resolved_landlord_id,
        description=description,
        details=_normalize_value(details) if details else None,
    )
    db.add(audit_log)
    return audit_log
