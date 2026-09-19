#!/usr/bin/env python3
"""Stage 04: replay the trained hierarchy over the TEST window and score it.

Writes weights.parquet, ledger.parquet and metrics.json into runs/<label>/.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from spo.backtest.run import compare, evaluate_weights, write_run  # noqa: E402
from spo.config import load_config, run_dir, seed_everything  # noqa: E402
from spo.pipeline import split_windows  # noqa: E402
from scripts_common import load_test_panels  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--source", default=None)
    ap.add_argument("--label", default="latest")
    ap.add_argument(
        "--equal-weight-only",
        action="store_true",
        help="score an equal-weight book instead of loading agents; exercises the "
        "accounting path without the rl extras",
    )
    args = ap.parse_args()

    cfg = load_config(smoke=args.smoke)
    seed_everything(cfg.seed)
    source = args.source or cfg.train["sentiment"]["source"]
    out = run_dir(cfg, args.label)

    rets, quant, sent = load_test_panels(cfg, source)
    _, rets_te = split_windows(rets, cfg)
    if rets_te.empty:
        print("[04] test window is empty; check windows in config/train.yaml", file=sys.stderr)
        return 1

    n = len(rets_te)
    if args.equal_weight_only:
        w = pd.DataFrame(
            np.full((n, len(cfg.tickers)), 1.0 / len(cfg.tickers)),
            index=rets_te.index,
            columns=cfg.tickers,
        )
        mix = None
    else:
        from scripts_common import replay_hierarchy

        w, mix = replay_hierarchy(cfg, out, rets_te, quant, sent, source)

    cost = float(cfg.train["portfolio"]["transaction_cost_bps"])
    ledger = evaluate_weights(w, rets_te, cost)
    comparison = compare(
        ledger["net_return"],
        rets_te,
        w,
        cfg.train["backtest"]["benchmarks"],
        cfg.instruments["benchmarks"]["market"],
    )

    meta = {
        "label": args.label,
        "sentiment_source": source,
        "smoke": bool(args.smoke),
        # A smoke run is built on seeded synthetic prices. Stamping it here
        # means 06_publish.py and the product API can refuse to publish it.
        "synthetic": bool(args.smoke),
        "universe_provenance": cfg.instruments.get("provenance"),
        "is_paper_reproduction": cfg.universe_is_verified,
        "train_window": [str(cfg.train["windows"]["train_start"]), str(cfg.train["windows"]["train_end"])],
        "test_window": [str(cfg.train["windows"]["test_start"]), str(cfg.train["windows"]["test_end"])],
        "transaction_cost_bps": cost,
        "constraints": {"long_only": True, "max_leverage": 1.0, "rebalance": "monthly"},
        "tickers": cfg.tickers,
        "modality_mix": None if mix is None else [float(x) for x in mix],
        "seed": cfg.seed,
    }
    path = write_run(out, w, ledger, comparison, meta)
    s = comparison["strategy"]
    print(f"[04] wrote {path}")
    print(f"[04] strategy ROI={s['annualized_roi']} Sharpe={s['sharpe']} maxDD={s['max_drawdown']}")
    if meta["synthetic"]:
        print("[04] NOTE: synthetic smoke data. These numbers describe nothing real.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
