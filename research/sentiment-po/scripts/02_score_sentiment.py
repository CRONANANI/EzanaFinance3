#!/usr/bin/env python3
"""Stage 02: build the monthly per-ticker sentiment feature matrix.

  --source finbert_news   FinBERT over a public news corpus (the paper's path)
  --source ezana          Ezana's own dataset signals (Phase 2)
  --source blend          both, side by side
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import pandas as pd  # noqa: E402

from spo.config import load_config, seed_everything  # noqa: E402
from spo.pipeline import data_dir, synthetic_sentiment  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", choices=["finbert_news", "ezana", "blend"], default=None)
    ap.add_argument("--news", help="path to an FNSPID export (csv or parquet)")
    ap.add_argument("--smoke", action="store_true")
    args = ap.parse_args()

    cfg = load_config(smoke=args.smoke)
    seed_everything(cfg.seed)
    source = args.source or cfg.train["sentiment"]["source"]

    monthly = pd.read_parquet(data_dir() / "prices_monthly.parquet")
    idx = pd.DatetimeIndex(monthly.index)
    w = cfg.train["windows"]
    frames: dict[str, pd.DataFrame] = {}

    if args.smoke:
        # Smoke never loads FinBERT: a 400MB model download is not a smoke test.
        frames["smoke_sentiment"] = synthetic_sentiment(cfg.tickers, idx, cfg.seed)
        print("[02] SYNTHETIC sentiment (smoke run, not real scores)")
    else:
        if source in ("finbert_news", "blend"):
            from spo.data.news import FNSPIDNewsSource
            from spo.sentiment.finbert import FinBertScorer

            scorer = FinBertScorer(cfg.train["sentiment"]["model"])
            src = FNSPIDNewsSource(
                args.news or data_dir() / "news.parquet",
                scorer=scorer,
                neutral_fill=float(cfg.train["sentiment"]["neutral_fill"]),
            )
            frames.update(src.monthly_features(cfg.tickers, str(w["train_start"]), str(w["test_end"])))
            print(f"[02] scored news corpus with {cfg.train['sentiment']['model']}")

        if source in ("ezana", "blend"):
            from spo.data.ezana import EzanaSignalSource

            src = EzanaSignalSource(data_dir() / "ezana")
            frames.update(src.monthly_features(cfg.tickers, str(w["train_start"]), str(w["test_end"])))
            print("[02] built Ezana dataset signals")

    if not frames:
        print(f"[02] no sentiment frames produced for source={source}", file=sys.stderr)
        return 1

    out = data_dir() / f"sentiment_{source}.parquet"
    # Long format: one row per (month, ticker, signal). Keeps a ragged set of
    # signals in one file without forcing every signal onto the same columns.
    long = (
        pd.concat({k: v for k, v in frames.items()}, names=["signal"])
        .stack(future_stack=True)
        .rename("value")
        .reset_index()
    )
    long.columns = ["signal", "month", "ticker", "value"]
    long.to_parquet(out)
    print(f"[02] wrote {out}: {len(frames)} signal(s), {len(long)} rows -> {sorted(frames)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
