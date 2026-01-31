from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.permissions import require_admin_or_landlord, require_admin
from app.database import get_db
from app.models.landlord import Landlord
from app.schemas.landlord import (
    LandlordCreate,
    LandlordUpdate,
    LandlordResponse,
)

router = APIRouter(
    prefix="/landlords",
    tags=["Landlords"],
)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=LandlordResponse,
)
def create_landlord(
    payload: LandlordCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    existing = (
        db.query(Landlord)
        .filter(Landlord.email == payload.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Landlord with this email already exists",
        )

    landlord = Landlord(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
    )

    db.add(landlord)
    db.commit()
    db.refresh(landlord)

    return landlord


@router.get("/", response_model=list[LandlordResponse])
def list_landlords(
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    return db.query(Landlord).all()


@router.get("/{landlord_id}", response_model=LandlordResponse)
def get_landlord(
    landlord_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    if user["role"] == "LANDLORD" and user["id"] != landlord_id:
        raise HTTPException(status_code=403, detail="Landlord not found")

    return landlord


@router.put("/{landlord_id}", response_model=LandlordResponse)
def update_landlord(
    landlord_id: int,
    payload: LandlordUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    if user["role"] == "LANDLORD" and user["id"] != landlord_id:
        raise HTTPException(status_code=403, detail="Landlord not found")

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

    db.commit()
    db.refresh(landlord)

    return landlord


@router.delete(
    "/{landlord_id}",
    status_code=status.HTTP_200_OK,
)
def delete_landlord(
    landlord_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    db.delete(landlord)
    db.commit()

    return {
        "message": "Landlord deleted successfully",
        "landlord_id": landlord_id,
    }
