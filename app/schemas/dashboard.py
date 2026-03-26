from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.reminder import ReminderLogResponse


class DashboardTotals(BaseModel):
    properties: int
    apartments: int
    vacant_apartments: int
    tenants: int
    overdue_rents: int
    upcoming_rents: int


class DashboardFinancials(BaseModel):
    expected_rent: Decimal
    paid_rent: Decimal
    outstanding_rent: Decimal


class DashboardRecentRent(BaseModel):
    id: int
    tenant_name: str
    property_name: str
    amount: Decimal
    status: str
    end_date: date


class DashboardUpcomingRent(BaseModel):
    id: int
    tenant_name: str
    property_name: str
    end_date: date
    days_remaining: int


class LandlordDashboardResponse(BaseModel):
    totals: DashboardTotals
    financials: DashboardFinancials
    recent_rents: list[DashboardRecentRent]
    upcoming_due_rents: list[DashboardUpcomingRent]
    recent_reminders: list[ReminderLogResponse]
