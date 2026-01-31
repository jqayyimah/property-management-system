from app.database import SessionLocal
from app.models.user import User, UserRole
from app.auth.security import hash_password

db = SessionLocal()

email = "qzyyimahjamiu@gmail.com"
password = "Adelola123#"

if db.query(User).filter(User.email == email).first():
    print("Admin already exists")
    exit()

admin = User(
    email=email,
    password_hash=hash_password(password),
    role=UserRole.ADMIN,
    is_active=True,
)

db.add(admin)
db.commit()
print("Admin created")
print(f"Email: {email}")
