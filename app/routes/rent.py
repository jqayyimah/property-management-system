from app.auth.permissions import require_admin_or_landlord
from fastapi import Depends, HTTPException
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models.rent import Rent
from app.models.tenant import Tenant
from app.auth.permissions import require_admin_or_landlord, require_admin
from app.schemas.rent import (
    RentCreate,
    RentPayment,
    RentResponse,
    RentUpdate,
)

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

    # 🔐 Ownership enforcement
    if user["role"] == "LANDLORD":
        if (
            not tenant.apartment
            or tenant.apartment.house.landlord_id != user["id"]
        ):
            raise HTTPException(403, "Tenant not found")

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
    db.commit()
    db.refresh(rent)
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
            or tenant.apartment.house.landlord_id != user["id"]
        ):
            raise HTTPException(403, "Rent record not found")

    payment = Decimal(str(payload.amount))

    if rent.paid_amount + payment > rent.amount:
        raise HTTPException(400, "Payment exceeds outstanding rent amount")

    rent.paid_amount += payment
    rent.status = "PAID" if rent.paid_amount >= rent.amount else "PARTIAL"

    db.commit()
    db.refresh(rent)
    return rent


@router.get("/", response_model=list[RentResponse])
def list_rents(
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    if user["role"] == "ADMIN":
        return db.query(Rent).all()

    return (
        db.query(Rent)
        .join(Rent.tenant)
        .join(Tenant.apartment)
        .join(Tenant.apartment.house)
        .filter(Tenant.apartment.house.landlord_id == user["id"])
        .all()
    )


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
            or tenant.apartment.house.landlord_id != user["id"]
        ):
            raise HTTPException(403, "Tenant not found")

    return db.query(Rent).filter(Rent.tenant_id == tenant_id).all()


@router.put("/{rent_id}", response_model=RentResponse)
def update_rent(
    rent_id: int,
    payload: RentUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    rent = db.query(Rent).filter(Rent.id == rent_id).first()

    if not rent:
        raise HTTPException(status_code=404, detail="Rent record not found")

    # 🚫 Paid rent is immutable
    if rent.status == "PAID":
        raise HTTPException(
            status_code=400,
            detail="Paid rent cannot be modified",
        )

    data = payload.model_dump(exclude_unset=True)

    # 🚫 Year is immutable for everyone
    if "year" in data:
        raise HTTPException(
            status_code=400,
            detail="Rent year cannot be modified",
        )

    # 🔐 LANDLORD restrictions
    if user["role"] == "LANDLORD":
        tenant = rent.tenant

        if (
            not tenant.apartment
            or tenant.apartment.house.landlord_id != user["id"]
        ):
            # Hide existence
            raise HTTPException(
                status_code=403, detail="Rent record not found")

        # 🚫 Landlord cannot modify dates
        if "start_date" in data or "end_date" in data:
            raise HTTPException(
                status_code=400,
                detail="Rent dates cannot be modified",
            )

        # 🚫 Prevent lowering below paid amount
        if "amount" in data:
            new_amount = Decimal(str(data["amount"]))
            if new_amount < rent.paid_amount:
                raise HTTPException(
                    status_code=400,
                    detail="Rent amount cannot be less than paid amount",
                )

    # ✅ ADMIN extra validation
    if "start_date" in data and "end_date" in data:
        if data["start_date"] >= data["end_date"]:
            raise HTTPException(
                status_code=400,
                detail="start_date must be before end_date",
            )

    if "end_date" in data and data["end_date"] < date.today():
        raise HTTPException(
            status_code=400,
            detail="end_date cannot be in the past",
        )

    # 🔄 Apply updates
    for field, value in data.items():
        setattr(rent, field, value)

    db.commit()
    db.refresh(rent)
    return rent
