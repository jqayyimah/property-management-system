from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.permissions import require_admin_or_landlord, require_admin
from app.database import get_db
from app.models.apartment import Apartment
from app.models.house import House
from app.schemas.apartment import (
    ApartmentCreate,
    ApartmentUpdate,
    ApartmentResponse,
)

router = APIRouter(
    prefix="/apartments",
    tags=["Apartments"],
)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ApartmentResponse,
)
def create_apartment(
    payload: ApartmentCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    house = db.query(House).filter(House.id == payload.house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")

    # 🔐 Ownership enforcement
    if user["role"] == "LANDLORD" and house.landlord_id != user["id"]:
        raise HTTPException(status_code=403, detail="House not found")

    apartment = Apartment(
        unit_number=payload.unit_number,
        house_id=payload.house_id,
    )

    db.add(apartment)
    db.commit()
    db.refresh(apartment)

    return apartment


@router.get("/", response_model=list[ApartmentResponse])
def list_apartments(
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    if user["role"] == "ADMIN":
        return db.query(Apartment).all()

    return (
        db.query(Apartment)
        .join(House)
        .filter(House.landlord_id == user["id"])
        .all()
    )


@router.get("/{apartment_id}", response_model=ApartmentResponse)
def get_apartment(
    apartment_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    apartment = (
        db.query(Apartment)
        .join(House)
        .filter(Apartment.id == apartment_id)
        .first()
    )

    if not apartment:
        raise HTTPException(status_code=404, detail="Apartment not found")

    if user["role"] == "LANDLORD" and apartment.house.landlord_id != user["id"]:
        raise HTTPException(status_code=403, detail="Apartment not found")

    return apartment


@router.put(
    "/{apartment_id}",
    response_model=ApartmentResponse,
)
def update_apartment(
    apartment_id: int,
    payload: ApartmentUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    apartment = (
        db.query(Apartment)
        .join(House)
        .filter(Apartment.id == apartment_id)
        .first()
    )

    if not apartment:
        raise HTTPException(status_code=404, detail="Apartment not found")

    if user["role"] == "LANDLORD" and apartment.house.landlord_id != user["id"]:
        raise HTTPException(status_code=403, detail="Apartment not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(apartment, field, value)

    db.commit()
    db.refresh(apartment)

    return apartment


@router.delete(
    "/{apartment_id}",
    status_code=status.HTTP_200_OK,
)
def delete_apartment(
    apartment_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    apartment = db.query(Apartment).filter(
        Apartment.id == apartment_id).first()

    if not apartment:
        raise HTTPException(status_code=404, detail="Apartment not found")

    # 🔒 Safety checks (unchanged)
    if apartment.tenant is not None:
        raise HTTPException(
            status_code=409,
            detail="Apartment is currently occupied by a tenant",
        )

    if not apartment.is_vacant:
        raise HTTPException(
            status_code=409,
            detail="Apartment is not vacant",
        )

    db.delete(apartment)
    db.commit()

    return {
        "message": "Apartment deleted successfully",
        "apartment_id": apartment_id,
    }
