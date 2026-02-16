from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import hashlib
import secrets

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    investment_accounts = relationship("InvestmentAccount", back_populates="user")
    portfolios = relationship("Portfolio", back_populates="user")
    watchlists = relationship("Watchlist", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    
    def set_password(self, password: str):
        """Hash and set password"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        self.password_hash = f"{salt}:{password_hash.hex()}"
    
    def check_password(self, password: str) -> bool:
        """Check if provided password matches stored hash"""
        if not self.password_hash:
            return False
        try:
            salt, stored_hash = self.password_hash.split(':')
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            return password_hash.hex() == stored_hash
        except Exception:
            return False

class UserProfile(Base):
    __tablename__ = 'user_profiles'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Personal Information
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    country = Column(String(50), default='US')
    
    # Investment Preferences
    risk_tolerance = Column(String(20), default='moderate')  # conservative, moderate, aggressive
    investment_goals = Column(JSON)  # Array of goals like ['retirement', 'education', 'wealth_building']
    investment_horizon = Column(String(20), default='long_term')  # short_term, medium_term, long_term
    annual_income = Column(Float)
    net_worth = Column(Float)
    
    # Notification Preferences
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=True)
    
    # Profile Settings
    profile_picture_url = Column(String(500))
    bio = Column(Text)
    timezone = Column(String(50), default='America/New_York')
    language = Column(String(10), default='en')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")

class InvestmentAccount(Base):
    __tablename__ = 'investment_accounts'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Plaid Integration
    plaid_account_id = Column(String(255), unique=True, nullable=False)
    plaid_item_id = Column(String(255), nullable=False)
    plaid_access_token = Column(Text, nullable=False)
    
    # Account Information
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)  # checking, savings, investment, retirement, etc.
    institution_name = Column(String(255), nullable=False)
    institution_id = Column(String(100), nullable=False)
    
    # Account Status
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime)
    sync_status = Column(String(20), default='pending')  # pending, success, error
    
    # Account Balances
    current_balance = Column(Float, default=0.0)
    available_balance = Column(Float, default=0.0)
    currency = Column(String(3), default='USD')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="investment_accounts")
    holdings = relationship("Holding", back_populates="account")
    transactions = relationship("Transaction", back_populates="account")

class Holding(Base):
    __tablename__ = 'holdings'
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey('investment_accounts.id'), nullable=False)
    
    # Security Information
    security_id = Column(String(100), nullable=False)  # Plaid security ID
    symbol = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    security_type = Column(String(50), nullable=False)  # equity, etf, mutual_fund, bond, etc.
    
    # Holdings Data
    quantity = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    market_value = Column(Float, nullable=False)
    cost_basis = Column(Float, nullable=False)
    unrealized_gain_loss = Column(Float, default=0.0)
    unrealized_gain_loss_percent = Column(Float, default=0.0)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    account = relationship("InvestmentAccount", back_populates="holdings")

class Transaction(Base):
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('investment_accounts.id'), nullable=False)
    
    # Plaid Integration
    plaid_transaction_id = Column(String(255), unique=True, nullable=False)
    
    # Transaction Details
    amount = Column(Float, nullable=False)
    description = Column(String(500), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # buy, sell, dividend, interest, etc.
    category = Column(String(100))
    subcategory = Column(String(100))
    
    # Security Information (for investment transactions)
    security_id = Column(String(100))
    symbol = Column(String(20))
    quantity = Column(Float)
    price = Column(Float)
    
    # Transaction Metadata
    date = Column(DateTime, nullable=False)
    pending = Column(Boolean, default=False)
    merchant_name = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("InvestmentAccount", back_populates="transactions")

class Portfolio(Base):
    __tablename__ = 'portfolios'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Portfolio Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    
    # Portfolio Metrics
    total_value = Column(Float, default=0.0)
    total_cost_basis = Column(Float, default=0.0)
    total_gain_loss = Column(Float, default=0.0)
    total_gain_loss_percent = Column(Float, default=0.0)
    
    # Performance Metrics
    daily_change = Column(Float, default=0.0)
    daily_change_percent = Column(Float, default=0.0)
    weekly_change = Column(Float, default=0.0)
    weekly_change_percent = Column(Float, default=0.0)
    monthly_change = Column(Float, default=0.0)
    monthly_change_percent = Column(Float, default=0.0)
    yearly_change = Column(Float, default=0.0)
    yearly_change_percent = Column(Float, default=0.0)
    
    # Asset Allocation
    asset_allocation = Column(JSON)  # {"stocks": 60, "bonds": 30, "cash": 10}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="portfolios")

class Watchlist(Base):
    __tablename__ = 'watchlists'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Watchlist Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="watchlists")
    watchlist_items = relationship("WatchlistItem", back_populates="watchlist")

class WatchlistItem(Base):
    __tablename__ = 'watchlist_items'
    
    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey('watchlists.id'), nullable=False)
    
    # Security Information
    symbol = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    security_type = Column(String(50), nullable=False)
    
    # Alert Settings
    price_alert_high = Column(Float)
    price_alert_low = Column(Float)
    volume_alert = Column(Boolean, default=False)
    
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    watchlist = relationship("Watchlist", back_populates="watchlist_items")

class MarketData(Base):
    __tablename__ = 'market_data'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Security Information
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    security_type = Column(String(50), nullable=False)
    
    # Price Data
    current_price = Column(Float, nullable=False)
    open_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    previous_close = Column(Float)
    
    # Volume Data
    volume = Column(Integer, default=0)
    average_volume = Column(Integer, default=0)
    
    # Market Cap and Metrics
    market_cap = Column(Float)
    pe_ratio = Column(Float)
    dividend_yield = Column(Float)
    
    # Change Data
    change = Column(Float, default=0.0)
    change_percent = Column(Float, default=0.0)
    
    # Timestamps
    last_updated = Column(DateTime, default=datetime.utcnow)
    data_date = Column(DateTime, nullable=False)

class UserSession(Base):
    __tablename__ = 'user_sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Session Information
    session_token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Session Metadata
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")