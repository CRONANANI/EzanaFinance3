from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.relationship import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    accounts = relationship("Account", back_populates="owner")
    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    watchlists = relationship("Watchlist", back_populates="user")
    followed_congress_people = relationship("FollowedCongressPerson", back_populates="user")
    bank_connections = relationship("BankConnection", back_populates="user")
    health_scores = relationship("FinancialHealthScore", back_populates="user")
    investment_recommendations = relationship("InvestmentRecommendation", back_populates="user")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    account_type = Column(String)  # checking, savings, credit, investment
    balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    description = Column(Text, nullable=True)
    external_account_id = Column(String)  # Bank's account ID
    bank_connection_id = Column(Integer, ForeignKey("bank_connections.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")
    bank_connection = relationship("BankConnection", back_populates="accounts")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    description = Column(String)
    category = Column(String)
    transaction_type = Column(String)  # income, expense, transfer
    date = Column(DateTime(timezone=True))
    external_transaction_id = Column(String)  # Bank's transaction ID
    merchant_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"))

    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)
    amount = Column(Float)
    spent = Column(Float, default=0.0)
    period = Column(String)  # monthly, weekly, yearly
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    user = relationship("User", back_populates="budgets")

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    symbols = Column(JSON)  # Store list of stock symbols
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="watchlists")

class FollowedCongressPerson(Base):
    __tablename__ = "followed_congress_people"

    id = Column(Integer, primary_key=True, index=True)
    congress_person_name = Column(String, nullable=False)
    party = Column(String)
    chamber = Column(String)  # House or Senate
    state = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="followed_congress_people")

class CongressTradingData(Base):
    __tablename__ = "congress_trading_data"

    id = Column(Integer, primary_key=True, index=True)
    congress_person_name = Column(String, nullable=False, index=True)
    ticker = Column(String, nullable=False, index=True)
    company_name = Column(String)
    trade_type = Column(String, nullable=False)  # buy, sell, option
    amount = Column(Float, nullable=False)
    trade_date = Column(DateTime(timezone=True), nullable=False, index=True)
    party = Column(String)
    chamber = Column(String)  # House or Senate
    state = Column(String)
    owner = Column(String)  # self, spouse, dependent
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class GovernmentContractData(Base):
    __tablename__ = "government_contract_data"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False, index=True)
    ticker = Column(String, index=True)
    contract_value = Column(Float, nullable=False)
    agency = Column(String, nullable=False)
    contract_date = Column(DateTime(timezone=True), nullable=False, index=True)
    description = Column(Text)
    contract_type = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LobbyingActivityData(Base):
    __tablename__ = "lobbying_activity_data"

    id = Column(Integer, primary_key=True, index=True)
    firm_name = Column(String, nullable=False)
    client_name = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    report_date = Column(DateTime(timezone=True), nullable=False, index=True)
    issues = Column(String)
    registrant = Column(String)
    quarter = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class BankConnection(Base):
    __tablename__ = "bank_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    institution_name = Column(String, nullable=False)
    bank_token = Column(String, nullable=False)  # Encrypted in production
    external_connection_id = Column(String)  # Bank's connection ID
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="bank_connections")
    accounts = relationship("Account", back_populates="bank_connection")

class FinancialHealthScore(Base):
    __tablename__ = "financial_health_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    savings_score = Column(Float, nullable=False)
    emergency_fund_score = Column(Float, nullable=False)
    balance_score = Column(Float, nullable=False)
    health_level = Column(String, nullable=False)  # Excellent, Good, Fair, Needs Improvement
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="health_scores")

class InvestmentRecommendation(Base):
    __tablename__ = "investment_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    recommendation_type = Column(String, nullable=False)  # ETF, Stock, Bond, etc.
    allocation_percentage = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    expected_return = Column(String)
    reason = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="investment_recommendations")
