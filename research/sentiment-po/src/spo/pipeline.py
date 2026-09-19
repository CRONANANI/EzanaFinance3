"""Shared plumbing for the numbered scripts: paths, synthetic smoke data, and
the three-tier train/replay loop.

Keeping this here rather than in the scripts means the scripts stay thin
argument parsers and the logic is importable by tests.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from spo.config import REPO_ROOT, Config


def data_dir() -> Path:
    d = REPO_ROOT / "data"
    d.mkdir(parents=True, exist_ok=True)
    return d


def synthetic_prices(tickers: list[str], start: str, end: str, seed: int) -> pd.DataFrame:
    """Deterministic fake price history for --smoke and CI.

    This exists ONLY so the pipeline can be exercised end to end without a
    network call. It is a seeded geometric random walk with per-ticker drift,
    NOT market data, and nothing produced from it may be published or shown in
    the product. 04_backtest.py stamps `synthetic: true` into metrics.json so a
    smoke run can never be mistaken for a real one downstream.
    """
    rng = np.random.default_rng(seed)
    idx = pd.date_range(start=start, end=end, freq="B")
    n = len(idx)
    out = {}
    for i, t in enumerate(tickers):
        drift = 0.0002 + 0.00004 * ((i % 5) - 2)
        vol = 0.008 + 0.002 * (i % 4)
        steps = rng.normal(drift, vol, n)
        out[t] = 100.0 * np.exp(np.cumsum(steps))
    return pd.DataFrame(out, index=idx)


def synthetic_sentiment(tickers: list[str], index: pd.DatetimeIndex, seed: int) -> pd.DataFrame:
    """Seeded stand-in for a sentiment feature frame. Same warning as above."""
    rng = np.random.default_rng(seed + 1)
    return pd.DataFrame(
        rng.normal(0.0, 0.35, size=(len(index), len(tickers))).clip(-1, 1),
        index=index,
        columns=tickers,
    )


def monthly_returns(monthly_close: pd.DataFrame) -> pd.DataFrame:
    return monthly_close.pct_change(fill_method=None).iloc[1:]


def split_windows(frame: pd.DataFrame, cfg: Config) -> tuple[pd.DataFrame, pd.DataFrame]:
    w = cfg.train["windows"]
    train = frame.loc[str(w["train_start"]) : str(w["train_end"])]
    test = frame.loc[str(w["test_start"]) : str(w["test_end"])]
    return train, test


def sentiment_observation(sent: pd.DataFrame, tickers: list[str], index: pd.DatetimeIndex) -> np.ndarray:
    """Shape a sentiment frame like the quant feature tensor: (T, N, 1)."""
    aligned = sent.reindex(index=index, columns=tickers).fillna(0.0).to_numpy(dtype=np.float64)
    return aligned[:, :, None]
