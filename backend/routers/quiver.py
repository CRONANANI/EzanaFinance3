from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import httpx
import json
from datetime import datetime, timedelta
import os

router = APIRouter()

# Quiver API configuration
QUIVER_API_BASE = "https://api.quiverquant.com/beta"
QUIVER_API_KEY = os.getenv("QUIVER_API_KEY", "2fb95c89103d4cb07b26fff07c8cfa77626291da")

class QuiverAPIClient:
    def __init__(self):
        self.base_url = QUIVER_API_BASE
        self.api_key = QUIVER_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

    async def make_request(self, endpoint: str, params: dict = None):
        """Make a request to the Quiver API"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/{endpoint}",
                    headers=self.headers,
                    params=params or {},
                    timeout=30.0
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    # Return mock data if API fails
                    return self.get_mock_data(endpoint)
            except Exception as e:
                # Return mock data if request fails
                return self.get_mock_data(endpoint)

    def get_mock_data(self, endpoint: str):
        """Generate mock data when API is unavailable"""
        if "congresstrading" in endpoint or "congressional-trading" in endpoint:
            return self.generate_mock_congress_trading()
        elif "government-contracts" in endpoint:
            return self.generate_mock_government_contracts()
        elif "house-trading" in endpoint:
            return self.generate_mock_house_trading()
        elif "senator-trading" in endpoint:
            return self.generate_mock_senator_trading()
        elif "lobbying" in endpoint:
            return self.generate_mock_lobbying()
        elif "patent" in endpoint:
            return self.generate_mock_patents()
        else:
            return []

    def generate_mock_congress_trading(self):
        """Generate mock congressional trading data"""
        import random
        
        companies = [
            {"ticker": "AAPL", "name": "Apple Inc."},
            {"ticker": "MSFT", "name": "Microsoft Corporation"},
            {"ticker": "GOOGL", "name": "Alphabet Inc."},
            {"ticker": "TSLA", "name": "Tesla Inc."},
            {"ticker": "META", "name": "Meta Platforms Inc."},
            {"ticker": "NVDA", "name": "NVIDIA Corporation"},
            {"ticker": "JPM", "name": "JPMorgan Chase & Co."},
            {"ticker": "JNJ", "name": "Johnson & Johnson"},
            {"ticker": "V", "name": "Visa Inc."},
            {"ticker": "PG", "name": "Procter & Gamble Co."}
        ]
        
        congress_people = [
            {"name": "Nancy Pelosi", "party": "D", "chamber": "House", "state": "CA"},
            {"name": "Mitch McConnell", "party": "R", "chamber": "Senate", "state": "KY"},
            {"name": "Chuck Schumer", "party": "D", "chamber": "Senate", "state": "NY"},
            {"name": "Kevin McCarthy", "party": "R", "chamber": "House", "state": "CA"},
            {"name": "Alexandria Ocasio-Cortez", "party": "D", "chamber": "House", "state": "NY"}
        ]
        
        trades = []
        for i in range(50):
            company = random.choice(companies)
            person = random.choice(congress_people)
            trade_type = random.choice(["buy", "sell"])
            amount = random.randint(5000, 500000)
            trade_date = datetime.now() - timedelta(days=random.randint(1, 365))
            
            trades.append({
                "congressPersonName": person["name"],
                "ticker": company["ticker"],
                "companyName": company["name"],
                "tradeType": trade_type,
                "amount": amount,
                "tradeDate": trade_date.isoformat(),
                "party": person["party"],
                "chamber": person["chamber"],
                "state": person["state"]
            })
        
        return sorted(trades, key=lambda x: x["tradeDate"], reverse=True)

    def generate_mock_government_contracts(self):
        """Generate mock government contracts data"""
        import random
        
        companies = [
            {"ticker": "BA", "name": "Boeing Co."},
            {"ticker": "LMT", "name": "Lockheed Martin Corp."},
            {"ticker": "RTX", "name": "Raytheon Technologies Corp."},
            {"ticker": "GD", "name": "General Dynamics Corp."},
            {"ticker": "NOC", "name": "Northrop Grumman Corp."}
        ]
        
        agencies = ["Department of Defense", "NASA", "Department of Energy", "Department of Homeland Security"]
        
        contracts = []
        for i in range(30):
            company = random.choice(companies)
            agency = random.choice(agencies)
            value = random.randint(100000, 50000000)
            contract_date = datetime.now() - timedelta(days=random.randint(1, 180))
            
            contracts.append({
                "companyName": company["name"],
                "ticker": company["ticker"],
                "contractValue": value,
                "agency": agency,
                "contractDate": contract_date.isoformat(),
                "description": f"Contract with {agency}"
            })
        
        return sorted(contracts, key=lambda x: x["contractDate"], reverse=True)

    def generate_mock_house_trading(self):
        """Generate mock house trading data"""
        return self.generate_mock_congress_trading()[:25]

    def generate_mock_senator_trading(self):
        """Generate mock senator trading data"""
        return self.generate_mock_congress_trading()[:20]

    def generate_mock_lobbying(self):
        """Generate mock lobbying data"""
        import random
        
        firms = ["Akin Gump", "Brownstein Hyatt", "Covington & Burling", "Holland & Knight"]
        clients = ["Tech Corp", "Pharma Inc", "Energy LLC", "Finance Group"]
        
        lobbying = []
        for i in range(25):
            firm = random.choice(firms)
            client = random.choice(clients)
            amount = random.randint(50000, 1000000)
            report_date = datetime.now() - timedelta(days=random.randint(1, 90))
            
            lobbying.append({
                "firmName": firm,
                "clientName": client,
                "amount": amount,
                "reportDate": report_date.isoformat(),
                "issues": "Policy Advocacy"
            })
        
        return sorted(lobbying, key=lambda x: x["reportDate"], reverse=True)

    def generate_mock_patents(self):
        """Generate mock patent data"""
        import random
        
        companies = [
            {"ticker": "AAPL", "name": "Apple Inc."},
            {"ticker": "MSFT", "name": "Microsoft Corporation"},
            {"ticker": "GOOGL", "name": "Alphabet Inc."}
        ]
        
        patents = []
        for i in range(20):
            company = random.choice(companies)
            patent_date = datetime.now() - timedelta(days=random.randint(1, 365))
            
            patents.append({
                "companyName": company["name"],
                "ticker": company["ticker"],
                "patentTitle": f"Innovation Patent {i+1}",
                "patentDate": patent_date.isoformat(),
                "status": random.choice(["Active", "Pending"]),
                "category": "Technology"
            })
        
        return sorted(patents, key=lambda x: x["patentDate"], reverse=True)

# Initialize the client
quiver_client = QuiverAPIClient()

@router.get("/congressional-trading")
async def get_congressional_trading(limit: int = Query(100, le=200)):
    """Get congressional trading data"""
    try:
        data = await quiver_client.make_request("bulk/congresstrading")
        if isinstance(data, list):
            return data[:limit]
        return data
    except Exception as e:
        # Return mock data as fallback
        return quiver_client.generate_mock_congress_trading()[:limit]

@router.get("/government-contracts")
async def get_government_contracts(limit: int = Query(50, le=100)):
    """Get government contracts data"""
    try:
        data = await quiver_client.make_request("government-contracts")
        if isinstance(data, list):
            return data[:limit]
        return data
    except Exception as e:
        return quiver_client.generate_mock_government_contracts()[:limit]

@router.get("/house-trading")
async def get_house_trading(limit: int = Query(50, le=100)):
    """Get House trading data"""
    try:
        data = await quiver_client.make_request("house-trading")
        if isinstance(data, list):
            return data[:limit]
        return data
    except Exception as e:
        return quiver_client.generate_mock_house_trading()[:limit]

@router.get("/senator-trading")
async def get_senator_trading(limit: int = Query(50, le=100)):
    """Get Senator trading data"""
    try:
        data = await quiver_client.make_request("senator-trading")
        if isinstance(data, list):
            return data[:limit]
        return data
    except Exception as e:
        return quiver_client.generate_mock_senator_trading()[:limit]

@router.get("/lobbying-activity")
async def get_lobbying_activity(limit: int = Query(50, le=100)):
    """Get lobbying activity data"""
    try:
        data = await quiver_client.make_request("lobbying-activity")
        if isinstance(data, list):
            return data[:limit]
        return data
    except Exception as e:
        return quiver_client.generate_mock_lobbying()[:limit]

@router.get("/patent-momentum")
async def get_patent_momentum(limit: int = Query(50, le=100)):
    """Get patent momentum data"""
    try:
        data = await quiver_client.make_request("patent-momentum")
        if isinstance(data, list):
            return data[:limit]
        return data
    except Exception as e:
        return quiver_client.generate_mock_patents()[:limit]

@router.get("/congressperson/{name}/portfolio")
async def get_congressperson_portfolio(name: str):
    """Get portfolio summary for a specific congressperson"""
    import random
    
    # Mock portfolio data for demonstration
    mock_portfolio = {
        "congressPersonName": name,
        "Party": random.choice(["D", "R", "I"]),
        "Chamber": random.choice(["House", "Senate"]),
        "State": random.choice(["CA", "NY", "TX", "FL"]),
        "Total_Portfolio_Value": random.randint(500000, 5000000),
        "YTD_Return": round(random.uniform(5, 25), 1),
        "YTD_Return_Amount": random.randint(50000, 500000),
        "Top_Holdings": [
            {
                "Ticker": "AAPL",
                "Company": "Apple Inc.",
                "Shares": random.randint(100, 1000),
                "Value": random.randint(50000, 200000),
                "Return": round(random.uniform(-10, 30), 1)
            },
            {
                "Ticker": "MSFT",
                "Company": "Microsoft Corp.",
                "Shares": random.randint(100, 1000),
                "Value": random.randint(50000, 200000),
                "Return": round(random.uniform(-10, 30), 1)
            },
            {
                "Ticker": "GOOGL",
                "Company": "Alphabet Inc.",
                "Shares": random.randint(50, 500),
                "Value": random.randint(50000, 200000),
                "Return": round(random.uniform(-10, 30), 1)
            }
        ],
        "Recent_Trades": [
            {
                "Date": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                "Ticker": random.choice(["AAPL", "MSFT", "GOOGL"]),
                "Company": random.choice(["Apple Inc.", "Microsoft Corp.", "Alphabet Inc."]),
                "Type": random.choice(["BUY", "SELL"]),
                "Amount": random.randint(10000, 100000),
                "Shares": random.randint(50, 500)
            }
            for _ in range(3)
        ]
    }
    
    return mock_portfolio
