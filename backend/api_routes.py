from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from database import get_db, create_tables
from auth import (
    authenticate_user, create_access_token, create_refresh_token, 
    get_current_user, update_last_login, create_user_session
)
from user_service import UserService
from plaid_integration import plaid_service
from models import User

# Create router
router = APIRouter()

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

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
    try:
        link_token = plaid_service.create_link_token(str(current_user.id))
        return {"link_token": link_token}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating link token: {str(e)}"
        )

@router.post("/plaid/exchange-token")
async def exchange_plaid_token(
    request: PlaidExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exchange Plaid public token for access token and sync data"""
    try:
        # Exchange public token for access token
        access_token = plaid_service.exchange_public_token(request.public_token)
        
        # Sync Plaid data
        user_service = UserService(db)
        sync_result = user_service.sync_plaid_data(current_user.id, access_token)
        
        return {
            "access_token": access_token,
            "sync_result": sync_result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exchanging token: {str(e)}"
        )

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
