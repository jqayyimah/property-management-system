from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.landlord import Landlord

from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    LandlordSignup,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)

from app.auth.security import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.auth.permissions import require_admin
from app.auth.dependencies import get_current_user
from app.auth.reset import generate_reset_token

from app.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["Auth"])


# -------------------------------------------------------------------
# LANDLORD SIGNUP
# -------------------------------------------------------------------

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def landlord_signup(
    payload: LandlordSignup,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    landlord = Landlord(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
    )
    db.add(landlord)
    db.flush()  # get landlord.id

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.LANDLORD,
        is_active=False,          # 🔒 admin activation required
        landlord_id=landlord.id,
    )

    db.add(user)
    db.commit()

    return {
        "message": "Signup successful. Await admin activation.",
    }


# -------------------------------------------------------------------
# ACTIVATE LANDLORD (ADMIN ONLY)
# -------------------------------------------------------------------

@router.post("/activate/{user_id}", dependencies=[Depends(require_admin)])
def activate_landlord(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != UserRole.LANDLORD:
        raise HTTPException(404, "Landlord user not found")

    user.is_active = True
    db.commit()

    return {"message": "Landlord activated"}


# -------------------------------------------------------------------
# LOGIN
# -------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # ✅ FIX: serialize Enum properly for JWT
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,       # ← CRITICAL FIX
            "landlord_id": user.landlord_id,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# -------------------------------------------------------------------
# LIST USERS (ADMIN ONLY)
# -------------------------------------------------------------------

@router.get(
    "/users",
    response_model=list[UserResponse],
    dependencies=[Depends(require_admin)],
)
def list_users(
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


# -------------------------------------------------------------------
# FORGOT PASSWORD
# -------------------------------------------------------------------

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        token, expiry = generate_reset_token()
        user.reset_token = token
        user.reset_token_expiry = expiry
        db.commit()

        reset_link = f"http://localhost:3000/reset-password?token={token}"

        send_email(
            to_email=user.email,
            subject="Reset your password",
            body=f"""
            <p>Hello,</p>
            <p>You requested a password reset.</p>
            <p>
                <a href="{reset_link}">
                    Click here to reset your password
                </a>
            </p>
            <p>This link expires in 30 minutes.</p>
            """,
        )

    # Security: always return same response
    return {
        "message": "If the email exists, a password reset link has been sent."
    }


# -------------------------------------------------------------------
# RESET PASSWORD
# -------------------------------------------------------------------

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.reset_token == payload.token)
        .first()
    )

    if (
        not user
        or not user.reset_token_expiry
        or user.reset_token_expiry < datetime.utcnow()
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token",
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None

    db.commit()

    return {
        "message": "Password reset successful. You can now log in."
    }


# -------------------------------------------------------------------
# CHANGE PASSWORD (AUTHENTICATED)
# -------------------------------------------------------------------

@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user["id"]).first()

    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Old password is incorrect",
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


# -------------------------------------------------------------------
# LOGOUT (CLIENT-SIDE JWT INVALIDATION)
# -------------------------------------------------------------------

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    current_user=Depends(get_current_user),
):
    return {
        "message": "Logged out successfully"
    }


# -------------------------------------------------------------------
# CURRENT USER PROFILE
# -------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_current_logged_in_user(
    db: Session = Depends(get_db),
    user_ctx=Depends(get_current_user),
):
    user = (
        db.query(User)
        .filter(User.id == user_ctx["id"])
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user
