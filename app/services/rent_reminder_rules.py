from datetime import date

# ✅ Single source of truth
REMINDER_RULES = {
    "90_DAYS": 90,
    "30_DAYS": 30,
    "7_DAYS": 7,
    "EXPIRY": 0,
    "OVERDUE": -1,   # 👈 ADD THIS
}


def get_due_reminder_types(end_date: date, today: date) -> list[str]:
    days_left = (end_date - today).days
    due = []

    for reminder_type, trigger_days in REMINDER_RULES.items():
        if trigger_days >= 0 and days_left == trigger_days:
            due.append(reminder_type)

        # overdue (only once)
        if reminder_type == "OVERDUE" and days_left < 0:
            due.append("OVERDUE")

    return due
