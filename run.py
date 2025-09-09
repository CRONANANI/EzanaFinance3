#!/usr/bin/env python3
"""
Quick start script for Ezana Finance
Run this from the project root directory
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Main function to start the application"""
    project_root = Path(__file__).parent
    backend_dir = project_root / "backend"
    
    print("🌟 Starting Ezana Finance...")
    print(f"📁 Project root: {project_root}")
    print(f"📁 Backend directory: {backend_dir}")
    
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        print("Make sure you're running this from the project root directory.")
        sys.exit(1)
    
    # Change to backend directory and run startup script
    os.chdir(backend_dir)
    
    try:
        subprocess.run([sys.executable, "startup.py"])
    except FileNotFoundError:
        print("❌ startup.py not found in backend directory")
        print("Trying to run server directly...")
        try:
            subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
        except Exception as e:
            print(f"❌ Failed to start server: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error running startup script: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
