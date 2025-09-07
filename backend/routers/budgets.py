from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List
from datetime import datetime

from database import get_db
from models import Budget, Transaction, User
from schemas import BudgetCreate, BudgetUpdate, Budget as BudgetSchema
from routers.auth import get_current_user

router = APIRouter()

def calculate_budget_spent(db: Session, budget: Budget, user_id: int):
    """Calculate how much has been spent in a budget category during the budget period"""
    spent = db.query(func.sum(Transaction.amount)).filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.category == budget.category,
            Transaction.transaction_type == "expense",
            Transaction.date >= budget.start_date,
            Transaction.date <= budget.end_date
        )
    ).scalar()
    return spent or 0.0

@router.post("/", response_model=BudgetSchema)
def create_budget(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_budget = Budget(**budget.dict(), user_id=current_user.id)
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    
    # Calculate initial spent amount
    db_budget.spent = calculate_budget_spent(db, db_budget, current_user.id)
    db.commit()
    db.refresh(db_budget)
    
    return db_budget

@router.get("/", response_model=List[BudgetSchema])
def read_budgets(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Budget).filter(Budget.user_id == current_user.id)
    
    if active_only:
        query = query.filter(Budget.is_active == True)
    
    budgets = query.offset(skip).limit(limit).all()
    
    # Update spent amounts
    for budget in budgets:
        budget.spent = calculate_budget_spent(db, budget, current_user.id)
    
    db.commit()
    return budgets

@router.get("/{budget_id}", response_model=BudgetSchema)
def read_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Update spent amount
    budget.spent = calculate_budget_spent(db, budget, current_user.id)
    db.commit()
    
    return budget

@router.put("/{budget_id}", response_model=BudgetSchema)
def update_budget(
    budget_id: int,
    budget_update: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    # Recalculate spent amount if category or dates changed
    budget.spent = calculate_budget_spent(db, budget, current_user.id)
    
    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Soft delete
    budget.is_active = False
    db.commit()
    return {"message": "Budget deleted successfully"}

@router.get("/status/overview")
def get_budgets_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get an overview of all active budgets with their status"""
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_active == True,
        Budget.end_date >= datetime.now()
    ).all()
    
    overview = []
    total_budgeted = 0
    total_spent = 0
    
    for budget in budgets:
        spent = calculate_budget_spent(db, budget, current_user.id)
        budget.spent = spent
        
        percentage_used = (spent / budget.amount * 100) if budget.amount > 0 else 0
        remaining = budget.amount - spent
        
        status = "on_track"
        if percentage_used > 100:
            status = "over_budget"
        elif percentage_used > 80:
            status = "warning"
        
        overview.append({
            "id": budget.id,
            "name": budget.name,
            "category": budget.category,
            "amount": budget.amount,
            "spent": spent,
            "remaining": remaining,
            "percentage_used": round(percentage_used, 2),
            "status": status,
            "period": budget.period
        })
        
        total_budgeted += budget.amount
        total_spent += spent
    
    db.commit()
    
    return {
        "budgets": overview,
        "summary": {
            "total_budgeted": total_budgeted,
            "total_spent": total_spent,
            "total_remaining": total_budgeted - total_spent,
            "overall_percentage": round((total_spent / total_budgeted * 100) if total_budgeted > 0 else 0, 2)
        }
    }
