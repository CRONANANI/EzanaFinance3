#!/usr/bin/env python3
"""
Startup script for Ezana Finance application
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 11):
        print("❌ Python 3.11 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version}")

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)

def check_env_file():
    """Check if .env file exists and create template if not"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env file not found. Creating template...")
        env_template = """# Database Configuration
DATABASE_URL=sqlite:///./ezana_finance.db

# Security
SECRET_KEY=your-super-secret-jwt-key-change-in-production-please
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External APIs (Optional)
QUIVER_API_KEY=your-quiver-api-key-here
FINNHUB_API_KEY=your-finnhub-api-key-here

# Environment
ENVIRONMENT=development
DEBUG=True

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
"""
        with open(".env", "w") as f:
            f.write(env_template)
        print("✅ Created .env template file")
        print("📝 Please edit .env file with your configuration")
    else:
        print("✅ .env file found")

def setup_database():
    """Set up database tables"""
    print("🗄️  Setting up database...")
    try:
        from database import engine
        from models import Base
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Failed to setup database: {e}")
        print("⚠️  Continuing without database setup...")

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Ezana Finance server...")
    print("📱 Frontend will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔄 Interactive API: http://localhost:8000/redoc")
    print("\n" + "="*50)
    print("🎯 Press Ctrl+C to stop the server")
    print("="*50 + "\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)

def main():
    """Main startup function"""
    print("🌟 Ezana Finance - Professional Investment Analytics")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Run startup checks
    check_python_version()
    install_dependencies()
    check_env_file()
    setup_database()
    
    print("\n🎉 Setup complete! Starting server...")
    time.sleep(1)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()