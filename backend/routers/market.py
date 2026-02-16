"""
Market data router - normalized quotes endpoint with caching.
Uses Finnhub API; key stored in backend/.env as FINNHUB_API_KEY.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
import httpx
import os
import re
import time

router = APIRouter()
FINNHUB_BASE = "https://finnhub.io/api/v1"
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
MARKET_REFRESH_SECONDS = int(os.getenv("MARKET_DATA_REFRESH_SECONDS", "5"))

_quote_cache = {}


def _normalize_symbol(s: str) -> str:
    s = (s or "").strip().upper()
    if not s or len(s) > 10:
        return ""
    if re.match(r"^[A-Z0-9\^\.\-]+$", s):
        return s
    return ""


def _validate_symbols(symbols: List[str]) -> List[str]:
    seen = set()
    out = []
    for s in symbols:
        n = _normalize_symbol(s)
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out[:20]


def _normalize_quote(symbol: str, raw: dict) -> dict:
    c = raw.get("c")
    pc = raw.get("pc") or 0
    d = raw.get("d")
    dp = raw.get("dp")
    if c is not None and pc and dp is None and d is not None:
        dp = (d / pc * 100) if pc else 0
    elif c is not None and pc and d is None and dp is not None:
        d = pc * (dp / 100)
    return {
        "symbol": symbol,
        "current_price": c,
        "previous_close": pc,
        "change": d,
        "change_percent": dp,
        "high": raw.get("h"),
        "low": raw.get("l"),
        "open": raw.get("o"),
        "timestamp": raw.get("t"),
    }


@router.get("/market/quotes")
async def get_market_quotes(symbols: str = Query(..., description="Comma-separated symbols, e.g. AAPL,MSFT,NVDA")):
    """
    Get normalized quotes for multiple symbols.
    Cached per-symbol with TTL from MARKET_DATA_REFRESH_SECONDS (default 5).
    Returns partial success: quotes array + errors array.
    """
    if not FINNHUB_API_KEY or FINNHUB_API_KEY.startswith("your-"):
        raise HTTPException(
            status_code=503,
            detail="Finnhub API key not configured. Add FINNHUB_API_KEY to backend/.env",
        )
    sym_list = _validate_symbols([s.strip() for s in symbols.split(",") if s.strip()])
    if not sym_list:
        raise HTTPException(status_code=400, detail="At least one valid symbol required")

    quotes = []
    errors = []
    now = time.time()

    async with httpx.AsyncClient() as client:
        for symbol in sym_list:
            cache_key = symbol
            entry = _quote_cache.get(cache_key)
            if entry and (now - entry.get("ts", 0)) < MARKET_REFRESH_SECONDS:
                quotes.append(entry["data"])
                continue
            try:
                r = await client.get(
                    f"{FINNHUB_BASE}/quote",
                    params={"symbol": symbol, "token": FINNHUB_API_KEY},
                    timeout=10.0,
                )
                if r.status_code != 200:
                    errors.append({"symbol": symbol, "message": f"HTTP {r.status_code}"})
                    continue
                data = r.json()
                if data.get("c") is None and data.get("d") is None:
                    errors.append({"symbol": symbol, "message": "No quote data"})
                    continue
                norm = _normalize_quote(symbol, data)
                _quote_cache[cache_key] = {"data": norm, "ts": now}
                quotes.append(norm)
            except Exception as e:
                errors.append({"symbol": symbol, "message": str(e)})

    return {"quotes": quotes, "errors": errors}
