#!/usr/bin/env python3
"""
Database initialization script for Ezana Finance
This script creates the database tables and sets up the test user account
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import create_tables, get_db, engine
from user_service import UserService
from models import User, UserProfile, Portfolio, Watchlist, WatchlistItem

def initialize_database():
    """Initialize the database with tables and test data"""
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
        
        # Verify test user data
        print("🔍 Verifying test user data...")
        user_profile = user_service.get_user_profile(test_user.id)
        
        if user_profile:
            print("✅ Test user profile verified")
            print(f"   - Name: {user_profile['user']['first_name']} {user_profile['user']['last_name']}")
            print(f"   - Email: {user_profile['user']['email']}")
            print(f"   - Portfolios: {len(user_profile.get('portfolios', []))}")
            print(f"   - Watchlists: {len(user_profile.get('watchlists', []))}")
            print(f"   - Investment Accounts: {len(user_profile.get('investment_accounts', []))}")
        else:
            print("❌ Failed to verify test user profile")
        
        # Close database session
        db.close()
        
        print("🎉 Database initialization completed successfully!")
        print("\n📋 Test Account Credentials:")
        print("   Email: testing@gmail.com")
        print("   Password: password123")
        print("\n🔗 API Endpoints:")
        print("   - Login: POST /api/auth/login")
        print("   - User Profile: GET /api/auth/me")
        print("   - Dashboard: GET /api/user/dashboard")
        print("   - Portfolio: GET /api/portfolio")
        print("   - Watchlist: GET /api/watchlist")
        
    except Exception as e:
        print(f"❌ Error initializing database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    initialize_database()
