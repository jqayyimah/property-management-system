from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: int | None
    actor_role: str
    action: str
    entity_type: str
    entity_id: str | None
    landlord_id: int | None
    description: str | None
    details: dict[str, Any] | list[Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}
