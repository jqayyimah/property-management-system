from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
DATABASE_URL = "mysql+pymysql://app_user:app_password@localhost:3306/app_db"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=True  # 👈 VERY IMPORTANT while developing
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
