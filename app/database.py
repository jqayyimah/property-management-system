from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv
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


def ensure_schema_updates():
    """
    Apply lightweight schema fixes for deployments that do not use migrations.
    """
    inspector = inspect(engine)

    if "rent_reminder_logs" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("rent_reminder_logs")}
        if "channel_used" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE rent_reminder_logs "
                        "ADD COLUMN channel_used VARCHAR(20) NULL"
                    )
                )


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
