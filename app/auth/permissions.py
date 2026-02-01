from fastapi import Depends, HTTPException, status
from app.auth.roles import Role
from app.auth.dependencies import get_current_user


def require_admin_or_landlord(user=Depends(get_current_user)):
    if user["role"] not in {Role.ADMIN, Role.LANDLORD}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unathorized access",
        )
    return user


def require_admin(user=Depends(get_current_user)):
    if user["role"] != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unathorized access",
        )
    return user
