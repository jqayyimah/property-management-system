# scripts/create_tables.py
from app.database import engine
from app.database import Base
from app.models.user import User  # IMPORTANT: import registers the model

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
