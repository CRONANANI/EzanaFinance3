"""
Finnhub API proxy router - proxies stock market data from Finnhub to the frontend.
API key is stored in backend/.env as FINNHUB_API_KEY.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import httpx
import os

router = APIRouter()
FINNHUB_BASE = "https://finnhub.io/api/v1"
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")


def _finnhub_request(endpoint: str, params: dict = None) -> dict:
    """Sync helper for Finnhub requests (used where async is complex)."""
    import requests
    p = dict(params or {})
    p["token"] = FINNHUB_API_KEY
    url = f"{FINNHUB_BASE}/{endpoint}"
    try:
        r = requests.get(url, params=p, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub request failed: {str(e)}")


@router.get("/finnhub/quote")
async def get_quote(symbol: str = Query(..., min_length=1, max_length=10)):
    """Get real-time quote for a stock symbol. Requires FINNHUB_API_KEY in .env."""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY.startswith("your-"):
        raise HTTPException(
            status_code=503,
            detail="Finnhub API key not configured. Add FINNHUB_API_KEY to backend/.env"
        )
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                f"{FINNHUB_BASE}/quote",
                params={"symbol": symbol.upper(), "token": FINNHUB_API_KEY},
                timeout=15.0
            )
            r.raise_for_status()
            data = r.json()
            return {"symbol": symbol.upper(), **data}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Finnhub request failed: {str(e)}")


@router.get("/finnhub/quotes")
async def get_quotes(symbols: str = Query(..., description="Comma-separated symbols, e.g. AAPL,MSFT,NVDA")):
    """Get quotes for multiple symbols. Max 10 symbols per request."""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY.startswith("your-"):
        raise HTTPException(
            status_code=503,
            detail="Finnhub API key not configured. Add FINNHUB_API_KEY to backend/.env"
        )
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:10]
    if not sym_list:
        raise HTTPException(status_code=400, detail="At least one symbol required")

    results = []
    async with httpx.AsyncClient() as client:
        for symbol in sym_list:
            try:
                r = await client.get(
                    f"{FINNHUB_BASE}/quote",
                    params={"symbol": symbol, "token": FINNHUB_API_KEY},
                    timeout=15.0
                )
                if r.status_code == 200:
                    data = r.json()
                    results.append({"symbol": symbol, **data})
                else:
                    results.append({"symbol": symbol, "error": f"HTTP {r.status_code}"})
            except Exception as e:
                results.append({"symbol": symbol, "error": str(e)})
    return {"quotes": results}


@router.get("/finnhub/company-profile")
async def get_company_profile(symbol: str = Query(..., min_length=1, max_length=10)):
    """Get company profile (name, industry, etc.) for a symbol."""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY.startswith("your-"):
        raise HTTPException(
            status_code=503,
            detail="Finnhub API key not configured. Add FINNHUB_API_KEY to backend/.env"
        )
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                f"{FINNHUB_BASE}/stock/profile2",
                params={"symbol": symbol.upper(), "token": FINNHUB_API_KEY},
                timeout=15.0
            )
            r.raise_for_status()
            data = r.json()
            return {"symbol": symbol.upper(), **data}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Finnhub request failed: {str(e)}")


@router.get("/finnhub/market-news")
async def get_market_news(
    category: str = Query("general", description="general, crypto, forex, merger"),
    min_id: Optional[int] = Query(None)
):
    """Get latest market news from Finnhub."""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY.startswith("your-"):
        raise HTTPException(
            status_code=503,
            detail="Finnhub API key not configured. Add FINNHUB_API_KEY to backend/.env"
        )
    params = {"category": category, "token": FINNHUB_API_KEY}
    if min_id is not None:
        params["minId"] = min_id
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"{FINNHUB_BASE}/news", params=params, timeout=15.0)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Finnhub request failed: {str(e)}")


@router.get("/finnhub/company-news")
async def get_company_news(
    symbol: str = Query(..., min_length=1, max_length=10),
    _from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None)
):
    """Get company-specific news."""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY.startswith("your-"):
        raise HTTPException(
            status_code=503,
            detail="Finnhub API key not configured. Add FINNHUB_API_KEY to backend/.env"
        )
    from datetime import datetime, timedelta
    if not _from or not to:
        end = datetime.utcnow()
        start = end - timedelta(days=7)
        _from = start.strftime("%Y-%m-%d")
        to = end.strftime("%Y-%m-%d")
    params = {"symbol": symbol.upper(), "from": _from, "to": to, "token": FINNHUB_API_KEY}
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"{FINNHUB_BASE}/company-news", params=params, timeout=15.0)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Finnhub request failed: {str(e)}")
