from datetime import date, timedelta
from unittest.mock import patch

from app.services.rent_reminder_engine import run_rent_reminders
from app.models.rent import Rent


def test_rent_reminder_sends_email(db_session):
    today = date.today()

    rent = Rent(
        tenant_id=1,
        year=2026,
        start_date=today - timedelta(days=300),
        end_date=today + timedelta(days=90),
        amount=100000,
        paid_amount=0,
        status="UNPAID",
    )

    db_session.add(rent)
    db_session.commit()

    with patch("app.services.rent_reminder_engine.send_email") as mock_email:
        run_rent_reminders(db_session)

        mock_email.assert_called_once()
