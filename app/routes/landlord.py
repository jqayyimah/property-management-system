from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.auth.permissions import require_admin
from app.database import get_db
from app.models.landlord import Landlord
from app.models.house import House
from app.models.rent_reminder_log import RentReminderLog
from app.models.tenant import Tenant
from app.models.apartment import Apartment
from app.schemas.landlord import (
    LandlordUpdate,
    LandlordResponse,
)
from app.services import billing_service, reminder_service
from app.services.audit_service import create_audit_log

router = APIRouter(
    prefix="/landlords",
    tags=["Landlords"],
)


def _serialize_landlord(db: Session, landlord: Landlord) -> LandlordResponse:
    snapshot = billing_service.get_current_subscription_snapshot(db, landlord.id)
    usage_start = snapshot.get("started_at")
    usage_end = snapshot.get("ends_at")

    logs_query = (
        db.query(RentReminderLog)
        .join(Tenant, RentReminderLog.tenant_id == Tenant.id)
        .join(Apartment, Tenant.apartment_id == Apartment.id)
        .join(House, Apartment.house_id == House.id)
        .filter(
            House.landlord_id == landlord.id,
            RentReminderLog.status == "SENT",
            RentReminderLog.channel_used.in_(["sms", "whatsapp", "email"]),
        )
    )
    if usage_start is not None:
        logs_query = logs_query.filter(RentReminderLog.sent_at >= usage_start)
    if usage_end is not None:
        logs_query = logs_query.filter(RentReminderLog.sent_at <= usage_end)

    sms_sent_count = 0
    whatsapp_sent_count = 0
    email_sent_count = 0
    sms_cost_total = Decimal("0.00")
    whatsapp_cost_total = Decimal("0.00")
    email_cost_total = Decimal("0.00")

    for log in logs_query.all():
        channel = (log.channel_used or "").lower()
        cost = (
            Decimal(str(log.service_cost))
            if log.service_cost is not None
            else reminder_service.get_channel_service_cost(channel, log.status)
        )
        if channel == "sms":
            sms_sent_count += 1
            sms_cost_total += cost
        elif channel == "whatsapp":
            whatsapp_sent_count += 1
            whatsapp_cost_total += cost
        elif channel == "email":
            email_sent_count += 1
            email_cost_total += cost

    service_cost_total = sms_cost_total + whatsapp_cost_total + email_cost_total
    current_plan_amount = (
        Decimal(str(snapshot["plan"].price_amount))
        if snapshot.get("plan") and snapshot["plan"].price_amount is not None
        else Decimal("0.00")
    )
    upgrade_recommended = False
    upgrade_recommendation_reason = None
    if snapshot["subscription_status"] == "TRIAL_ACTIVE" and service_cost_total >= Decimal("25.00"):
        upgrade_recommended = True
        upgrade_recommendation_reason = "Reminder delivery costs are already building up during the free trial."
    elif (
        snapshot["subscription_status"] == "ACTIVE"
        and current_plan_amount > 0
        and service_cost_total >= (current_plan_amount * Decimal("0.50"))
    ):
        upgrade_recommended = True
        upgrade_recommendation_reason = (
            "Service consumption has reached at least 50% of the current plan value."
        )

    return LandlordResponse(
        id=landlord.id,
        full_name=landlord.full_name,
        email=landlord.email,
        phone=landlord.phone,
        created_at=landlord.created_at,
        user_id=landlord.user.id if landlord.user else None,
        is_active=bool(landlord.user.is_active) if landlord.user else False,
        billing_status=snapshot["subscription_status"],
        billing_access_active=snapshot["subscription_status"] != "TRIAL_EXPIRED",
        current_plan_name=snapshot["plan"].name if snapshot.get("plan") else None,
        plan_ends_at=snapshot.get("ends_at"),
        current_plan_amount=current_plan_amount,
        sms_sent_count=sms_sent_count,
        whatsapp_sent_count=whatsapp_sent_count,
        email_sent_count=email_sent_count,
        sms_cost_total=sms_cost_total,
        whatsapp_cost_total=whatsapp_cost_total,
        email_cost_total=email_cost_total,
        service_cost_total=service_cost_total,
        upgrade_recommended=upgrade_recommended,
        upgrade_recommendation_reason=upgrade_recommendation_reason,
    )


@router.get("/", response_model=list[LandlordResponse])
def list_landlords(
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    landlords = (
        db.query(Landlord)
        .options(selectinload(Landlord.user))
        .all()
    )
    return [_serialize_landlord(db, landlord) for landlord in landlords]


@router.get("/{landlord_id}", response_model=LandlordResponse)
def get_landlord(
    landlord_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    landlord = (
        db.query(Landlord)
        .options(selectinload(Landlord.user))
        .filter(Landlord.id == landlord_id)
        .first()
    )

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    return _serialize_landlord(db, landlord)


@router.put("/{landlord_id}", response_model=LandlordResponse)
def update_landlord(
    landlord_id: int,
    payload: LandlordUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    landlord = (
        db.query(Landlord)
        .options(selectinload(Landlord.user))
        .filter(Landlord.id == landlord_id)
        .first()
    )

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    # Email uniqueness check
    if payload.email:
        existing = (
            db.query(Landlord)
            .filter(
                Landlord.email == payload.email,
                Landlord.id != landlord_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(landlord, field, value)

    create_audit_log(
        db,
        action="LANDLORD_UPDATED",
        entity_type="LANDLORD",
        entity_id=landlord.id,
        actor=user,
        landlord_id=landlord.id,
        description="Landlord profile updated by admin",
        details=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(landlord)

    return _serialize_landlord(db, landlord)


@router.delete("/{landlord_id}", status_code=status.HTTP_200_OK)
def delete_landlord(
    landlord_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    # 🔒 Safety: prevent deleting landlord with houses
    has_houses = (
        db.query(House)
        .filter(House.landlord_id == landlord_id)
        .first()
    )

    if has_houses:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete landlord with existing houses",
        )

    create_audit_log(
        db,
        action="LANDLORD_DELETED",
        entity_type="LANDLORD",
        entity_id=landlord.id,
        actor=user,
        landlord_id=landlord.id,
        description="Landlord deleted by admin",
        details={"email": landlord.email, "full_name": landlord.full_name},
    )
    db.delete(landlord)
    db.commit()

    return {
        "message": "Landlord deleted successfully",
        "landlord_id": landlord_id,
    }
