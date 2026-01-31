from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.reset import generate_reset_token
from app.database import get_db
from app.models.user import User, UserRole
from app.models.landlord import Landlord
from app.schemas.auth import LoginRequest, TokenResponse, LandlordSignup, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.auth.security import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.auth.permissions import require_admin
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["Auth"])


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
        is_active=False,        # 🔒 admin must activate
        landlord_id=landlord.id,
    )

    db.add(user)
    db.commit()

    return {
        "message": "Signup successful. Await admin activation.",
    }


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

    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "landlord_id": user.landlord_id,  # ✅ REQUIRED
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get(
    "/users",
    response_model=list[UserResponse],
    dependencies=[Depends(require_admin)],
)
def list_users(
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/forgot-password", status_code=200)
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

        # 🔔 TODO: send email (later)
        print(f"Password reset token for {user.email}: {token}")

    # SAME RESPONSE always
    return {
        "message": "If the email exists, a password reset link has been sent."
    }


@router.post("/reset-password", status_code=200)
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

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None

    db.commit()

    return {
        "message": "Password reset successful. You can now log in."
    }
