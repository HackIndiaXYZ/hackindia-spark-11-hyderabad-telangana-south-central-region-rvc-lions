from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .core.config import settings
from .db.session import engine, SessionLocal
from .models.base import Base
from .models.user import User
from .models.hospital import Hospital
from .models.camera import Camera
from .models.alert import Alert
from .models.audit_log import AuditLog
from .core.security import get_password_hash

# Import existing routers
from .api.routes import auth, patient, gesture_mappings, calibration, detections, websocket

# Import admin routers
from .api.routes import (
    admin_hospitals,
    admin_users,
    admin_cameras,
    admin_patients,
    admin_alerts,
    admin_analytics,
    admin_stats,
    admin_audit,
    admin_notifications,
    admin_websocket,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _migrate_column(conn, text, table: str, column: str, definition: str):
    """Add a column to a table if it doesn't exist yet."""
    try:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        logger.info(f"Migration: added {table}.{column}")
    except Exception:
        pass  # Column already exists — safe to ignore


def _init_db():
    """Create tables and seed default accounts if DB is empty."""
    logger.info("Initializing database tables...")
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        # ── patients: face recognition columns ───────────────────────────────
        if "patients" in existing_tables:
            columns = [c["name"] for c in inspector.get_columns("patients")]
            if "face_embedding" not in columns:
                logger.info("Migrating patients table (adding face columns)...")
                with engine.begin() as conn:
                    _migrate_column(conn, text, "patients", "face_embedding", "JSON DEFAULT NULL")
                    _migrate_column(conn, text, "patients", "face_calibrated", "BOOLEAN DEFAULT 0")
                    _migrate_column(conn, text, "patients", "face_similarity_threshold", "JSON DEFAULT NULL")

        # ── users: admin columns added later ─────────────────────────────────
        if "users" in existing_tables:
            user_cols = [c["name"] for c in inspector.get_columns("users")]
            with engine.begin() as conn:
                if "hospital_id" not in user_cols:
                    _migrate_column(conn, text, "users", "hospital_id", "VARCHAR(100) DEFAULT NULL")
                if "phone" not in user_cols:
                    _migrate_column(conn, text, "users", "phone", "VARCHAR(50) DEFAULT NULL")
                if "role" not in user_cols:
                    _migrate_column(conn, text, "users", "role", "VARCHAR(50) DEFAULT 'nurse'")

        # ── Create all new tables (hospitals, cameras, admin_alerts, etc.) ───
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")

    db = SessionLocal()
    try:
        nurse = db.query(User).filter(User.email == "nurse@visioncare.com").first()
        if not nurse:
            nurse = User(
                email="nurse@visioncare.com",
                name="Default Nurse",
                hashed_password=get_password_hash("password123"),
                role="nurse",
                ward_id="ICU-1",
            )
            db.add(nurse)
            logger.info("Seeded nurse@visioncare.com / password123")
        else:
            nurse.hashed_password = get_password_hash("password123")
            nurse.role = "nurse"
            nurse.is_active = True

        admin = db.query(User).filter(User.email == "admin@visioncare.com").first()
        if not admin:
            admin = User(
                email="admin@visioncare.com",
                name="Super Admin",
                hashed_password=get_password_hash("admin123"),
                role="super_admin",
                ward_id="ADMIN",
            )
            db.add(admin)
            logger.info("Seeded admin@visioncare.com / admin123")
        else:
            admin.hashed_password = get_password_hash("admin123")
            admin.role = "super_admin"
            admin.is_active = True

        db.commit()
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()



@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    yield


app = FastAPI(
    title="VisionCare AI Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing routes ───────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patient.router, prefix="/api/patients", tags=["patients"])
app.include_router(gesture_mappings.router, prefix="/api/gesture-mappings", tags=["gesture-mappings"])
app.include_router(calibration.router, prefix="/api/calibration", tags=["calibration"])
app.include_router(detections.router, prefix="/api/detections", tags=["detections"])
app.include_router(websocket.router, tags=["websockets"])

# ── Admin routes ──────────────────────────────────────────────────────────────
app.include_router(admin_hospitals.router,     prefix="/api/admin/hospitals",     tags=["admin-hospitals"])
app.include_router(admin_users.router,         prefix="/api/admin/users",         tags=["admin-users"])
app.include_router(admin_cameras.router,       prefix="/api/admin/cameras",       tags=["admin-cameras"])
app.include_router(admin_patients.router,      prefix="/api/admin/patients",      tags=["admin-patients"])
app.include_router(admin_alerts.router,        prefix="/api/admin/alerts",        tags=["admin-alerts"])
app.include_router(admin_analytics.router,     prefix="/api/admin/analytics",     tags=["admin-analytics"])
app.include_router(admin_stats.router,         prefix="/api/admin/stats",         tags=["admin-stats"])
app.include_router(admin_audit.router,         prefix="/api/admin/audit-logs",    tags=["admin-audit"])
app.include_router(admin_notifications.router, prefix="/api/admin/notifications", tags=["admin-notifications"])
app.include_router(admin_websocket.router,     tags=["admin-websockets"])


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy"}
