from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import random
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/Quiver/CongressionalTrading")
async def get_congressional_trading_data(limit: int = Query(100, le=200)):
    """Get congressional trading data for the market research API"""
    
    # Mock data generation
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
        {"name": "Alexandria Ocasio-Cortez", "party": "D", "chamber": "House", "state": "NY"},
        {"name": "Ted Cruz", "party": "R", "chamber": "Senate", "state": "TX"},
        {"name": "Elizabeth Warren", "party": "D", "chamber": "Senate", "state": "MA"},
        {"name": "Marco Rubio", "party": "R", "chamber": "Senate", "state": "FL"},
        {"name": "Bernie Sanders", "party": "I", "chamber": "Senate", "state": "VT"},
        {"name": "Josh Hawley", "party": "R", "chamber": "Senate", "state": "MO"}
    ]
    
    trades = []
    for i in range(limit):
        company = random.choice(companies)
        person = random.choice(congress_people)
        trade_type = random.choice(["buy", "sell", "option"])
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
            "state": person["state"],
            "owner": random.choice(["self", "spouse", "dependent"])
        })
    
    return sorted(trades, key=lambda x: x["tradeDate"], reverse=True)

@router.get("/Quiver/GovernmentContracts")
async def get_government_contracts_data(limit: int = Query(50, le=100)):
    """Get government contracts data"""
    
    companies = [
        {"ticker": "BA", "name": "Boeing Co."},
        {"ticker": "LMT", "name": "Lockheed Martin Corp."},
        {"ticker": "RTX", "name": "Raytheon Technologies Corp."},
        {"ticker": "GD", "name": "General Dynamics Corp."},
        {"ticker": "NOC", "name": "Northrop Grumman Corp."},
        {"ticker": "HON", "name": "Honeywell International Inc."},
        {"ticker": "GE", "name": "General Electric Co."},
        {"ticker": "CAT", "name": "Caterpillar Inc."},
        {"ticker": "DE", "name": "Deere & Co."},
        {"ticker": "IBM", "name": "International Business Machines Corp."}
    ]
    
    agencies = [
        "Department of Defense",
        "Department of Energy", 
        "NASA",
        "Department of Homeland Security",
        "Department of Transportation",
        "Department of Veterans Affairs",
        "General Services Administration",
        "Department of Health and Human Services"
    ]
    
    contracts = []
    for i in range(limit):
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
            "description": f"Government contract with {agency}",
            "contractType": random.choice(["Fixed Price", "Cost Plus", "Time & Materials", "IDIQ"])
        })
    
    return sorted(contracts, key=lambda x: x["contractDate"], reverse=True)

@router.get("/Quiver/HouseTrading")
async def get_house_trading_data(limit: int = Query(50, le=100)):
    """Get House trading data"""
    
    companies = [
        {"ticker": "AAPL", "name": "Apple Inc."},
        {"ticker": "MSFT", "name": "Microsoft Corporation"},
        {"ticker": "GOOGL", "name": "Alphabet Inc."},
        {"ticker": "TSLA", "name": "Tesla Inc."},
        {"ticker": "META", "name": "Meta Platforms Inc."}
    ]
    
    representatives = [
        {"name": "Nancy Pelosi", "party": "D", "state": "CA"},
        {"name": "Kevin McCarthy", "party": "R", "state": "CA"},
        {"name": "Alexandria Ocasio-Cortez", "party": "D", "state": "NY"},
        {"name": "Jim Jordan", "party": "R", "state": "OH"},
        {"name": "Adam Schiff", "party": "D", "state": "CA"},
        {"name": "Matt Gaetz", "party": "R", "state": "FL"},
        {"name": "Rashida Tlaib", "party": "D", "state": "MI"},
        {"name": "Marjorie Taylor Greene", "party": "R", "state": "GA"}
    ]
    
    trades = []
    for i in range(limit):
        company = random.choice(companies)
        rep = random.choice(representatives)
        trade_type = random.choice(["buy", "sell"])
        amount = random.randint(5000, 300000)
        trade_date = datetime.now() - timedelta(days=random.randint(1, 365))
        
        trades.append({
            "congressPersonName": rep["name"],
            "ticker": company["ticker"],
            "companyName": company["name"],
            "tradeType": trade_type,
            "amount": amount,
            "tradeDate": trade_date.isoformat(),
            "party": rep["party"],
            "state": rep["state"],
            "chamber": "House"
        })
    
    return sorted(trades, key=lambda x: x["tradeDate"], reverse=True)

