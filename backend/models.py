from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
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

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    account_type = Column(String)  # checking, savings, credit, investment
    balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    description = Column(String)
    category = Column(String)
    transaction_type = Column(String)  # income, expense, transfer
    date = Column(DateTime(timezone=True))
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
