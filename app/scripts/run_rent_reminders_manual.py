from app.database import SessionLocal
from app.services.rent_reminder_engine import run_rent_reminders

if __name__ == "__main__":
    db = SessionLocal()
    try:
        run_rent_reminders(db)
        print("✅ Manual rent reminder run completed")
    finally:
        db.close()
