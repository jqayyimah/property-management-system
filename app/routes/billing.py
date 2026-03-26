from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.billing import (
    BillingCheckoutRequest,
    BillingCheckoutResponse,
    BillingPlanResponse,
    BillingSubscriptionResponse,
    BillingVerifyRequest,
)
from app.services import billing_service
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/billing", tags=["Billing"])


def _require_landlord(user: dict) -> int:
    if user["role"] != "LANDLORD" or not user.get("landlord_id"):
        raise HTTPException(status_code=403, detail="Billing is available to landlords only")
    return user["landlord_id"]


@router.get("/plans", response_model=list[BillingPlanResponse])
def list_billing_plans(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return billing_service.get_plans(db)


@router.get("/subscription", response_model=BillingSubscriptionResponse)
def get_current_subscription(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    landlord_id = _require_landlord(user)
    return BillingSubscriptionResponse(
        **billing_service.get_current_subscription_snapshot(db, landlord_id)
    )


@router.post("/checkout", response_model=BillingCheckoutResponse)
def initialize_billing_checkout(
    body: BillingCheckoutRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    landlord_id = _require_landlord(user)
    db_user = db.query(User).filter(User.id == user["id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return BillingCheckoutResponse(
        **billing_service.initialize_checkout(
            db,
            landlord_id=landlord_id,
            user=db_user,
            plan_id=body.plan_id,
        )
    )


@router.post("/verify", response_model=BillingSubscriptionResponse)
def verify_billing_checkout(
    body: BillingVerifyRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    landlord_id = _require_landlord(user)
    snapshot = billing_service.verify_checkout(
        db,
        landlord_id=landlord_id,
        transaction_id=body.transaction_id,
        tx_ref=body.tx_ref,
    )
    create_audit_log(
        db,
        action="BILLING_CHECKOUT_VERIFIED",
        entity_type="SUBSCRIPTION",
        entity_id=body.transaction_id or body.tx_ref,
        actor=user,
        landlord_id=landlord_id,
        description="Billing checkout verified successfully",
        details={
            "transaction_id": body.transaction_id,
            "tx_ref": body.tx_ref,
            "plan_name": snapshot["plan"].name if snapshot.get("plan") else None,
            "subscription_status": snapshot["subscription_status"],
        },
    )
    db.commit()
    return BillingSubscriptionResponse(
        **snapshot
    )
