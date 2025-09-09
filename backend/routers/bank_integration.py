from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import json
from datetime import datetime, timedelta
import os
from pydantic import BaseModel

from database import get_db
from models import User, Account, Transaction, BankConnection
from schemas import BankConnectionCreate, BankConnectionResponse, TransactionImport
from routers.auth import get_current_user

router = APIRouter()

# Mock bank data for demonstration (replace with real bank API like Plaid)
class MockBankAPI:
    @staticmethod
    def get_accounts(bank_token: str):
        """Mock bank accounts data"""
        return [
            {
                "account_id": "checking_001",
                "name": "Primary Checking",
                "type": "checking",
                "balance": 15750.45,
                "currency": "USD",
                "institution_name": "Chase Bank"
            },
            {
                "account_id": "savings_001", 
                "name": "High Yield Savings",
                "type": "savings",
                "balance": 45230.78,
                "currency": "USD",
                "institution_name": "Chase Bank"
            },
            {
                "account_id": "credit_001",
                "name": "Chase Freedom Card",
                "type": "credit_card",
                "balance": -2150.30,
                "currency": "USD", 
                "institution_name": "Chase Bank"
            }
        ]
    
    @staticmethod
    def get_transactions(bank_token: str, account_id: str, days: int = 30):
        """Mock transaction data"""
        import random
        from datetime import datetime, timedelta
        
        transactions = []
        categories = ["groceries", "dining", "transportation", "utilities", "entertainment", "shopping", "income"]
        
        for i in range(50):
            date = datetime.now() - timedelta(days=random.randint(0, days))
            category = random.choice(categories)
            
            if category == "income":
                amount = random.randint(2000, 5000)
                description = "Salary Deposit"
            else:
                amount = -random.randint(20, 500)
                description = f"{category.title()} Purchase"
            
            transactions.append({
                "transaction_id": f"txn_{i}",
                "account_id": account_id,
                "amount": amount,
                "description": description,
                "category": category,
                "date": date.isoformat(),
                "merchant_name": f"{category.title()} Store" if category != "income" else "Employer"
            })
        
        return sorted(transactions, key=lambda x: x["date"], reverse=True)

