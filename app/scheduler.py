from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from app.database import SessionLocal
from app.services.rent_reminder_engine import run_rent_reminders


WAT_TIMEZONE = ZoneInfo("Africa/Lagos")
scheduler = BackgroundScheduler(timezone=WAT_TIMEZONE)


def rent_reminder_job():
    db: Session = SessionLocal()
    try:
        print("⏰ Running rent reminder job...")
        run_rent_reminders(db)
        print("✅ Rent reminder job completed")
    except Exception as e:
        print("❌ Rent reminder job failed:", str(e))
    finally:
        db.close()


def start_scheduler():
    import os

    if os.environ.get("RUN_MAIN") != "true":
        return

    if scheduler.running:
        return

    scheduler.add_job(
        rent_reminder_job,
        CronTrigger(minute="*/15", timezone=WAT_TIMEZONE),
        id="rent_reminder_job",
        replace_existing=True,
    )

    scheduler.start()
    print("📅 Scheduler started (Rent reminders enabled)")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("🛑 Scheduler stopped")
