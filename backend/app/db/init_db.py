
from app.db.base import Base
from app.db.session import engine

# Import all models so SQLAlchemy knows about every table.
import app.models


def create_tables():
    Base.metadata.create_all(bind=engine)

    print("Database tables created successfully!")
    print("Tables:", list(Base.metadata.tables.keys()))


if __name__ == "__main__":
    create_tables()
