from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.permissions import require_admin_or_landlord
from app.database import get_db
from app.models import Apartment, House, Rent, Tenant
from app.models.rent_reminder_log import RentReminderLog
from app.schemas.dashboard import (
    DashboardFinancials,
    DashboardRecentRent,
    DashboardTotals,
    DashboardUpcomingRent,
    LandlordDashboardResponse,
)
from app.schemas.reminder import ReminderLogResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _landlord_id(user: dict) -> int | None:
    return user["landlord_id"] if user["role"] == "LANDLORD" else None


@router.get("/summary", response_model=LandlordDashboardResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    landlord_id = _landlord_id(user)
    today = date.today()
    upcoming_cutoff = today + timedelta(days=30)

    houses_query = db.query(House)
    apartments_query = db.query(Apartment).join(House, Apartment.house_id == House.id)
    tenants_query = (
        db.query(Tenant)
        .outerjoin(Tenant.apartment)
        .outerjoin(Apartment.house)
    )
    rents_query = (
        db.query(Rent)
        .join(Tenant, Rent.tenant_id == Tenant.id)
        .join(Apartment, Tenant.apartment_id == Apartment.id)
        .join(House, Apartment.house_id == House.id)
    )
    reminders_query = db.query(RentReminderLog).order_by(RentReminderLog.sent_at.desc())

    if landlord_id is not None:
        houses_query = houses_query.filter(House.landlord_id == landlord_id)
        apartments_query = apartments_query.filter(House.landlord_id == landlord_id)
        tenants_query = tenants_query.filter(House.landlord_id == landlord_id)
        rents_query = rents_query.filter(House.landlord_id == landlord_id)
        reminders_query = (
            reminders_query
            .join(Tenant, RentReminderLog.tenant_id == Tenant.id)
            .join(Apartment, Tenant.apartment_id == Apartment.id)
            .join(House, Apartment.house_id == House.id)
            .filter(House.landlord_id == landlord_id)
        )

    rents = rents_query.all()

    expected_rent = sum((rent.amount for rent in rents), Decimal("0.00"))
    paid_rent = sum((rent.paid_amount for rent in rents), Decimal("0.00"))
    outstanding_rent = expected_rent - paid_rent

    overdue_rents = [
        rent for rent in rents if rent.status != "PAID" and rent.end_date < today
    ]
    upcoming_rents = [
        rent
        for rent in rents
        if rent.status != "PAID" and today <= rent.end_date <= upcoming_cutoff
    ]
    recent_rents = sorted(rents, key=lambda rent: rent.created_at, reverse=True)[:5]

    recent_rent_rows = [
        DashboardRecentRent(
            id=rent.id,
            tenant_name=rent.tenant.full_name,
            property_name=rent.tenant.apartment.house.name,
            amount=rent.amount,
            status=rent.status,
            end_date=rent.end_date,
        )
        for rent in recent_rents
    ]

    upcoming_due_rows = [
        DashboardUpcomingRent(
            id=rent.id,
            tenant_name=rent.tenant.full_name,
            property_name=rent.tenant.apartment.house.name,
            end_date=rent.end_date,
            days_remaining=(rent.end_date - today).days,
        )
        for rent in sorted(upcoming_rents, key=lambda rent: rent.end_date)[:5]
    ]

    reminder_rows = [
        ReminderLogResponse.model_validate(log)
        for log in reminders_query.limit(5).all()
    ]

    return LandlordDashboardResponse(
        totals=DashboardTotals(
            properties=houses_query.count(),
            apartments=apartments_query.count(),
            vacant_apartments=apartments_query.filter(Apartment.is_vacant.is_(True)).count(),
            tenants=tenants_query.count(),
            overdue_rents=len(overdue_rents),
            upcoming_rents=len(upcoming_rents),
        ),
        financials=DashboardFinancials(
            expected_rent=expected_rent,
            paid_rent=paid_rent,
            outstanding_rent=outstanding_rent,
        ),
        recent_rents=recent_rent_rows,
        upcoming_due_rents=upcoming_due_rows,
        recent_reminders=reminder_rows,
    )
