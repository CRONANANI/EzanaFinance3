#!/usr/bin/env python3
"""
Start the Ezana Finance backend server
"""

import subprocess
import sys
import os
import time

def start_backend():
    """Start the backend server"""
    print("🚀 Starting Ezana Finance Backend...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    
    try:
        # Initialize database and create test user
        print("📊 Initializing database...")
        subprocess.run([sys.executable, "init_test_user.py"], check=True)
        
        # Start the server
        print("🌐 Starting server on http://localhost:8000...")
        subprocess.run([sys.executable, "main.py"], check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting backend: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    start_backend()
