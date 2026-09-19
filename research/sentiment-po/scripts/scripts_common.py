"""Helpers shared by 04 and 05. Kept out of src/spo so the package stays
importable without the scripts on sys.path."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from spo.data import market  # noqa: E402
from spo.pipeline import data_dir, monthly_returns, sentiment_observation  # noqa: E402


def load_test_panels(cfg, source: str):
    monthly = pd.read_parquet(data_dir() / "prices_monthly.parquet")
    rets = monthly_returns(monthly)
    feats = market.build_features(monthly, cfg.train["features"]["quant"])
    quant = market.stack_features(feats, cfg.tickers, pd.DatetimeIndex(monthly.index))[1:]

    sent_path = data_dir() / f"sentiment_{source}.parquet"
    if sent_path.exists():
        long = pd.read_parquet(sent_path)
        wide = long.pivot_table(index="month", columns="ticker", values="value", aggfunc="mean")
        sent = sentiment_observation(wide, cfg.tickers, pd.DatetimeIndex(rets.index))
    else:
        sent = np.zeros((len(rets), len(cfg.tickers), 1))
    return rets, quant, sent


def replay_hierarchy(cfg, out: Path, rets_te, quant, sent, source: str):
    """Rebuild the trained tiers and walk them over the test window."""
    from spo.agents.base import ALGOS, BaseAgent
    from spo.agents.meta import MetaAgent
    from spo.agents.super import SuperAgent

    n_assets = len(cfg.tickers)
    offset = len(quant) - len(rets_te)
    panels = {"quant": quant[offset:], "sentiment": sent[offset:]}
    eq = np.full(n_assets, 1.0 / n_assets)

    views = {}
    for modality, feat in panels.items():
        agents = [BaseAgent.load(a, modality, cfg.seed, out / "agents") for a in ALGOS]
        stacked = np.stack(
            [
                np.stack(
                    [
                        a.predict_weights(np.concatenate([feat[t].ravel(), eq]).astype(np.float32))
                        for t in range(len(rets_te))
                    ]
                )
                for a in agents
            ],
            axis=1,
        )
        meta = MetaAgent(len(ALGOS), n_assets, tuple(cfg.train["agents"]["meta"]["hidden"]), cfg.train["agents"]["meta"]["lr"], cfg.seed)
        meta.load(out / "agents" / f"meta_{modality}.pt")
        views[modality] = meta.predict(stacked)

    both = np.stack([views["quant"], views["sentiment"]], axis=1)
    sup = SuperAgent(n_assets, tuple(cfg.train["agents"]["super"]["hidden"]), cfg.train["agents"]["super"]["lr"], cfg.seed)
    sup.load(out / "agents" / "super.pt")
    final = sup.predict(both)
    return pd.DataFrame(final, index=rets_te.index, columns=cfg.tickers), sup.modality_mix(both)
