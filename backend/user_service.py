from sqlalchemy.orm import Session
from models import User, UserProfile, InvestmentAccount, Portfolio, Holding, Transaction, Watchlist, WatchlistItem
# from plaid_integration import plaid_service
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json

class UserService:
    """Service class for user management and personalization"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_test_user(self) -> User:
        """Create the test user account"""
        # Check if test user already exists
        test_user = self.db.query(User).filter(User.email == "testing123@gmail.com").first()
        if test_user:
            return test_user
        
        # Create test user
        test_user = User(
            email="testing123@gmail.com",
            first_name="Test",
            last_name="User",
            is_active=True,
            is_verified=True
        )
        test_user.set_password("password123")
        
        self.db.add(test_user)
        self.db.commit()
        self.db.refresh(test_user)
        
        # Create test user profile
        test_profile = UserProfile(
            user_id=test_user.id,
            phone="+1-555-0123",
            date_of_birth=datetime(1990, 1, 1),
            address="123 Test Street",
            city="New York",
            state="NY",
            zip_code="10001",
            country="US",
            risk_tolerance="moderate",
            investment_goals=["retirement", "wealth_building"],
            investment_horizon="long_term",
            annual_income=75000.0,
            net_worth=150000.0,
            bio="Test user account for Ezana Finance platform"
        )
        
        self.db.add(test_profile)
        
        # Create default portfolio
        default_portfolio = Portfolio(
            user_id=test_user.id,
            name="My Portfolio",
            description="Default investment portfolio",
            is_default=True,
            total_value=50000.0,
            total_cost_basis=45000.0,
            total_gain_loss=5000.0,
            total_gain_loss_percent=11.11,
            daily_change=250.0,
            daily_change_percent=0.5,
            weekly_change=1200.0,
            weekly_change_percent=2.4,
            monthly_change=3500.0,
            monthly_change_percent=7.0,
            yearly_change=8500.0,
            yearly_change_percent=17.0,
            asset_allocation={
                "stocks": 70,
                "bonds": 20,
                "cash": 10
            }
        )
        
        self.db.add(default_portfolio)
        
        # Create default watchlist
        default_watchlist = Watchlist(
            user_id=test_user.id,
            name="My Watchlist",
            description="Default watchlist for tracking stocks",
            is_public=False
        )
        
        self.db.add(default_watchlist)
        self.db.commit()
        self.db.refresh(default_watchlist)
        
        # Add some sample watchlist items
        sample_stocks = [
            {"symbol": "AAPL", "name": "Apple Inc.", "security_type": "equity"},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "security_type": "equity"},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "security_type": "equity"},
            {"symbol": "TSLA", "name": "Tesla Inc.", "security_type": "equity"},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "security_type": "equity"}
        ]
        
        for stock in sample_stocks:
            watchlist_item = WatchlistItem(
                watchlist_id=default_watchlist.id,
                symbol=stock["symbol"],
                name=stock["name"],
                security_type=stock["security_type"]
            )
            self.db.add(watchlist_item)
        
        self.db.commit()
        return test_user
    
    def get_user_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get complete user profile with personalization data"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        profile = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        portfolios = self.db.query(Portfolio).filter(Portfolio.user_id == user_id).all()
        watchlists = self.db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
        investment_accounts = self.db.query(InvestmentAccount).filter(InvestmentAccount.user_id == user_id).all()
        
        # Get portfolio holdings
        portfolio_data = []
        for portfolio in portfolios:
            holdings = self.db.query(Holding).join(InvestmentAccount).filter(
                InvestmentAccount.user_id == user_id
            ).all()
            
            portfolio_data.append({
                "id": portfolio.id,
                "name": portfolio.name,
                "description": portfolio.description,
                "is_default": portfolio.is_default,
                "total_value": portfolio.total_value,
                "total_cost_basis": portfolio.total_cost_basis,
                "total_gain_loss": portfolio.total_gain_loss,
                "total_gain_loss_percent": portfolio.total_gain_loss_percent,
                "daily_change": portfolio.daily_change,
                "daily_change_percent": portfolio.daily_change_percent,
                "weekly_change": portfolio.weekly_change,
                "weekly_change_percent": portfolio.weekly_change_percent,
                "monthly_change": portfolio.monthly_change,
                "monthly_change_percent": portfolio.monthly_change_percent,
                "yearly_change": portfolio.yearly_change,
                "yearly_change_percent": portfolio.yearly_change_percent,
                "asset_allocation": portfolio.asset_allocation,
                "holdings": [
                    {
                        "symbol": holding.symbol,
                        "name": holding.name,
                        "quantity": holding.quantity,
                        "current_price": holding.current_price,
                        "market_value": holding.market_value,
                        "cost_basis": holding.cost_basis,
                        "unrealized_gain_loss": holding.unrealized_gain_loss,
                        "unrealized_gain_loss_percent": holding.unrealized_gain_loss_percent
                    } for holding in holdings
                ]
            })
        
        # Get watchlist data
        watchlist_data = []
        for watchlist in watchlists:
            items = self.db.query(WatchlistItem).filter(WatchlistItem.watchlist_id == watchlist.id).all()
            watchlist_data.append({
                "id": watchlist.id,
                "name": watchlist.name,
                "description": watchlist.description,
                "is_public": watchlist.is_public,
                "items": [
                    {
                        "symbol": item.symbol,
                        "name": item.name,
                        "security_type": item.security_type,
                        "price_alert_high": item.price_alert_high,
                        "price_alert_low": item.price_alert_low,
                        "added_at": item.added_at.isoformat()
                    } for item in items
                ]
            })
        
        # Get investment accounts data
        accounts_data = []
        for account in investment_accounts:
            accounts_data.append({
                "id": account.id,
                "account_name": account.account_name,
                "account_type": account.account_type,
                "institution_name": account.institution_name,
                "current_balance": account.current_balance,
                "available_balance": account.available_balance,
                "currency": account.currency,
                "is_active": account.is_active,
                "last_sync": account.last_sync.isoformat() if account.last_sync else None
            })
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "profile": {
                "phone": profile.phone if profile else None,
                "date_of_birth": profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None,
                "address": profile.address if profile else None,
                "city": profile.city if profile else None,
                "state": profile.state if profile else None,
                "zip_code": profile.zip_code if profile else None,
                "country": profile.country if profile else None,
                "risk_tolerance": profile.risk_tolerance if profile else None,
                "investment_goals": profile.investment_goals if profile else None,
                "investment_horizon": profile.investment_horizon if profile else None,
                "annual_income": profile.annual_income if profile else None,
                "net_worth": profile.net_worth if profile else None,
                "bio": profile.bio if profile else None
            },
            "portfolios": portfolio_data,
            "watchlists": watchlist_data,
            "investment_accounts": accounts_data
        }
    
    def sync_plaid_data(self, user_id: int, access_token: str) -> Dict[str, Any]:
        """Sync user's Plaid data"""
        try:
            # Mock data for demo purposes
            accounts = []
            transactions = []
            holdings = []
            investment_transactions = []
            
            # Update or create investment accounts
            for account_data in accounts:
                existing_account = self.db.query(InvestmentAccount).filter(
                    InvestmentAccount.plaid_account_id == account_data['account_id']
                ).first()
                
                if existing_account:
                    # Update existing account
                    existing_account.current_balance = account_data['balance']
                    existing_account.available_balance = account_data.get('available_balance', 0)
                    existing_account.last_sync = datetime.utcnow()
                    existing_account.sync_status = 'success'
                else:
                    # Create new account
                    new_account = InvestmentAccount(
                        user_id=user_id,
                        plaid_account_id=account_data['account_id'],
                        plaid_item_id="",  # This would come from the item creation
                        plaid_access_token=access_token,
                        account_name=account_data['name'],
                        account_type=account_data['type'],
                        institution_name=account_data.get('institution_name', ''),
                        institution_id=account_data.get('institution_id', ''),
                        current_balance=account_data['balance'],
                        available_balance=account_data.get('available_balance', 0),
                        currency=account_data['currency'],
                        last_sync=datetime.utcnow(),
                        sync_status='success'
                    )
                    self.db.add(new_account)
            
            # Update holdings
            for holding_data in holdings:
                account = self.db.query(InvestmentAccount).filter(
                    InvestmentAccount.plaid_account_id == holding_data['account_id']
                ).first()
                
                if account:
                    existing_holding = self.db.query(Holding).filter(
                        Holding.account_id == account.id,
                        Holding.security_id == holding_data['security_id']
                    ).first()
                    
                    if existing_holding:
                        # Update existing holding
                        existing_holding.quantity = holding_data['quantity']
                        existing_holding.current_price = holding_data['price']
                        existing_holding.market_value = holding_data['market_value']
                        existing_holding.cost_basis = holding_data.get('cost_basis', 0)
                        existing_holding.unrealized_gain_loss = holding_data['market_value'] - holding_data.get('cost_basis', 0)
                        existing_holding.last_updated = datetime.utcnow()
                    else:
                        # Create new holding
                        new_holding = Holding(
                            account_id=account.id,
                            security_id=holding_data['security_id'],
                            symbol=holding_data['symbol'],
                            name=holding_data['name'],
                            security_type=holding_data['security_type'],
                            quantity=holding_data['quantity'],
                            current_price=holding_data['price'],
                            market_value=holding_data['market_value'],
                            cost_basis=holding_data.get('cost_basis', 0),
                            unrealized_gain_loss=holding_data['market_value'] - holding_data.get('cost_basis', 0)
                        )
                        self.db.add(new_holding)
            
            self.db.commit()
            
            return {
                "success": True,
                "message": "Plaid data synced successfully",
                "accounts_count": len(accounts),
                "transactions_count": len(transactions),
                "holdings_count": len(holdings),
                "investment_transactions_count": len(investment_transactions)
            }
            
        except Exception as e:
            self.db.rollback()
            return {
                "success": False,
                "message": f"Error syncing Plaid data: {str(e)}"
            }
    
    def get_personalized_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        """Get personalized dashboard data for the user"""
        user_profile = self.get_user_profile(user_id)
        if not user_profile:
            return {}
        
        # Calculate portfolio performance
        portfolios = user_profile.get('portfolios', [])
        total_portfolio_value = sum(p['total_value'] for p in portfolios)
        total_gain_loss = sum(p['total_gain_loss'] for p in portfolios)
        total_gain_loss_percent = (total_gain_loss / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
        
        # Get recent transactions
        recent_transactions = self.db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.date.desc()).limit(10).all()
        
        # Get top holdings
        top_holdings = self.db.query(Holding).join(InvestmentAccount).filter(
            InvestmentAccount.user_id == user_id
        ).order_by(Holding.market_value.desc()).limit(5).all()
        
        return {
            "portfolio_summary": {
                "total_value": total_portfolio_value,
                "total_gain_loss": total_gain_loss,
                "total_gain_loss_percent": total_gain_loss_percent,
                "daily_change": sum(p['daily_change'] for p in portfolios),
                "daily_change_percent": sum(p['daily_change_percent'] for p in portfolios),
                "weekly_change": sum(p['weekly_change'] for p in portfolios),
                "weekly_change_percent": sum(p['weekly_change_percent'] for p in portfolios),
                "monthly_change": sum(p['monthly_change'] for p in portfolios),
                "monthly_change_percent": sum(p['monthly_change_percent'] for p in portfolios)
            },
            "recent_transactions": [
                {
                    "id": t.id,
                    "description": t.description,
                    "amount": t.amount,
                    "date": t.date.isoformat(),
                    "type": t.transaction_type,
                    "symbol": t.symbol
                } for t in recent_transactions
            ],
            "top_holdings": [
                {
                    "symbol": h.symbol,
                    "name": h.name,
                    "quantity": h.quantity,
                    "current_price": h.current_price,
                    "market_value": h.market_value,
                    "unrealized_gain_loss": h.unrealized_gain_loss,
                    "unrealized_gain_loss_percent": h.unrealized_gain_loss_percent
                } for h in top_holdings
            ],
            "user_preferences": user_profile.get('profile', {}),
            "watchlists": user_profile.get('watchlists', [])
        }
