"""
reset_db.py — Run this ONCE to reset the database and seed default credentials.
Usage: python reset_db.py
"""
import os
import sys

# ── Remove stale DB ──────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "visioncare.db")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"✓ Deleted {DB_PATH}")
else:
    print("ℹ  No existing visioncare.db found — will create fresh.")

# ── Remove stale .pyc cache ──────────────────────────────────────────────────
import shutil
for root, dirs, files in os.walk(os.path.join(os.path.dirname(__file__), "app")):
    for d in dirs:
        if d == "__pycache__":
            shutil.rmtree(os.path.join(root, d))
            print(f"✓ Removed {os.path.join(root, d)}")

# ── Re-create tables and seed users ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from app.db.session import engine, SessionLocal
from app.models.base import Base
from app.models import *          # import all models so metadata is populated
from app.models.user import User
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)
print("✓ Tables created.")

db = SessionLocal()
try:
    # Remove any existing default users first
    db.query(User).filter(User.email.in_(["admin@visioncare.com", "nurse@visioncare.com"])).delete(synchronize_session=False)
    db.commit()

    nurse = User(
        email="nurse@visioncare.com",
        name="Default Nurse",
        hashed_password=get_password_hash("password123"),
        role="nurse",
        ward_id="ICU-1",
        is_active=True,
    )
    admin = User(
        email="admin@visioncare.com",
        name="Super Admin",
        hashed_password=get_password_hash("admin123"),
        role="super_admin",
        ward_id="ADMIN",
        is_active=True,
    )
    db.add(nurse)
    db.add(admin)
    db.commit()
    print("✓ Seeded nurse@visioncare.com   / password123")
    print("✓ Seeded admin@visioncare.com   / admin123")
finally:
    db.close()

print("\n✅ Done! Now run: python -m uvicorn app.main:app --reload --port 8000")
