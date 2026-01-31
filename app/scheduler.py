from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.services.rent_reminder_engine import run_rent_reminders

scheduler = BackgroundScheduler()


def start_scheduler():
    scheduler.add_job(
        func=run_job,
        trigger="cron",
        hour=9,   # every day at 9am
        minute=0,
        id="rent_reminder_job",
        replace_existing=True,
    )
    scheduler.start()


def shutdown_scheduler():
    scheduler.shutdown()


def run_job():
    db = SessionLocal()
    try:
        run_rent_reminders(db)
    finally:
        db.close()
