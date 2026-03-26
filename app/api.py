from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth
from app.routes.rent import router as rent_router
from app.routes.landlord import router as landlord_router
from app.routes.dashboard import router as dashboard_router
from app.routes.house import router as house_router
from app.routes.apartment import router as apartment_router
from app.routes.tenant import router as tenant_router
from app.routes.rent_reminder import router as rent_reminder_router
from app.routes.billing import router as billing_router
from app.routes.audit_log import router as audit_log_router

from app.models import *  # noqa: F401, F403 — registers all models for Base.metadata
from app.database import Base, engine, ensure_schema_updates  # use the same Base all models inherit from
from app.scheduler import start_scheduler, shutdown_scheduler


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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
ensure_schema_updates()

app.include_router(auth.router)
app.include_router(dashboard_router)
app.include_router(landlord_router)
app.include_router(house_router)
app.include_router(apartment_router)
app.include_router(tenant_router)
app.include_router(rent_router)
app.include_router(rent_reminder_router)
app.include_router(billing_router)
app.include_router(audit_log_router)
