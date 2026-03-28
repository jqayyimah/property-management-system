from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv
from decimal import Decimal
import os

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def _ensure_index(table_name: str, index_name: str, columns_sql: str) -> None:
    inspector = inspect(engine)
    existing_indexes = {index["name"] for index in inspector.get_indexes(table_name)}
    if index_name in existing_indexes:
        return

    with engine.begin() as connection:
        connection.execute(
            text(f"CREATE INDEX {index_name} ON {table_name} ({columns_sql})")
        )


def ensure_schema_updates():
    """
    Apply lightweight schema fixes for deployments that do not use migrations.
    """
    inspector = inspect(engine)

    if "rent_reminder_logs" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("rent_reminder_logs")}
        with engine.begin() as connection:
            if "channel_used" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE rent_reminder_logs "
                        "ADD COLUMN channel_used VARCHAR(20) NULL"
                    )
                )
            if "service_cost" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE rent_reminder_logs "
                        "ADD COLUMN service_cost DECIMAL(12, 2) NULL DEFAULT 0"
                    )
                )
            if "cost_currency" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE rent_reminder_logs "
                        "ADD COLUMN cost_currency VARCHAR(10) NULL DEFAULT 'NGN'"
                    )
                )

    if "users" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as connection:
            if "is_email_verified" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT TRUE"
                    )
                )
            if "email_verification_token" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN email_verification_token VARCHAR(255) NULL"
                    )
                )
            if "email_verification_token_expiry" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN email_verification_token_expiry DATETIME NULL"
                    )
                )

    if "houses" in inspector.get_table_names():
        _ensure_index("houses", "ix_houses_landlord_id", "landlord_id")

    if "apartments" in inspector.get_table_names():
        _ensure_index("apartments", "ix_apartments_house_id", "house_id")

    if "rents" in inspector.get_table_names():
        _ensure_index("rents", "ix_rents_end_date", "end_date")
        _ensure_index("rents", "ix_rents_status", "status")
        _ensure_index("rents", "ix_rents_status_end_date", "status, end_date")

    if "users" in inspector.get_table_names():
        _ensure_index(
            "users",
            "ix_users_email_verification_token",
            "email_verification_token",
        )

    if "billing_plans" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("billing_plans")}
        with engine.begin() as connection:
            if "house_limit" not in columns:
                connection.execute(
                    text(
                        "ALTER TABLE billing_plans "
                        "ADD COLUMN house_limit INTEGER NOT NULL DEFAULT 0"
                    )
                )
                columns.add("house_limit")
            if "apartment_limit" in columns:
                connection.execute(
                    text(
                        "UPDATE billing_plans "
                        "SET house_limit = apartment_limit "
                        "WHERE house_limit = 0"
                    )
                )

    _ensure_billing_seed_data()


def _ensure_billing_seed_data():
    inspector = inspect(engine)
    if "billing_plans" not in inspector.get_table_names():
        return

    from app.models.billing_plan import BillingPlan

    default_plans = [
        {
            "slug": "trial",
            "name": "Free Trial",
            "description": "30-day free access for new landlords managing 1 house",
            "price_amount": Decimal("0.00"),
            "currency": "NGN",
            "apartment_limit": 0,
            "house_limit": 1,
            "duration_days": 30,
            "is_default": True,
            "is_active": True,
            "sort_order": 1,
        },
        {
            "slug": "annual_starter",
            "name": "Starter Annual",
            "description": "Annual plan for landlords managing up to 5 houses",
            "price_amount": Decimal("25000.00"),
            "currency": "NGN",
            "apartment_limit": 0,
            "house_limit": 5,
            "duration_days": 365,
            "is_default": False,
            "is_active": True,
            "sort_order": 2,
        },
        {
            "slug": "annual_growth",
            "name": "Growth Annual",
            "description": "Annual plan for growing portfolios with up to 20 houses",
            "price_amount": Decimal("60000.00"),
            "currency": "NGN",
            "apartment_limit": 0,
            "house_limit": 20,
            "duration_days": 365,
            "is_default": False,
            "is_active": True,
            "sort_order": 3,
        },
        {
            "slug": "annual_scale",
            "name": "Scale Annual",
            "description": "Annual plan for larger portfolios with up to 50 houses",
            "price_amount": Decimal("120000.00"),
            "currency": "NGN",
            "apartment_limit": 0,
            "house_limit": 50,
            "duration_days": 365,
            "is_default": False,
            "is_active": True,
            "sort_order": 4,
        },
    ]

    db = SessionLocal()
    try:
        existing = {plan.slug: plan for plan in db.query(BillingPlan).all()}
        seeded_slugs = {payload["slug"] for payload in default_plans}
        changed = False
        for payload in default_plans:
            plan = existing.get(payload["slug"])
            if plan:
                for key, value in payload.items():
                    setattr(plan, key, value)
            else:
                db.add(BillingPlan(**payload))
            changed = True
        for slug, plan in existing.items():
            if slug not in seeded_slugs:
                plan.is_active = False
                plan.is_default = False
                changed = True
        if changed:
            db.commit()
    finally:
        db.close()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
