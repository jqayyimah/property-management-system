from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.house import House
from app.auth.dependencies import get_current_user
from app.auth.roles import Role


from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.house import House
from app.auth.dependencies import get_current_user
from app.auth.roles import Role


def verify_landlord_owns_house(
    house_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # ✅ Admin bypass
    if user["role"] == Role.ADMIN:
        return

    house = db.query(House).filter(House.id == house_id).first()

    # 🔒 Hide existence from landlords
    if not house or house.landlord_id != user["landlord_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="House not found",
        )

    return
