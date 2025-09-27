import plaid
from plaid.api import plaid_api
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.investments_transactions_get_request import InvestmentsTransactionsGetRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from datetime import datetime, timedelta
from typing import List, Dict, Any
import os

# Plaid Configuration
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID", "your_plaid_client_id")
PLAID_SECRET = os.getenv("PLAID_SECRET", "your_plaid_secret")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")  # sandbox, development, production

# Initialize Plaid client
configuration = plaid.Configuration(
    host=plaid.Environment[PLAID_ENV],
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET,
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

class PlaidService:
    """Service class for Plaid API integration"""
    
    @staticmethod
    def create_link_token(user_id: str) -> str:
        """Create a link token for Plaid Link"""
        request = LinkTokenCreateRequest(
            products=[Products('transactions'), Products('investments')],
            client_name="Ezana Finance",
            country_codes=[CountryCode('US')],
            language='en',
            user=LinkTokenCreateRequestUser(
                client_user_id=user_id
            )
        )
        
        response = client.link_token_create(request)
        return response['link_token']
    
    @staticmethod
    def exchange_public_token(public_token: str) -> str:
        """Exchange public token for access token"""
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = client.item_public_token_exchange(request)
        return response['access_token']
    
    @staticmethod
    def get_accounts(access_token: str) -> List[Dict[str, Any]]:
        """Get all accounts for an access token"""
        request = AccountsGetRequest(access_token=access_token)
        response = client.accounts_get(request)
        
        accounts = []
        for account in response['accounts']:
            accounts.append({
                'account_id': account['account_id'],
                'name': account['name'],
                'type': account['type'],
                'subtype': account.get('subtype'),
                'balance': account['balances']['current'],
                'available_balance': account['balances'].get('available'),
                'currency': account['balances']['iso_currency_code'],
                'institution_id': account.get('institution_id'),
                'institution_name': account.get('institution_name')
            })
        
        return accounts
    
    @staticmethod
    def get_transactions(access_token: str, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get transactions for an access token"""
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()
        
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date.date(),
            end_date=end_date.date()
        )
        response = client.transactions_get(request)
        
        transactions = []
        for transaction in response['transactions']:
            transactions.append({
                'transaction_id': transaction['transaction_id'],
                'account_id': transaction['account_id'],
                'amount': transaction['amount'],
                'description': transaction['name'],
                'date': transaction['date'],
                'category': transaction.get('category', []),
                'merchant_name': transaction.get('merchant_name'),
                'pending': transaction['pending']
            })
        
        return transactions
    
    @staticmethod
    def get_investment_holdings(access_token: str) -> List[Dict[str, Any]]:
        """Get investment holdings for an access token"""
        request = InvestmentsHoldingsGetRequest(access_token=access_token)
        response = client.investments_holdings_get(request)
        
        holdings = []
        for holding in response['holdings']:
            security = next(
                (s for s in response['securities'] if s['security_id'] == holding['security_id']),
                None
            )
            
            if security:
                holdings.append({
                    'account_id': holding['account_id'],
                    'security_id': holding['security_id'],
                    'symbol': security.get('ticker_symbol'),
                    'name': security['name'],
                    'security_type': security['type'],
                    'quantity': holding['quantity'],
                    'price': holding['price'],
                    'market_value': holding['market_value'],
                    'cost_basis': holding.get('cost_basis'),
                    'institution_price': holding.get('institution_price'),
                    'institution_price_as_of': holding.get('institution_price_as_of'),
                    'institution_value': holding.get('institution_value')
                })
        
        return holdings
    
    @staticmethod
    def get_investment_transactions(access_token: str, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get investment transactions for an access token"""
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()
        
        request = InvestmentsTransactionsGetRequest(
            access_token=access_token,
            start_date=start_date.date(),
            end_date=end_date.date()
        )
        response = client.investments_transactions_get(request)
        
        transactions = []
        for transaction in response['investment_transactions']:
            security = next(
                (s for s in response['securities'] if s['security_id'] == transaction['security_id']),
                None
            )
            
            transactions.append({
                'transaction_id': transaction['investment_transaction_id'],
                'account_id': transaction['account_id'],
                'security_id': transaction['security_id'],
                'symbol': security.get('ticker_symbol') if security else None,
                'name': security['name'] if security else None,
                'amount': transaction['amount'],
                'quantity': transaction['quantity'],
                'price': transaction['price'],
                'date': transaction['date'],
                'type': transaction['type'],
                'subtype': transaction.get('subtype'),
                'fees': transaction.get('fees')
            })
        
        return transactions

# Initialize Plaid service
plaid_service = PlaidService()
