#!/usr/bin/env python3
"""
Simple script to initialize the database and create test user
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import create_tables, get_db
from user_service import UserService
from models import User

def main():
    """Initialize database and create test user"""
    print("🚀 Initializing Ezana Finance Database...")
    
    try:
        # Create all tables
        print("📊 Creating database tables...")
        create_tables()
        print("✅ Database tables created successfully")
        
        # Get database session
        db = next(get_db())
        
        # Create test user
        print("👤 Creating test user account...")
        user_service = UserService(db)
        test_user = user_service.create_test_user()
        print(f"✅ Test user created: {test_user.email} (ID: {test_user.id})")
        
        # Close database session
        db.close()
        
        print("🎉 Database initialization completed successfully!")
        print("\n📋 Test Account Credentials:")
        print("   Email: testing123@gmail.com")
        print("   Password: password123")
        
    except Exception as e:
        print(f"❌ Error initializing database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
