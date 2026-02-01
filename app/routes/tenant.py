from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.rent import Rent
from app.database import get_db
from app.models.house import House
from app.models.tenant import Tenant
from app.models.apartment import Apartment
from app.auth.permissions import require_admin_or_landlord, require_admin
from app.schemas.tenant import (
    TenantCreate,
    TenantUpdate,
    TenantResponse,
)

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=TenantResponse,
)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    # 🔍 Email uniqueness
    existing = (
        db.query(Tenant)
        .filter(func.lower(Tenant.email) == payload.email.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409, detail="Tenant with this email already exists")

    apartment = None

    if payload.apartment_id:
        apartment = db.query(Apartment).filter(
            Apartment.id == payload.apartment_id).first()
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")

        # 🔐 Ownership enforcement
        if user["role"] == "LANDLORD" and apartment.house.landlord_id != user["landlord_id"]:
            raise HTTPException(status_code=403, detail="Apartment not found")

        # 🔒 Prevent double assignment
        existing_tenant = (
            db.query(Tenant)
            .filter(Tenant.apartment_id == payload.apartment_id)
            .first()
        )
        if existing_tenant:
            raise HTTPException(
                status_code=409, detail="Apartment is already occupied")

    tenant = Tenant(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        apartment_id=payload.apartment_id,
    )

    if apartment:
        apartment.is_vacant = False

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return tenant


@router.get("/", response_model=list[TenantResponse])
def list_rents(
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    query = (
        db.query(Tenant)
        .join(Rent.tenant)
        .join(Tenant.apartment)
        .join(Apartment.house)
    )

    if user["role"] == "LANDLORD":
        query = query.filter(House.landlord_id == user["landlord_id"])

    return query.all()


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if user["role"] == "LANDLORD":
        if not tenant.apartment or tenant.apartment.house.landlord_id != user["landlord_id"]:
            raise HTTPException(status_code=403, detail="Tenant not found")

    return tenant


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if user["role"] == "LANDLORD":
        if not tenant.apartment or tenant.apartment.house.landlord_id != user["landlord_id"]:
            raise HTTPException(status_code=403, detail="Tenant not found")

    data = payload.model_dump(exclude_unset=True, exclude_none=True)

    if "apartment_id" in data:
        raise HTTPException(
            status_code=400,
            detail="Apartment reassignment is not allowed. Use exit + assign flow.",
        )

    # ✅ Email uniqueness check (ONLY if email is provided)
    if data.get("email") is not None:
        existing = (
            db.query(Tenant)
            .filter(
                func.lower(Tenant.email) == data["email"].lower(),
                Tenant.id != tenant_id,
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=409,
                detail="Email already in use",
            )

    # ✅ Safe partial update
    for field, value in data.items():
        if value is not None:
            setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)

    return tenant


@router.put("/{tenant_id}/exit", status_code=status.HTTP_200_OK)
def tenant_exit(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if user["role"] == "LANDLORD":
        if not tenant.apartment or tenant.apartment.house.landlord_id != user["landlord_id"]:
            raise HTTPException(status_code=403, detail="Tenant not found")

    if not tenant.apartment_id:
        raise HTTPException(
            status_code=400, detail="Tenant is not assigned to any apartment")

    apartment = tenant.apartment
    apartment.is_vacant = True
    tenant.apartment_id = None

    db.commit()

    return {
        "message": "Tenant exited successfully",
        "tenant_id": tenant.id,
        "apartment_vacated": apartment.id,
    }


@router.delete(
    "/{tenant_id}",
    status_code=status.HTTP_200_OK,
)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    with db.no_autoflush:
        if tenant.rents:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete tenant with rent records. Use exit instead.",
            )

    if tenant.apartment:
        tenant.apartment.is_vacant = True

    db.delete(tenant)
    db.commit()

    return {
        "message": "Tenant deleted successfully",
        "tenant_id": tenant_id,
    }
