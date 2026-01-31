from datetime import date, timedelta

from app.services.rent_reminder_rules import get_due_reminder_types


def test_90_days_reminder():
    today = date.today()
    end_date = today + timedelta(days=90)

    reminders = get_due_reminder_types(end_date, today)

    assert "90_DAYS" in reminders


def test_30_days_reminder():
    today = date.today()
    end_date = today + timedelta(days=30)

    reminders = get_due_reminder_types(end_date, today)

    assert "30_DAYS" in reminders


def test_7_days_reminder():
    today = date.today()
    end_date = today + timedelta(days=7)

    reminders = get_due_reminder_types(end_date, today)

    assert "7_DAYS" in reminders


def test_expiry_day_reminder():
    today = date.today()
    end_date = today

    reminders = get_due_reminder_types(end_date, today)

    assert "EXPIRY" in reminders


def test_no_reminder_for_random_day():
    today = date.today()
    end_date = today + timedelta(days=45)

    reminders = get_due_reminder_types(end_date, today)

    assert reminders == []
