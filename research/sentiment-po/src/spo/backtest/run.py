"""Walk-forward backtest: train window, test window, weight log.

The tiers are trained in order — eight base agents, two meta-agents, one
super-agent — and only then replayed over the test window. Nothing from the
test window is used at any point during fitting.

`evaluate_weights` is deliberately separate from the training path and depends
only on numpy/pandas, so the accounting that produces the published numbers can
be tested without installing torch.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from spo.backtest import metrics as M


def evaluate_weights(
    weights: pd.DataFrame,
    returns: pd.DataFrame,
    transaction_cost_bps: float = 10.0,
    initial_weights: np.ndarray | None = None,
) -> pd.DataFrame:
    """Turn a weight log into a net monthly return stream.

    weights.loc[t] is the book HELD over month t; returns.loc[t] is that month's
    asset returns. Cost is charged on the turnover required to move into the
    book, which means the first rebalance is charged against `initial_weights`
    (equal weight by default) rather than being free.
    """
    w = pd.DataFrame(weights).reindex(columns=returns.columns).fillna(0.0)
    r = pd.DataFrame(returns).reindex(index=w.index)
    cost_rate = float(transaction_cost_bps) / 10_000.0

    prev = (
        np.full(w.shape[1], 1.0 / w.shape[1])
        if initial_weights is None
        else np.asarray(initial_weights, dtype=np.float64)
    )

    rows = []
    for ts, row in w.iterrows():
        cur = row.to_numpy(dtype=np.float64)
        traded = float(np.abs(cur - prev).sum()) / 2.0
        cost = traded * cost_rate
        gross = float(np.nansum(cur * r.loc[ts].to_numpy(dtype=np.float64)))
        rows.append(
            {"month": ts, "gross_return": gross, "cost": cost, "net_return": gross - cost, "turnover": traded}
        )
        prev = cur

    return pd.DataFrame(rows).set_index("month")


def equal_weight_returns(returns: pd.DataFrame) -> pd.Series:
    return returns.mean(axis=1)


def benchmark_returns(returns: pd.DataFrame, ticker: str) -> pd.Series:
    if ticker not in returns.columns:
        raise KeyError(f"benchmark {ticker} is not in the universe")
    return returns[ticker]


def compare(
    strategy_net: pd.Series,
    returns: pd.DataFrame,
    weights: pd.DataFrame,
    benchmarks: list[str],
    market_ticker: str,
) -> dict:
    out = {"strategy": M.summarize(strategy_net, weights)}
    for b in benchmarks:
        if b == "equal_weight":
            out["equal_weight"] = M.summarize(equal_weight_returns(returns))
        else:
            tick = market_ticker if b.lower() in {"spy", "market"} and market_ticker in returns else b
            if tick in returns.columns:
                out[b] = M.summarize(benchmark_returns(returns, tick))
    return out


def write_run(outdir: Path, weights: pd.DataFrame, ledger: pd.DataFrame, comparison: dict, meta: dict) -> Path:
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    weights.to_parquet(outdir / "weights.parquet")
    ledger.to_parquet(outdir / "ledger.parquet")
    payload = {"meta": meta, "metrics": comparison}
    path = outdir / "metrics.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, default=str)
    return path