@router.post("/connect", response_model=BankConnectionResponse)
async def connect_bank_account(
    connection_data: BankConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect a bank account using bank credentials or token"""
    
    # In a real implementation, you would use Plaid or similar service
    # For demo purposes, we'll create a mock connection
    
    try:
        # Validate bank connection (mock)
        bank_accounts = MockBankAPI.get_accounts(connection_data.bank_token)
        
        # Create bank connection record
        bank_connection = BankConnection(
            user_id=current_user.id,
            institution_name=connection_data.institution_name,
            bank_token=connection_data.bank_token,  # In production, encrypt this
            is_active=True
        )
        
        db.add(bank_connection)
        db.commit()
        db.refresh(bank_connection)
        
        # Import bank accounts
        imported_accounts = []
        for bank_account in bank_accounts:
            # Check if account already exists
            existing_account = db.query(Account).filter(
                Account.user_id == current_user.id,
                Account.external_account_id == bank_account["account_id"]
            ).first()
            
            if not existing_account:
                account = Account(
                    user_id=current_user.id,
                    name=bank_account["name"],
                    account_type=bank_account["type"],
                    balance=bank_account["balance"],
                    currency=bank_account.get("currency", "USD"),
                    external_account_id=bank_account["account_id"],
                    bank_connection_id=bank_connection.id,
                    is_active=True
                )
                
                db.add(account)
                imported_accounts.append(account)
        
        db.commit()
        
        return BankConnectionResponse(
            id=bank_connection.id,
            institution_name=bank_connection.institution_name,
            connected_accounts=len(bank_accounts),
            is_active=True,
            created_at=bank_connection.created_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect bank account: {str(e)}"
        )

@router.get("/connections", response_model=List[BankConnectionResponse])
async def get_bank_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's bank connections"""
    
    connections = db.query(BankConnection).filter(
        BankConnection.user_id == current_user.id,
        BankConnection.is_active == True
    ).all()
    
    return [
        BankConnectionResponse(
            id=conn.id,
            institution_name=conn.institution_name,
            connected_accounts=len(conn.accounts),
            is_active=conn.is_active,
            created_at=conn.created_at
        )
        for conn in connections
    ]

@router.post("/import-transactions/{connection_id}")
async def import_transactions(
    connection_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import transactions from connected bank account"""
    
    # Get bank connection
    connection = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.user_id == current_user.id,
        BankConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank connection not found"
        )
    
    try:
        imported_count = 0
        
        # Get connected accounts
        accounts = db.query(Account).filter(
            Account.bank_connection_id == connection_id,
            Account.user_id == current_user.id
        ).all()
        
        for account in accounts:
            # Get transactions from bank API (mock)
            bank_transactions = MockBankAPI.get_transactions(
                connection.bank_token, 
                account.external_account_id, 
                days
            )
            
            for bank_txn in bank_transactions:
                # Check if transaction already exists
                existing_txn = db.query(Transaction).filter(
                    Transaction.external_transaction_id == bank_txn["transaction_id"]
                ).first()
                
                if not existing_txn:
                    # Determine transaction type
                    if bank_txn["amount"] > 0:
                        txn_type = "income"
                    else:
                        txn_type = "expense"
                    
                    transaction = Transaction(
                        user_id=current_user.id,
                        account_id=account.id,
                        amount=abs(bank_txn["amount"]),
                        description=bank_txn["description"],
                        category=bank_txn["category"],
                        transaction_type=txn_type,
                        date=datetime.fromisoformat(bank_txn["date"].replace('Z', '+00:00')),
                        external_transaction_id=bank_txn["transaction_id"],
                        merchant_name=bank_txn.get("merchant_name")
                    )
                    
                    db.add(transaction)
                    imported_count += 1
            
            # Update account balance
            account.balance = sum(
                txn["amount"] for txn in bank_transactions 
                if txn["account_id"] == account.external_account_id
            )
        
        db.commit()
        
        return {
            "message": f"Successfully imported {imported_count} transactions",
            "imported_count": imported_count,
            "connection_id": connection_id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import transactions: {str(e)}"
        )

@router.delete("/connections/{connection_id}")
async def disconnect_bank_account(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect a bank account"""
    
    connection = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.user_id == current_user.id
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank connection not found"
        )
    
    # Deactivate connection
    connection.is_active = False
    
    # Deactivate associated accounts
    accounts = db.query(Account).filter(
        Account.bank_connection_id == connection_id
    ).all()
    
    for account in accounts:
        account.is_active = False
    
    db.commit()
    
    return {"message": "Bank account disconnected successfully"}

@router.get("/spending-analysis")
async def get_spending_analysis(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get spending analysis for the user"""
    
    from sqlalchemy import func, extract
    from collections import defaultdict
    
    # Get transactions for the specified period
    start_date = datetime.now() - timedelta(days=days)
    
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.transaction_type == "expense"
    ).all()
    
    # Analyze spending by category
    category_spending = defaultdict(float)
    daily_spending = defaultdict(float)
    
    for txn in transactions:
        category_spending[txn.category] += txn.amount
        day_key = txn.date.strftime('%Y-%m-%d')
        daily_spending[day_key] += txn.amount
    
    # Calculate averages
    total_spending = sum(category_spending.values())
    daily_average = total_spending / days if days > 0 else 0
    
    # Top spending categories
    top_categories = sorted(
        category_spending.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:5]
    
    return {
        "period_days": days,
        "total_spending": total_spending,
        "daily_average": daily_average,
        "category_breakdown": dict(category_spending),
        "top_categories": [
            {"category": cat, "amount": amount, "percentage": (amount/total_spending)*100}
            for cat, amount in top_categories
        ],
        "daily_spending": dict(daily_spending)
    }

@router.get("/financial-health-score")
async def get_financial_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate and return user's financial health score"""
    
    # Get user's accounts and transactions
    accounts = db.query(Account).filter(
        Account.user_id == current_user.id,
        Account.is_active == True
    ).all()
    
    # Get recent transactions (last 90 days)
    start_date = datetime.now() - timedelta(days=90)
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date
    ).all()
    
    # Calculate financial health metrics
    total_balance = sum(acc.balance for acc in accounts)
    
    # Income vs Expenses
    income = sum(txn.amount for txn in transactions if txn.transaction_type == "income")
    expenses = sum(txn.amount for txn in transactions if txn.transaction_type == "expense")
    
    # Savings rate
    savings_rate = ((income - expenses) / income * 100) if income > 0 else 0
    
    # Emergency fund (assuming savings accounts)
    emergency_fund = sum(
        acc.balance for acc in accounts 
        if acc.account_type == "savings"
    )
    
    monthly_expenses = expenses / 3 if expenses > 0 else 1  # 3 months of data
    emergency_fund_months = emergency_fund / monthly_expenses if monthly_expenses > 0 else 0
    
    # Calculate score components (0-100 scale)
    savings_score = min(savings_rate * 2, 100)  # 50% savings rate = 100 points
    emergency_score = min(emergency_fund_months * 16.67, 100)  # 6 months = 100 points
    balance_score = min(total_balance / 10000 * 100, 100)  # $10k = 100 points
    
    # Overall score (weighted average)
    overall_score = (
        savings_score * 0.4 +  # 40% weight
        emergency_score * 0.35 +  # 35% weight
        balance_score * 0.25  # 25% weight
    )
    
    # Determine health level
    if overall_score >= 80:
        health_level = "Excellent"
        color = "emerald"
    elif overall_score >= 60:
        health_level = "Good"
        color = "blue"
    elif overall_score >= 40:
        health_level = "Fair"
        color = "yellow"
    else:
        health_level = "Needs Improvement"
        color = "red"
    
    # Generate recommendations
    recommendations = []
    
    if savings_rate < 20:
        recommendations.append({
            "type": "savings",
            "title": "Increase Savings Rate",
            "description": "Aim to save at least 20% of your income for better financial security.",
            "priority": "high"
        })
    
    if emergency_fund_months < 3:
        recommendations.append({
            "type": "emergency_fund",
            "title": "Build Emergency Fund",
            "description": "Work towards saving 3-6 months of expenses for emergencies.",
            "priority": "high"
        })
    
    if total_balance < 5000:
        recommendations.append({
            "type": "balance",
            "title": "Increase Account Balances",
            "description": "Focus on building your account balances for financial stability.",
            "priority": "medium"
        })
    
    return {
        "overall_score": round(overall_score, 1),
        "health_level": health_level,
        "color": color,
        "components": {
            "savings_rate": {
                "score": round(savings_score, 1),
                "value": round(savings_rate, 1),
                "label": "Savings Rate"
            },
            "emergency_fund": {
                "score": round(emergency_score, 1),
                "value": round(emergency_fund_months, 1),
                "label": "Emergency Fund (months)"
            },
            "total_balance": {
                "score": round(balance_score, 1),
                "value": total_balance,
                "label": "Total Balance"
            }
        },
        "recommendations": recommendations,
        "summary": {
            "total_balance": total_balance,
            "monthly_income": income / 3,
            "monthly_expenses": monthly_expenses,
            "savings_rate": savings_rate,
            "emergency_fund_months": emergency_fund_months
        }
    }

@router.get("/investment-recommendations")
async def get_investment_recommendations(
    risk_tolerance: str = "moderate",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get personalized investment recommendations based on user profile"""
    
    # Get user's financial health score
    health_data = await get_financial_health_score(db=db, current_user=current_user)
    
    # Base recommendations on risk tolerance and financial health
    recommendations = []
    
    if risk_tolerance.lower() == "conservative":
        recommendations = [
            {
                "symbol": "VTI",
                "name": "Vanguard Total Stock Market ETF",
                "type": "ETF",
                "allocation_percentage": 30,
                "risk_level": "Low",
                "expected_return": "6-8%",
                "reason": "Broad market exposure with low fees"
            },
            {
                "symbol": "BND",
                "name": "Vanguard Total Bond Market ETF", 
                "type": "ETF",
                "allocation_percentage": 50,
                "risk_level": "Very Low",
                "expected_return": "3-5%",
                "reason": "Stable income with capital preservation"
            },
            {
                "symbol": "VMOT",
                "name": "Vanguard Ultra-Short-Term Bond ETF",
                "type": "ETF", 
                "allocation_percentage": 20,
                "risk_level": "Very Low",
                "expected_return": "2-4%",
                "reason": "High liquidity with minimal risk"
            }
        ]
    elif risk_tolerance.lower() == "aggressive":
        recommendations = [
            {
                "symbol": "QQQ",
                "name": "Invesco QQQ Trust ETF",
                "type": "ETF",
                "allocation_percentage": 40,
                "risk_level": "High",
                "expected_return": "10-15%",
                "reason": "Technology-focused growth potential"
            },
            {
                "symbol": "VTI", 
                "name": "Vanguard Total Stock Market ETF",
                "type": "ETF",
                "allocation_percentage": 35,
                "risk_level": "Medium",
                "expected_return": "8-12%",
                "reason": "Broad market diversification"
            },
            {
                "symbol": "VXUS",
                "name": "Vanguard Total International Stock ETF",
                "type": "ETF",
                "allocation_percentage": 25,
                "risk_level": "Medium-High",
                "expected_return": "7-11%", 
                "reason": "International diversification"
            }
        ]
    else:  # moderate
        recommendations = [
            {
                "symbol": "VTI",
                "name": "Vanguard Total Stock Market ETF",
                "type": "ETF",
                "allocation_percentage": 40,
                "risk_level": "Medium",
                "expected_return": "7-10%",
                "reason": "Balanced growth with diversification"
            },
            {
                "symbol": "BND",
                "name": "Vanguard Total Bond Market ETF",
                "type": "ETF",
                "allocation_percentage": 30,
                "risk_level": "Low",
                "expected_return": "3-6%",
                "reason": "Income generation and stability"
            },
            {
                "symbol": "VXUS",
                "name": "Vanguard Total International Stock ETF", 
                "type": "ETF",
                "allocation_percentage": 20,
                "risk_level": "Medium",
                "expected_return": "6-9%",
                "reason": "International diversification"
            },
            {
                "symbol": "VNQ",
                "name": "Vanguard Real Estate Investment Trust ETF",
                "type": "ETF",
                "allocation_percentage": 10,
                "risk_level": "Medium",
                "expected_return": "5-8%",
                "reason": "Real estate exposure and inflation hedge"
            }
        ]
    
    # Adjust recommendations based on financial health
    if health_data["overall_score"] < 60:
        # Focus more on stability for lower financial health
        for rec in recommendations:
            if rec["risk_level"] in ["High", "Very High"]:
                rec["allocation_percentage"] = rec["allocation_percentage"] * 0.7
            elif rec["risk_level"] in ["Low", "Very Low"]:
                rec["allocation_percentage"] = rec["allocation_percentage"] * 1.3
    
    # Normalize allocations to 100%
    total_allocation = sum(rec["allocation_percentage"] for rec in recommendations)
    for rec in recommendations:
        rec["allocation_percentage"] = round(
            (rec["allocation_percentage"] / total_allocation) * 100, 1
        )
    
    return {
        "risk_tolerance": risk_tolerance,
        "financial_health_score": health_data["overall_score"],
        "recommendations": recommendations,
        "total_recommended_allocation": 100,
        "notes": [
            "These recommendations are based on your risk tolerance and financial health.",
            "Consider consulting with a financial advisor before making investment decisions.",
            "Regularly review and rebalance your portfolio."
        ]
    }
