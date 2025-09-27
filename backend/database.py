from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from urllib.parse import quote_plus

# Azure SQL Database Configuration
AZURE_SQL_SERVER = "ezanaezana.database.windows.net"
AZURE_SQL_DATABASE = "ezana_finance"
AZURE_SQL_USERNAME = os.getenv("AZURE_SQL_USERNAME", "ezana_admin")
AZURE_SQL_PASSWORD = os.getenv("AZURE_SQL_PASSWORD", "EzanaFinance2024!")
AZURE_SQL_DRIVER = "ODBC Driver 18 for SQL Server"

# Connection string for Azure SQL Database
CONNECTION_STRING = f"mssql+pyodbc://{AZURE_SQL_USERNAME}:{quote_plus(AZURE_SQL_PASSWORD)}@{AZURE_SQL_SERVER}/{AZURE_SQL_DATABASE}?driver={AZURE_SQL_DRIVER}&Encrypt=yes&TrustServerCertificate=no&Connection+Timeout=30"

# For development/testing, you can also use SQLite
SQLITE_URL = "sqlite:///./ezana_finance.db"

# Choose database based on environment
DATABASE_URL = os.getenv("DATABASE_URL", SQLITE_URL)

# Create engine
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    from models import Base
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """Drop all database tables"""
    from models import Base
    Base.metadata.drop_all(bind=engine)