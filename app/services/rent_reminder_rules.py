from datetime import date

# Single source of truth for reminder trigger intervals.
# Key   = reminder_type string stored in DB
# Value = days before end_date (0 = due today, negative = overdue)
REMINDER_RULES: dict[str, int] = {
    "7_DAYS": 7,
    "3_DAYS": 3,
    "DUE_TODAY": 0,
    "OVERDUE": -1,  # deduplication table caps this to once per rent
}


def get_due_reminder_types(end_date: date, today: date) -> list[str]:
    """Return the reminder types that should fire for this rent today."""
    days_left = (end_date - today).days
    due: list[str] = []

    for reminder_type, trigger_days in REMINDER_RULES.items():
        if reminder_type == "OVERDUE":
            if days_left < 0:
                due.append("OVERDUE")
        else:
            if days_left == trigger_days:
                due.append(reminder_type)

    return due
