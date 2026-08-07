"""
test_startup.py — Tests if backend can import and start correctly.
Run: python test_startup.py
"""
import sys
import traceback

print("=" * 60)
print("VisionCare Backend Startup Diagnostic")
print("=" * 60)

# Test 1: Basic imports
print("\n[1] Testing core imports...")
try:
    from app.core.config import settings
    print(f"   ✓ Settings loaded. DB: {settings.DATABASE_URL}")
except Exception as e:
    print(f"   ✗ Config import failed: {e}")
    traceback.print_exc()

# Test 2: Database connection
print("\n[2] Testing database connection...")
try:
    from app.db.session import engine, SessionLocal
    from app.models.base import Base
    Base.metadata.create_all(bind=engine)
    print("   ✓ Database tables created/verified")
except Exception as e:
    print(f"   ✗ Database failed: {e}")
    traceback.print_exc()

# Test 3: User model
print("\n[3] Testing User model...")
try:
    from app.models.user import User
    from app.core.security import get_password_hash, verify_password
    db = SessionLocal()
    count = db.query(User).count()
    print(f"   ✓ Users table accessible. Row count: {count}")
    
    # List all users
    users = db.query(User).all()
    for u in users:
        print(f"   → {u.email} | role={u.role} | is_active={u.is_active}")
    db.close()
except Exception as e:
    print(f"   ✗ User query failed: {e}")
    traceback.print_exc()

# Test 4: Password verification
print("\n[4] Testing password verification...")
try:
    from app.core.security import get_password_hash, verify_password
    h = get_password_hash("admin123")
    ok = verify_password("admin123", h)
    print(f"   ✓ verify_password('admin123', hash) = {ok}")
    h2 = get_password_hash("password123")
    ok2 = verify_password("password123", h2)
    print(f"   ✓ verify_password('password123', hash) = {ok2}")
except Exception as e:
    print(f"   ✗ Password test failed: {e}")
    traceback.print_exc()

# Test 5: FastAPI app import
print("\n[5] Testing FastAPI app import...")
try:
    from app.main import app
    print("   ✓ FastAPI app imported successfully")
    print(f"   ✓ Routes registered: {len(app.routes)}")
except Exception as e:
    print(f"   ✗ App import failed: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("Diagnostic complete. If all ✓, run:")
print("  python -m uvicorn app.main:app --reload --port 8000")
print("=" * 60)
