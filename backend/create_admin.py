
from getpass import getpass

from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password


db = SessionLocal()

try:
    full_name = input("Enter admin name: ").strip()
    email = input("Enter admin email: ").strip().lower()
    password = getpass("Enter admin password: ")

    if not full_name or not email:
        raise ValueError("Name and email are required.")

    if len(password.encode("utf-8")) > 72 or len(password) < 8:
        raise ValueError("Password must be 8–72 UTF-8 bytes.")

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        print("A user with this email already exists.")
    else:
        admin_role = db.query(Role).filter(
            Role.name == "Admin"
        ).first()

        if not admin_role:
            admin_role = Role(name="Admin")
            db.add(admin_role)
            db.flush()

        admin = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role_id=admin_role.id,
            is_active=True
        )

        db.add(admin)
        db.commit()

        print("Admin account created successfully!")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
