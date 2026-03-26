import json
from datetime import datetime, timedelta
from decimal import Decimal
from urllib import request, error

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.billing_plan import BillingPlan
from app.models.house import House
from app.models.landlord import Landlord
from app.models.landlord_subscription import LandlordSubscription
from app.models.payment_transaction import PaymentTransaction
from app.models.user import User


def _utcnow() -> datetime:
    return datetime.utcnow()


def get_plans(db: Session) -> list[BillingPlan]:
    return (
        db.query(BillingPlan)
        .filter(BillingPlan.is_active.is_(True))
        .order_by(BillingPlan.sort_order.asc(), BillingPlan.price_amount.asc())
        .all()
    )


def get_default_plan(db: Session) -> BillingPlan:
    plan = (
        db.query(BillingPlan)
        .filter(BillingPlan.is_default.is_(True), BillingPlan.is_active.is_(True))
        .first()
    )
    if not plan:
        raise HTTPException(status_code=500, detail="Default billing plan is missing")
    return plan


def _get_active_paid_subscription(
    db: Session, landlord_id: int
) -> LandlordSubscription | None:
    now = _utcnow()
    subscription = (
        db.query(LandlordSubscription)
        .join(BillingPlan, LandlordSubscription.plan_id == BillingPlan.id)
        .filter(
            LandlordSubscription.landlord_id == landlord_id,
            LandlordSubscription.status == "ACTIVE",
            BillingPlan.is_default.is_(False),
        )
        .order_by(LandlordSubscription.created_at.desc())
        .first()
    )
    if not subscription:
        return None
    if subscription.ends_at and subscription.ends_at < now:
        subscription.status = "EXPIRED"
        db.commit()
        db.refresh(subscription)
        return None
    return subscription


def get_current_subscription_snapshot(db: Session, landlord_id: int) -> dict:
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()
    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    subscription = _get_active_paid_subscription(db, landlord_id)
    houses_used = db.query(House).filter(House.landlord_id == landlord_id).count()

    if subscription:
        plan = subscription.plan
        house_limit = plan.house_limit
        houses_remaining = max(0, house_limit - houses_used)
        subscription_status = subscription.status
        started_at = subscription.started_at
        ends_at = subscription.ends_at
        provider = subscription.provider
    else:
        plan = get_default_plan(db)
        trial_started_at = landlord.created_at or _utcnow()
        trial_ends_at = (
            trial_started_at + timedelta(days=plan.duration_days)
            if plan.duration_days
            else None
        )
        trial_is_active = bool(trial_ends_at and trial_ends_at >= _utcnow())
        house_limit = plan.house_limit if trial_is_active else 0
        houses_remaining = max(0, house_limit - houses_used)
        subscription_status = "TRIAL_ACTIVE" if trial_is_active else "TRIAL_EXPIRED"
        started_at = trial_started_at
        ends_at = trial_ends_at
        provider = None

    return {
        "plan": plan,
        "house_limit": house_limit,
        "houses_used": houses_used,
        "houses_remaining": houses_remaining,
        "subscription_status": subscription_status,
        "started_at": started_at,
        "ends_at": ends_at,
        "provider": provider,
    }


def ensure_house_capacity(db: Session, landlord_id: int) -> None:
    snapshot = get_current_subscription_snapshot(db, landlord_id)
    if snapshot["subscription_status"] == "TRIAL_EXPIRED":
        raise HTTPException(
            status_code=403,
            detail=(
                "Your free one-month trial has ended. Choose an annual billing plan "
                "to add more houses."
            ),
        )

    if snapshot["houses_used"] >= snapshot["house_limit"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f'Your current "{snapshot["plan"].name}" plan supports up to '
                f'{snapshot["house_limit"]} houses. Upgrade your plan to add more.'
            ),
        )


def has_active_landlord_plan_access(db: Session, landlord_id: int) -> bool:
    snapshot = get_current_subscription_snapshot(db, landlord_id)
    return snapshot["subscription_status"] != "TRIAL_EXPIRED"


def _flutterwave_request(method: str, path: str, payload: dict | None = None) -> dict:
    if not settings.FLW_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Flutterwave secret key is not configured",
        )

    url = f'{settings.FLW_BASE_URL.rstrip("/")}/{path.lstrip("/")}'
    data = None
    headers = {
        "Authorization": f"Bearer {settings.FLW_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=data, method=method.upper(), headers=headers)
    try:
        with request.urlopen(req, timeout=20) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(body)
            message = parsed.get("message") or parsed.get("status") or "Flutterwave request failed"
        except Exception:
            message = body or "Flutterwave request failed"
        raise HTTPException(status_code=502, detail=message) from exc
    except error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Flutterwave",
        ) from exc


