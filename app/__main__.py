from fastapi import FastAPI
from app.database import engine
from app import Base

app = FastAPI(title="Tenant Management API")

Base.metadata.create_all(bind=engine)
