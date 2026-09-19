#!/usr/bin/env python3
"""Stage 05: render the run's charts from its saved artifacts."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import pandas as pd  # noqa: E402

from spo.backtest.run import equal_weight_returns  # noqa: E402
from spo.config import load_config, run_dir  # noqa: E402
from spo.pipeline import data_dir, monthly_returns, split_windows  # noqa: E402
from spo.report import plots  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--label", default="latest")
    args = ap.parse_args()

    cfg = load_config(smoke=args.smoke)
    out = run_dir(cfg, args.label)

    weights = pd.read_parquet(out / "weights.parquet")
    ledger = pd.read_parquet(out / "ledger.parquet")
    monthly = pd.read_parquet(data_dir() / "prices_monthly.parquet")
    _, rets_te = split_windows(monthly_returns(monthly), cfg)

    benchmarks = {"Equal weight": equal_weight_returns(rets_te)}
    market = cfg.instruments["benchmarks"]["market"]
    if market in rets_te.columns:
        benchmarks[market] = rets_te[market]

    paths = plots.write_all(ledger["net_return"], benchmarks, weights, out)
    for p in paths:
        print(f"[05] wrote {p}")

    with open(out / "metrics.json", encoding="utf-8") as fh:
        meta = json.load(fh)["meta"]
    if meta.get("synthetic"):
        print("[05] NOTE: these charts are from synthetic smoke data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