def initialize_checkout(
    db: Session,
    *,
    landlord_id: int,
    user: User,
    plan_id: int,
) -> dict:
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()
    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    plan = (
        db.query(BillingPlan)
        .filter(BillingPlan.id == plan_id, BillingPlan.is_active.is_(True))
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Billing plan not found")

    if plan.is_default or Decimal(str(plan.price_amount)) <= 0:
        raise HTTPException(
            status_code=400,
            detail="The free trial plan does not require checkout",
        )

    active_subscription = _get_active_paid_subscription(db, landlord_id)
    if active_subscription and active_subscription.plan_id == plan.id:
        raise HTTPException(
            status_code=400,
            detail="You are already subscribed to this plan",
        )

    tx_ref = f"sub_{landlord_id}_{plan.slug}_{int(_utcnow().timestamp())}"
    payload = {
        "tx_ref": tx_ref,
        "amount": f"{Decimal(str(plan.price_amount)):.2f}",
        "currency": plan.currency or settings.FLW_CURRENCY,
        "redirect_url": f"{settings.FRONTEND_BASE_URL}/billing",
        "payment_options": "card,banktransfer,ussd",
        "customer": {
            "email": user.email,
            "phonenumber": landlord.phone,
            "name": landlord.full_name,
        },
        "customizations": {
            "title": "Property Manager Subscription",
            "description": f"{plan.name} annual subscription",
        },
        "meta": {
            "landlord_id": landlord_id,
            "plan_id": plan.id,
            "plan_slug": plan.slug,
        },
    }
    response = _flutterwave_request("POST", "/payments", payload)
    checkout_link = response.get("data", {}).get("link")
    if response.get("status") != "success" or not checkout_link:
        raise HTTPException(status_code=502, detail="Flutterwave checkout could not be initialized")

    transaction = PaymentTransaction(
        landlord_id=landlord_id,
        plan_id=plan.id,
        provider="FLUTTERWAVE",
        tx_ref=tx_ref,
        status="INITIALIZED",
        amount=plan.price_amount,
        currency=plan.currency,
        checkout_link=checkout_link,
        raw_response=json.dumps(response),
    )
    db.add(transaction)
    db.commit()

    return {"checkout_link": checkout_link, "tx_ref": tx_ref}


def verify_checkout(
    db: Session,
    *,
    landlord_id: int,
    transaction_id: int,
    tx_ref: str,
) -> dict:
    transaction = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.landlord_id == landlord_id,
            PaymentTransaction.tx_ref == tx_ref,
        )
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    if transaction.status == "SUCCEEDED":
        return get_current_subscription_snapshot(db, landlord_id)

    response = _flutterwave_request("GET", f"/transactions/{transaction_id}/verify")
    data = response.get("data") or {}
    payment_status = str(data.get("status", "")).lower()
    response_tx_ref = data.get("tx_ref") or data.get("reference")
    response_amount = Decimal(str(data.get("amount", "0")))
    response_currency = data.get("currency")

    transaction.provider_transaction_id = str(transaction_id)
    transaction.raw_response = json.dumps(response)
    transaction.verified_at = _utcnow()

    if (
        response.get("status") != "success"
        or payment_status not in {"successful", "succeeded", "completed"}
        or response_tx_ref != tx_ref
        or response_amount != Decimal(str(transaction.amount))
        or response_currency != transaction.currency
    ):
        transaction.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    transaction.status = "SUCCEEDED"

    now = _utcnow()
    existing_subscriptions = (
        db.query(LandlordSubscription)
        .filter(
            LandlordSubscription.landlord_id == landlord_id,
            LandlordSubscription.status == "ACTIVE",
        )
        .all()
    )
    for subscription in existing_subscriptions:
        subscription.status = "EXPIRED"
        subscription.ends_at = now

    plan = db.query(BillingPlan).filter(BillingPlan.id == transaction.plan_id).first()
    if not plan:
        raise HTTPException(status_code=500, detail="Subscribed plan no longer exists")

    subscription = LandlordSubscription(
        landlord_id=landlord_id,
        plan_id=plan.id,
        status="ACTIVE",
        provider="FLUTTERWAVE",
        transaction_reference=tx_ref,
        provider_reference=str(data.get("flw_ref") or data.get("id") or transaction_id),
        amount_paid=transaction.amount,
        started_at=now,
        ends_at=now + timedelta(days=plan.duration_days) if plan.duration_days else None,
    )
    db.add(subscription)
    db.commit()

    return get_current_subscription_snapshot(db, landlord_id)
