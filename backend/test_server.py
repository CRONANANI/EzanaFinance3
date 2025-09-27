#!/usr/bin/env python3
"""
Simple test script to verify the backend works
"""

import sys
import os
import requests
import json

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_backend():
    """Test the backend API"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Ezana Finance Backend...")
    
    try:
        # Test health endpoint
        print("1. Testing health endpoint...")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
        
        # Test login endpoint
        print("2. Testing login endpoint...")
        login_data = {
            "email": "testing123@gmail.com",
            "password": "password123"
        }
        
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print("✅ Login endpoint working")
            print(f"   Access token: {data.get('access_token', 'N/A')[:20]}...")
            print(f"   User ID: {data.get('user', {}).get('user', {}).get('id', 'N/A')}")
        else:
            print(f"❌ Login endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        # Test user profile endpoint
        print("3. Testing user profile endpoint...")
        if 'data' in locals() and 'access_token' in data:
            headers = {"Authorization": f"Bearer {data['access_token']}"}
            response = requests.get(f"{base_url}/api/auth/me", headers=headers)
            if response.status_code == 200:
                print("✅ User profile endpoint working")
            else:
                print(f"❌ User profile endpoint failed: {response.status_code}")
                return False
        
        print("🎉 All tests passed! Backend is working correctly.")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server. Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    test_backend()
