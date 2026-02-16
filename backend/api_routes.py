from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import os
import secrets

from database import get_db, create_tables
from auth import (
    authenticate_user, create_access_token, create_refresh_token,
    get_current_user, update_last_login, create_user_session
)
from user_service import UserService
# from plaid_integration import plaid_service
from models import User, UserProfile

# Create router
router = APIRouter()

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class GoogleAuthRequest(BaseModel):
    credential: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: Optional[bool] = None

class PlaidLinkTokenRequest(BaseModel):
    user_id: int

class PlaidExchangeRequest(BaseModel):
    public_token: str

class UserProfileUpdate(BaseModel):
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    risk_tolerance: Optional[str] = None
    investment_goals: Optional[list] = None
    investment_horizon: Optional[str] = None
    annual_income: Optional[float] = None
    net_worth: Optional[float] = None
    bio: Optional[str] = None

# Authentication endpoints
@router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint"""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    update_last_login(user, db)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Create session
    create_user_session(user.id, db)
    
    # Get user profile data
    user_service = UserService(db)
    user_profile = user_service.get_user_profile(user.id)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_profile
    )


async def _verify_google_token(credential: str) -> Optional[Dict[str, Any]]:
    """Verify Google ID token and return payload if valid."""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    client_id = os.getenv(
        "GOOGLE_CLIENT_ID",
        "296880553171-tshf9f77hcrdqjikged1e1adf766mkbt.apps.googleusercontent.com"
    )
    if not client_id or client_id.startswith("your-"):
        return None
    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id
        )
        if payload.get("aud") != client_id:
            return None
        return payload
    except Exception:
        return None


@router.post("/auth/google", response_model=LoginResponse)
async def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate or register user via Google Sign-In."""
    payload = await _verify_google_token(data.credential)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )

    google_id = payload.get("sub")
    name = payload.get("name") or data.name or ""
    parts = name.split(None, 1)
    first_name = parts[0] if parts else "User"
    last_name = parts[1] if len(parts) > 1 else ""

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name or first_name,
            google_id=google_id,
            is_active=True,
            is_verified=bool(payload.get("email_verified", True))
        )
        user.set_password(secrets.token_urlsafe(32))
        db.add(user)
        db.commit()
        db.refresh(user)
        profile = UserProfile(user_id=user.id, profile_picture_url=payload.get("picture"))
        db.add(profile)
        db.commit()

    update_last_login(user, db)
    create_user_session(user.id, db)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    user_service = UserService(db)
    user_profile = user_service.get_user_profile(user.id)
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_profile
    )


@router.post("/auth/register")
async def register(register_data: RegisterRequest, db: Session = Depends(get_db)):
    """User registration endpoint"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=register_data.email,
        first_name=register_data.first_name,
        last_name=register_data.last_name,
        is_active=True,
        is_verified=False  # Would need email verification in production
    )
    user.set_password(register_data.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create user profile
    user_service = UserService(db)
    user_service.create_test_user()  # This will create the test user if it doesn't exist
    
    return {"message": "User created successfully", "user_id": user.id}

@router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information"""
    user_service = UserService(db)
    user_profile = user_service.get_user_profile(current_user.id)
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return user_profile

# User profile endpoints
@router.put("/user/profile")
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    user_service = UserService(db)
    
    # Get or create user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update profile fields
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    profile.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    
    return {"message": "Profile updated successfully"}

@router.get("/user/dashboard")
async def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized dashboard data"""
    user_service = UserService(db)
    dashboard_data = user_service.get_personalized_dashboard_data(current_user.id)
    
    return dashboard_data

# Plaid integration endpoints
@router.post("/plaid/link-token")
async def create_plaid_link_token(
    request: PlaidLinkTokenRequest,
    current_user: User = Depends(get_current_user)
):
    """Create Plaid link token for account connection"""
    return {"link_token": "demo_token", "message": "Plaid integration coming soon"}

@router.post("/plaid/exchange-token")
async def exchange_plaid_token(
    request: PlaidExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exchange Plaid public token for access token and sync data"""
    return {"message": "Plaid integration coming soon"}

# Portfolio endpoints
@router.get("/portfolio")
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's portfolio data"""
    user_service = UserService(db)
    user_profile = user_service.get_user_profile(current_user.id)
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return {
        "portfolios": user_profile.get('portfolios', []),
        "investment_accounts": user_profile.get('investment_accounts', [])
    }

# Watchlist endpoints
@router.get("/watchlist")
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's watchlist"""
    user_service = UserService(db)
    user_profile = user_service.get_user_profile(current_user.id)
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return {"watchlists": user_profile.get('watchlists', [])}

# Admin endpoints
@router.post("/admin/create-test-user")
async def create_test_user(db: Session = Depends(get_db)):
    """Create test user account (admin endpoint)"""
    user_service = UserService(db)
    test_user = user_service.create_test_user()
    
    return {
        "message": "Test user created successfully",
        "user_id": test_user.id,
        "email": test_user.email
    }

@router.post("/admin/init-database")
async def initialize_database():
    """Initialize database tables (admin endpoint)"""
    try:
        create_tables()
        return {"message": "Database initialized successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing database: {str(e)}"
        )
