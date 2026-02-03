from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.permissions import require_admin
from app.database import get_db
from app.models.landlord import Landlord
from app.models.house import House
from app.schemas.landlord import (
    LandlordUpdate,
    LandlordResponse,
)

router = APIRouter(
    prefix="/landlords",
    tags=["Landlords"],
)


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
    user=Depends(require_admin),
):
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()

    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")

    return landlord


@router.put("/{landlord_id}", response_model=LandlordResponse)
def update_landlord(
    landlord_id: int,
    payload: LandlordUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()

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

    db.commit()
    db.refresh(landlord)

    return landlord


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

    db.delete(landlord)
    db.commit()

    return {
        "message": "Landlord deleted successfully",
        "landlord_id": landlord_id,
    }
