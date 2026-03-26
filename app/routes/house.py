from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.permissions import require_admin_or_landlord, require_admin
from app.database import get_db
from app.models.house import House
from app.models.landlord import Landlord
from app.schemas.house import HouseCreate, HouseUpdate, HouseResponse
from app.services import billing_service
from app.services.audit_service import create_audit_log

router = APIRouter(
    prefix="/houses",
    tags=["Houses"],
)


@router.post("/", status_code=201, response_model=HouseResponse)
def create_house(
    payload: HouseCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    # 🔒 ADMIN can create for any landlord
    if user["role"] == "ADMIN":
        landlord_id = payload.landlord_id

    # 🔒 LANDLORD can only create for self
    else:
        if not user.get("landlord_id"):
            raise HTTPException(
                status_code=403,
                detail="Landlord account not activated",
            )
        landlord_id = user["landlord_id"]

    landlord = db.query(Landlord).filter(Landlord.id == landlord_id).first()
    if not landlord:
        raise HTTPException(404, "Invalid landlord")

    if user["role"] == "LANDLORD":
        billing_service.ensure_house_capacity(db, landlord_id)

    house = House(
        name=payload.name,
        address=payload.address,
        landlord_id=landlord_id,
    )

    db.add(house)
    db.flush()
    create_audit_log(
        db,
        action="HOUSE_CREATED",
        entity_type="HOUSE",
        entity_id=house.id,
        actor=user,
        landlord_id=landlord_id,
        description="House created",
        details={"name": house.name, "address": house.address},
    )
    db.commit()
    db.refresh(house)
    return house


@router.get("/", response_model=list[HouseResponse])
def list_houses(
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    if user["role"] == "ADMIN":
        return db.query(House).all()

    return (
        db.query(House)
        .filter(House.landlord_id == user["landlord_id"])
        .all()
    )


@router.get("/{house_id}", response_model=HouseResponse)
def get_house(
    house_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    house = db.query(House).filter(House.id == house_id).first()

    if not house:
        raise HTTPException(404, "House not found")

    if user["role"] == "LANDLORD" and house.landlord_id != user["landlord_id"]:
        raise HTTPException(404, "House not found")

    return house


@router.put("/{house_id}", response_model=HouseResponse)
def update_house(
    house_id: int,
    payload: HouseUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin_or_landlord),
):
    house = db.query(House).filter(House.id == house_id).first()

    if not house:
        raise HTTPException(404, "House not found")

    if user["role"] == "LANDLORD" and house.landlord_id != user["landlord_id"]:
        raise HTTPException(404, "House not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(house, field, value)

    create_audit_log(
        db,
        action="HOUSE_UPDATED",
        entity_type="HOUSE",
        entity_id=house.id,
        actor=user,
        landlord_id=house.landlord_id,
        description="House updated",
        details=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(house)
    return house


@router.delete(
    "/{house_id}",
    dependencies=[Depends(require_admin)],
    status_code=status.HTTP_200_OK,
)
def delete_house(
    house_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    house = db.query(House).filter(House.id == house_id).first()

    if not house:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="House not found",
        )

    create_audit_log(
        db,
        action="HOUSE_DELETED",
        entity_type="HOUSE",
        entity_id=house.id,
        actor=user,
        landlord_id=house.landlord_id,
        description="House deleted",
        details={"name": house.name},
    )
    db.delete(house)
    db.commit()

    return {
        "message": "House deleted successfully",
        "house_id": house_id,
    }
