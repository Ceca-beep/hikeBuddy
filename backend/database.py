from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# If the user has not configured supabase postgres yet, fall back to local sqlite for convenience.
if DATABASE_URL is None or DATABASE_URL.strip() == "":
    DATABASE_URL = "sqlite:///./hikbuddy.db"

# Detect common placeholder values and fail early with a clear message.
if "<user>" in DATABASE_URL or "<pass>" in DATABASE_URL or "<host>" in DATABASE_URL or "<db>" in DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. Update backend/.env with your Supabase Postgres connection string. "
        "Example: postgresql://<user>:<pass>@<host>:5432/<db>"
    )

# Connect args differ between SQLite and Postgres
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
