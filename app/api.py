from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.routes.rent import router as rent_router
from app.routes.landlord import router as landlord_router
from app.routes.house import router as house_router
from app.routes.apartment import router as apartment_router
from app.routes.tenant import router as tenant_router
from app.models import *
from app.models.base import Base
from app.database import engine
from app.scheduler import start_scheduler, shutdown_scheduler
from app.routes import auth

from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Property Management API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # TEMPORARY for dev (Figma + ngrok)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(landlord_router)
app.include_router(house_router)
app.include_router(apartment_router)
app.include_router(tenant_router)
app.include_router(rent_router)
