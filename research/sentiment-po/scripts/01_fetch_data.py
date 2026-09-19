#!/usr/bin/env python3
"""Stage 01: fetch daily OHLCV for the configured universe and cache it.

  python scripts/01_fetch_data.py               # real data via yfinance
  python scripts/01_fetch_data.py --smoke       # seeded synthetic, no network
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from spo.config import load_config, seed_everything  # noqa: E402
from spo.data import market  # noqa: E402
from spo.pipeline import data_dir, synthetic_prices  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke", action="store_true", help="seeded synthetic prices, no network")
    args = ap.parse_args()

    cfg = load_config(smoke=args.smoke)
    seed_everything(cfg.seed)

    w = cfg.train["windows"]
    start, end = str(w["train_start"]), str(w["test_end"])

    if args.smoke:
        px = synthetic_prices(cfg.tickers, start, end, cfg.seed)
        print(f"[01] SYNTHETIC prices for {len(cfg.tickers)} tickers (smoke run, not market data)")
    else:
        px = market.fetch_prices(cfg.tickers, start, end)
        print(f"[01] fetched {len(cfg.tickers)} tickers from yfinance")

    out = data_dir() / "prices_daily.parquet"
    px.to_parquet(out)
    monthly = market.to_monthly(px)
    monthly.to_parquet(data_dir() / "prices_monthly.parquet")
    print(f"[01] wrote {out} ({len(px)} daily rows, {len(monthly)} months)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
