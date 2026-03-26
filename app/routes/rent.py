from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.auth.permissions import require_admin_or_landlord
from app.models import Rent, Tenant, Apartment, House
from app.schemas.rent import (
    RentCreate,
    RentPayment,
    RentUpdate,
    RentResponse,
)
from app.services.audit_service import create_audit_log


router = APIRouter(prefix="/rents", tags=["Rents"])


@router.post(
    "/",
    response_model=RentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_rent(
    payload: RentCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    tenant = db.query(Tenant).filter(Tenant.id == payload.tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    if user["role"] == "LANDLORD":
        if (
            not tenant.apartment
            or tenant.apartment.house.landlord_id != user["landlord_id"]
        ):
            raise HTTPException(404, "Tenant not found")

    if payload.amount <= 0:
        raise HTTPException(400, "Rent amount must be greater than zero")

    if tenant.apartment_id is None:
        raise HTTPException(400, "Tenant is not assigned to any apartment")

    if payload.start_date >= payload.end_date:
        raise HTTPException(400, "start_date must be before end_date")

    if payload.start_date.year != payload.year:
        raise HTTPException(400, "Rent year must match start_date year")

    existing = (
        db.query(Rent)
        .filter(
            Rent.tenant_id == tenant.id,
            Rent.year == payload.year,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            409, f"Rent already exists for year {payload.year}")

    rent = Rent(
        tenant_id=tenant.id,
        year=payload.year,
        start_date=payload.start_date,
        end_date=payload.end_date,
        amount=payload.amount,
        paid_amount=Decimal("0.00"),
        status="UNPAID",
    )

    db.add(rent)
    db.flush()
    create_audit_log(
        db,
        action="RENT_CREATED",
        entity_type="RENT",
        entity_id=rent.id,
        actor=user,
        landlord_id=tenant.apartment.house.landlord_id,
        description="Rent record created",
        details={
            "tenant_id": tenant.id,
            "year": payload.year,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "amount": payload.amount,
        },
    )
    db.commit()
    db.refresh(rent)

    # ✅ Attach property
    rent.property = tenant.apartment.house

    return rent


@router.put("/{rent_id}/pay", response_model=RentResponse)
def pay_rent(
    rent_id: int,
    payload: RentPayment,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    rent = db.query(Rent).filter(Rent.id == rent_id).first()
    if not rent:
        raise HTTPException(404, "Rent record not found")

    if user["role"] == "LANDLORD":
        tenant = rent.tenant
        if (
            not tenant.apartment
            or tenant.apartment.house.landlord_id != user["landlord_id"]
        ):
            raise HTTPException(404, "Rent record not found")

    if rent.status == "PAID":
        raise HTTPException(400, "Rent is already fully paid")

    payment = Decimal(str(payload.amount))

    if rent.paid_amount + payment > rent.amount:
        raise HTTPException(400, "Payment exceeds outstanding rent amount")

    rent.paid_amount += payment
    rent.status = "PAID" if rent.paid_amount >= rent.amount else "PARTIAL"

    create_audit_log(
        db,
        action="RENT_PAYMENT_RECORDED",
        entity_type="RENT",
        entity_id=rent.id,
        actor=user,
        landlord_id=rent.tenant.apartment.house.landlord_id,
        description="Rent payment recorded",
        details={
            "payment_amount": payload.amount,
            "paid_amount": rent.paid_amount,
            "status": rent.status,
        },
    )
    db.commit()
    db.refresh(rent)

    rent.property = rent.tenant.apartment.house
    return rent


@router.get("/", response_model=list[RentResponse])
def list_rents(
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    query = (
        db.query(Rent)
        .options(
            joinedload(Rent.tenant)
            .joinedload(Tenant.apartment)
            .joinedload(Apartment.house)
        )
        .join(Tenant, Rent.tenant_id == Tenant.id)
        .join(Apartment, Tenant.apartment_id == Apartment.id)
        .join(House, Apartment.house_id == House.id)
    )

    if user["role"] == "LANDLORD":
        query = query.filter(House.landlord_id == user["landlord_id"])

    rents = query.all()

    # Attach property
    for rent in rents:
        rent.property = rent.tenant.apartment.house

    return rents


@router.get("/tenant/{tenant_id}", response_model=list[RentResponse])
def tenant_rents(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    if user["role"] == "LANDLORD":
        if (
            not tenant.apartment
            or tenant.apartment.house.landlord_id != user["landlord_id"]
        ):
            raise HTTPException(404, "Tenant not found")

    rents = db.query(Rent).filter(Rent.tenant_id == tenant_id).all()

    for rent in rents:
        rent.property = tenant.apartment.house

    return rents


@router.put("/{rent_id}", response_model=RentResponse)
def update_rent(
    rent_id: int,
    payload: RentUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    query = (
        db.query(Rent)
        .join(Tenant)
        .join(Apartment)
        .join(House)
        .filter(Rent.id == rent_id)
    )

    if user["role"] == "LANDLORD":
        query = query.filter(House.landlord_id == user["landlord_id"])

    rent = query.first()
    if not rent:
        raise HTTPException(404, "Rent record not found")

    if rent.status == "PAID":
        raise HTTPException(400, "Paid rent cannot be modified")

    data = payload.model_dump(exclude_unset=True)

    if "year" in data:
        raise HTTPException(400, "Rent year cannot be modified")

    if user["role"] == "LANDLORD":
        if "start_date" in data or "end_date" in data:
            raise HTTPException(400, "Rent dates cannot be modified")

        if "amount" in data:
            if Decimal(str(data["amount"])) < rent.paid_amount:
                raise HTTPException(
                    400, "Rent amount cannot be less than paid amount"
                )

    if "start_date" in data and "end_date" in data:
        if data["start_date"] >= data["end_date"]:
            raise HTTPException(400, "start_date must be before end_date")

    if "end_date" in data and data["end_date"] < date.today():
        raise HTTPException(400, "end_date cannot be in the past")

    for field, value in data.items():
        setattr(rent, field, value)

    create_audit_log(
        db,
        action="RENT_UPDATED",
        entity_type="RENT",
        entity_id=rent.id,
        actor=user,
        landlord_id=rent.tenant.apartment.house.landlord_id,
        description="Rent record updated",
        details=data,
    )
    db.commit()
    db.refresh(rent)

    rent.property = rent.tenant.apartment.house
    return rent
