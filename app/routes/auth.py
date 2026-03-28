from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import secrets

from app.config.settings import settings
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
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/auth", tags=["Auth"])
EMAIL_VERIFICATION_TTL_HOURS = 24


def _generate_email_verification_token():
    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=EMAIL_VERIFICATION_TTL_HOURS)
    return token, expiry


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
        is_active=False,          # activated on email verification
        is_email_verified=False,
        landlord_id=landlord.id,
    )
    token, expiry = _generate_email_verification_token()
    user.email_verification_token = token
    user.email_verification_token_expiry = expiry

    db.add(user)
    db.flush()
    create_audit_log(
        db,
        action="LANDLORD_SIGNUP",
        entity_type="USER",
        entity_id=user.id,
        actor_role="PUBLIC",
        landlord_id=landlord.id,
        description="New landlord account created during signup",
        details={"email": user.email, "landlord_id": landlord.id},
    )
    db.commit()

    verification_link = f"{settings.FRONTEND_BASE_URL}/auth/verify-email?token={token}"
    send_email(
        to_email=user.email,
        subject="Verify your email address",
        body=f"""
        <p>Hello {payload.full_name},</p>
        <p>Thanks for signing up for Property Management.</p>
        <p>Please verify your email address to complete your landlord signup.</p>
        <p>
            <a href="{verification_link}">
                Verify my email
            </a>
        </p>
        <p>This link expires in {EMAIL_VERIFICATION_TTL_HOURS} hours.</p>
        """,
    )

    return {
        "message": "Signup successful. Check your email to verify your account.",
    }


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(
    token: str,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email_verification_token == token).first()

    if (
        not user
        or not user.email_verification_token_expiry
        or user.email_verification_token_expiry < datetime.utcnow()
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token",
        )

    user.is_email_verified = True
    user.is_active = True
    user.email_verification_token = None
    user.email_verification_token_expiry = None
    create_audit_log(
        db,
        action="EMAIL_VERIFIED",
        entity_type="USER",
        entity_id=user.id,
        actor={"id": user.id, "role": user.role.value, "landlord_id": user.landlord_id},
        landlord_id=user.landlord_id,
        description="User verified email address",
        details={"email": user.email},
    )
    db.commit()

    return {
        "message": "Email verified successfully. You can now log in.",
    }


# -------------------------------------------------------------------
# ACTIVATE LANDLORD (ADMIN ONLY)
# -------------------------------------------------------------------

@router.post("/activate/{user_id}")
def activate_landlord(
    user_id: int,
    db: Session = Depends(get_db),
    actor=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != UserRole.LANDLORD:
        raise HTTPException(404, "Landlord user not found")

    # 🔁 Track previous state
    was_inactive = not user.is_active

    # Activate account
    user.is_active = True
    create_audit_log(
        db,
        action="LANDLORD_ACTIVATED",
        entity_type="USER",
        entity_id=user.id,
        actor=actor,
        landlord_id=user.landlord_id,
        description="Admin activated landlord account",
        details={"email": user.email},
    )
    db.commit()
    db.refresh(user)

    # 📧 Send email ONLY on first activation
    if was_inactive and user.email:
        subject = "Your landlord account has been activated"
        body = f"""
        <p>Hello {user.email},</p>

        <p>Your landlord account has been successfully activated by the administrator.</p>

        <p>You can now log in and start managing your properties.</p>

        <p>
            <a href="{settings.FRONTEND_BASE_URL}/login">
                Click here to log in
            </a>
        </p>

        <p>Regards,<br/>
        Property Management Team</p>
        """

        send_email(
            to_email=user.email,
            subject=subject,
            body=body,
        )

    return {
        "message": "Landlord activated successfully",
        "user_id": user.id,
    }


@router.post("/deactivate/{user_id}")
def deactivate_landlord(
    user_id: int,
    db: Session = Depends(get_db),
    actor=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user or user.role != UserRole.LANDLORD:
        raise HTTPException(404, "Landlord user not found")

    user.is_active = False
    create_audit_log(
        db,
        action="LANDLORD_DEACTIVATED",
        entity_type="USER",
        entity_id=user.id,
        actor=actor,
        landlord_id=user.landlord_id,
        description="Admin deactivated landlord account",
        details={"email": user.email},
    )
    db.commit()
    db.refresh(user)

    return {
        "message": "Landlord deactivated successfully",
        "user_id": user.id,
    }

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

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in",
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

    create_audit_log(
        db,
        action="LOGIN_SUCCESS",
        entity_type="USER",
        entity_id=user.id,
        actor={"id": user.id, "role": user.role.value, "landlord_id": user.landlord_id},
        landlord_id=user.landlord_id,
        description="User logged in successfully",
        details={"email": user.email},
    )
    db.commit()

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
    print(f"[FORGOT PASSWORD] Email requested for: {payload.email}")
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        token, expiry = generate_reset_token()
        user.reset_token = token
        user.reset_token_expiry = expiry
        create_audit_log(
            db,
            action="PASSWORD_RESET_REQUESTED",
            entity_type="USER",
            entity_id=user.id,
            actor={"id": user.id, "role": user.role.value, "landlord_id": user.landlord_id},
            landlord_id=user.landlord_id,
            description="User requested password reset",
            details={"email": user.email},
        )
        db.commit()

        reset_link = f"{settings.FRONTEND_BASE_URL}/auth/reset-password?token={token}"

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
    create_audit_log(
        db,
        action="PASSWORD_RESET_COMPLETED",
        entity_type="USER",
        entity_id=user.id,
        actor={"id": user.id, "role": user.role.value, "landlord_id": user.landlord_id},
        landlord_id=user.landlord_id,
        description="User completed password reset",
        details={"email": user.email},
    )

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
    create_audit_log(
        db,
        action="PASSWORD_CHANGED",
        entity_type="USER",
        entity_id=user.id,
        actor=current_user,
        landlord_id=user.landlord_id,
        description="Authenticated user changed password",
        details={"email": user.email},
    )
    db.commit()

    return {"message": "Password changed successfully"}


# -------------------------------------------------------------------
# LOGOUT (CLIENT-SIDE JWT INVALIDATION)
# -------------------------------------------------------------------

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    create_audit_log(
        db,
        action="LOGOUT",
        entity_type="USER",
        entity_id=current_user["id"],
        actor=current_user,
        landlord_id=current_user.get("landlord_id"),
        description="User logged out",
    )
    db.commit()
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
        .options(joinedload(User.landlord))
        .filter(User.id == user_ctx["id"])
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    full_name = None
    first_name = None

    if user.landlord and user.landlord.full_name:
        full_name = user.landlord.full_name
        first_name = full_name.split(" ")[0]

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "is_email_verified": user.is_email_verified,
        "landlord_id": user.landlord_id,
        "full_name": full_name,
        "first_name": first_name,
    }


@router.get("/reset-password")
def reset_page(token: str):
    return {"message": "Token received", "token": token}