@router.get("/Quiver/LobbyingActivity")
async def get_lobbying_activity_data(limit: int = Query(50, le=100)):
    """Get lobbying activity data"""
    
    lobbying_firms = [
        "Akin Gump Strauss Hauer & Feld LLP",
        "Brownstein Hyatt Farber Schreck LLP",
        "Holland & Knight LLP",
        "Squire Patton Boggs LLP",
        "Covington & Burling LLP",
        "K&L Gates LLP",
        "Williams & Jensen PLLC",
        "Cornerstone Government Affairs"
    ]
    
    clients = [
        "Pharmaceutical Research and Manufacturers of America",
        "American Petroleum Institute",
        "American Bankers Association",
        "National Association of Realtors",
        "American Medical Association",
        "U.S. Chamber of Commerce",
        "Business Roundtable",
        "National Association of Manufacturers"
    ]
    
    issues = [
        "Healthcare Reform",
        "Tax Policy",
        "Financial Services Regulation",
        "Energy Policy",
        "Technology Regulation",
        "Trade Policy",
        "Immigration Reform",
        "Infrastructure Investment"
    ]
    
    lobbying = []
    for i in range(limit):
        firm = random.choice(lobbying_firms)
        client = random.choice(clients)
        issue = random.choice(issues)
        amount = random.randint(50000, 1000000)
        report_date = datetime.now() - timedelta(days=random.randint(1, 90))
        
        lobbying.append({
            "firmName": firm,
            "clientName": client,
            "amount": amount,
            "reportDate": report_date.isoformat(),
            "issues": issue,
            "registrant": client,
            "quarter": f"Q{random.randint(1, 4)} {datetime.now().year}"
        })
    
    return sorted(lobbying, key=lambda x: x["reportDate"], reverse=True)

@router.get("/Quiver/PatentMomentum")
async def get_patent_momentum_data(limit: int = Query(50, le=100)):
    """Get patent momentum data"""
    
    companies = [
        {"ticker": "AAPL", "name": "Apple Inc."},
        {"ticker": "MSFT", "name": "Microsoft Corporation"},
        {"ticker": "GOOGL", "name": "Alphabet Inc."},
        {"ticker": "IBM", "name": "International Business Machines Corp."},
        {"ticker": "INTC", "name": "Intel Corporation"},
        {"ticker": "NVDA", "name": "NVIDIA Corporation"},
        {"ticker": "AMZN", "name": "Amazon.com Inc."},
        {"ticker": "META", "name": "Meta Platforms Inc."}
    ]
    
    categories = [
        "Artificial Intelligence",
        "Biotechnology", 
        "Pharmaceuticals",
        "Automotive Technology",
        "Energy Storage",
        "Semiconductors",
        "Software",
        "Telecommunications"
    ]
    
    patents = []
    for i in range(limit):
        company = random.choice(companies)
        category = random.choice(categories)
        patent_date = datetime.now() - timedelta(days=random.randint(1, 365))
        
        patents.append({
            "companyName": company["name"],
            "ticker": company["ticker"],
            "patentTitle": f"Innovative {category} Patent {i+1}",
            "patentDate": patent_date.isoformat(),
            "status": random.choice(["Active", "Pending", "Granted"]),
            "category": category,
            "patentNumber": f"US{random.randint(10000000, 99999999)}",
            "inventors": random.randint(1, 5),
            "claims": random.randint(10, 50)
        })
    
    return sorted(patents, key=lambda x: x["patentDate"], reverse=True)
