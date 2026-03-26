from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime
from typing import Optional


class TriggerResponse(BaseModel):
    success: bool
    reminders_sent: int


class ReminderSummary(BaseModel):
    total_upcoming: int
    total_overdue: int
    total_sent_today: int


class RentReminderInfo(BaseModel):
    rent_id: int
    tenant_id: int
    tenant_name: str
    property_name: str
    apartment: str
    end_date: date
    amount: Decimal
    paid_amount: Decimal
    status: str
    last_reminder_type: Optional[str] = None
    last_reminder_sent_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReminderMessageUpdate(BaseModel):
    message: str


class ReminderMessageResponse(BaseModel):
    message: str


class ReminderChannelsUpdate(BaseModel):
    channels: list[str]


class ReminderChannelsResponse(BaseModel):
    channels: list[str]


class ReminderScheduleRule(BaseModel):
    reminder_type: str
    label: str
    days_before_due: int
    enabled: bool
    trigger_time: str


class ReminderScheduleUpdate(BaseModel):
    rules: list[ReminderScheduleRule]


class ReminderScheduleResponse(BaseModel):
    rules: list[ReminderScheduleRule]


class TestReminderRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


class TestReminderResponse(BaseModel):
    message: str
    sent_channels: list[str]


class ReminderLogResponse(BaseModel):
    id: int
    rent_id: int
    tenant_id: int
    tenant_name: Optional[str] = None
    landlord_name: Optional[str] = None
    reminder_type: str
    message: str
    status: str
    channel_used: Optional[str] = None
    service_cost: Optional[Decimal] = None
    cost_currency: Optional[str] = None
    sent_at: datetime

    model_config = {"from_attributes": True}
