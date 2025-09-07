from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Account schemas
class AccountBase(BaseModel):
    name: str
    account_type: str
    currency: str = "USD"
    description: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Account(AccountBase):
    id: int
    balance: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_id: int

    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    amount: float
    description: str
    category: str
    transaction_type: str
    date: datetime

class TransactionCreate(TransactionBase):
    account_id: int

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    transaction_type: Optional[str] = None
    date: Optional[datetime] = None

class Transaction(TransactionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_id: int
    account_id: int

    class Config:
        from_attributes = True

# Budget schemas
class BudgetBase(BaseModel):
    name: str
    category: str
    amount: float
    period: str
    start_date: datetime
    end_date: datetime

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    period: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class Budget(BudgetBase):
    id: int
    spent: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_id: int

    class Config:
        from_attributes = True

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
