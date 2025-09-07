from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Account, User
from schemas import AccountCreate, AccountUpdate, Account as AccountSchema
from routers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=AccountSchema)
def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_account = Account(**account.dict(), user_id=current_user.id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@router.get("/", response_model=List[AccountSchema])
def read_accounts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(Account).filter(
        Account.user_id == current_user.id,
        Account.is_active == True
    ).offset(skip).limit(limit).all()
    return accounts

@router.get("/{account_id}", response_model=AccountSchema)
def read_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@router.put("/{account_id}", response_model=AccountSchema)
def update_account(
    account_id: int,
    account_update: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = account_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    db.commit()
    db.refresh(account)
    return account

@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Soft delete
    account.is_active = False
    db.commit()
    return {"message": "Account deleted successfully"}
