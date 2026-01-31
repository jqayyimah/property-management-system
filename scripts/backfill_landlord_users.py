from app.database import SessionLocal
from app.models.landlord import Landlord
from app.models.user import User, UserRole
from app.auth.security import hash_password

DEFAULT_PASSWORD = "ChangeMe123!"  # force reset later

db = SessionLocal()

landlords = db.query(Landlord).all()

for landlord in landlords:
    exists = (
        db.query(User)
        .filter(User.landlord_id == landlord.id)
        .first()
    )

    if exists:
        continue

    user = User(
        email=landlord.email,
        password_hash=hash_password(DEFAULT_PASSWORD),
        role=UserRole.LANDLORD,
        is_active=True,   # or False if admin must re-activate
        landlord_id=landlord.id,
    )

    db.add(user)
    print(f"Created user for landlord {landlord.email}")

db.commit()
db.close()
print("Backfill complete")
