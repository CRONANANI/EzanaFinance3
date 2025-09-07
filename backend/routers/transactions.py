from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import Transaction, Account, User
from schemas import TransactionCreate, TransactionUpdate, Transaction as TransactionSchema
from routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=TransactionSchema)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify account belongs to user
    account = db.query(Account).filter(
        Account.id == transaction.account_id,
        Account.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db_transaction = Transaction(**transaction.dict(), user_id=current_user.id)
    db.add(db_transaction)
    
    # Update account balance
    if transaction.transaction_type == "income":
        account.balance += transaction.amount
    elif transaction.transaction_type == "expense":
        account.balance -= transaction.amount
    
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.get("/", response_model=List[TransactionSchema])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    account_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if category:
        query = query.filter(Transaction.category == category)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    return transactions

@router.get("/{transaction_id}", response_model=TransactionSchema)
def read_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.put("/{transaction_id}", response_model=TransactionSchema)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get the account to update balance if amount changes
    account = db.query(Account).filter(Account.id == transaction.account_id).first()
    
    # Revert old transaction from balance
    if transaction.transaction_type == "income":
        account.balance -= transaction.amount
    elif transaction.transaction_type == "expense":
        account.balance += transaction.amount
    
    update_data = transaction_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    # Apply new transaction to balance
    if transaction.transaction_type == "income":
        account.balance += transaction.amount
    elif transaction.transaction_type == "expense":
        account.balance -= transaction.amount
    
    db.commit()
    db.refresh(transaction)
    return transaction

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update account balance
    account = db.query(Account).filter(Account.id == transaction.account_id).first()
    if transaction.transaction_type == "income":
        account.balance -= transaction.amount
    elif transaction.transaction_type == "expense":
        account.balance += transaction.amount
    
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}

@router.get("/summary/monthly")
def get_monthly_summary(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get transactions for the specified month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).all()
    
    total_income = sum(t.amount for t in transactions if t.transaction_type == "income")
    total_expenses = sum(t.amount for t in transactions if t.transaction_type == "expense")
    
    # Category breakdown
    category_breakdown = {}
    for transaction in transactions:
        if transaction.category not in category_breakdown:
            category_breakdown[transaction.category] = {"income": 0, "expense": 0}
        category_breakdown[transaction.category][transaction.transaction_type] += transaction.amount
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_income": total_income - total_expenses,
        "category_breakdown": category_breakdown,
        "transaction_count": len(transactions)
    }
