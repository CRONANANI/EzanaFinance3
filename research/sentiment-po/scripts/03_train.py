#!/usr/bin/env python3
"""Stage 03: train the three tiers on the TRAIN window only.

Eight base agents (4 algorithms x 2 modalities), then one meta-agent per
modality, then the super-agent. Requires the rl extra: pip install -e '.[rl]'
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from spo.agents.base import ALGOS, BaseAgent  # noqa: E402
from spo.agents.meta import MetaAgent  # noqa: E402
from spo.agents.super import SuperAgent  # noqa: E402
from spo.config import load_config, run_dir, seed_everything  # noqa: E402
from spo.data import market  # noqa: E402
from spo.envs.portfolio_env import PortfolioEnv, align_for_env  # noqa: E402
from spo.pipeline import data_dir, monthly_returns, sentiment_observation, split_windows  # noqa: E402


def build_panels(cfg, source: str):
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
        print(f"[03] no sentiment file at {sent_path}; sentiment modality uses zeros")
        sent = np.zeros((len(rets), len(cfg.tickers), 1))
    return rets, quant, sent


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--source", default=None)
    ap.add_argument("--label", default="latest")
    args = ap.parse_args()

    cfg = load_config(smoke=args.smoke)
    seed_everything(cfg.seed)
    source = args.source or cfg.train["sentiment"]["source"]
    out = run_dir(cfg, args.label)

    rets, quant, sent = build_panels(cfg, source)
    rets_tr, _ = split_windows(rets, cfg)
    n_tr = len(rets_tr)
    if n_tr < 24:
        print(f"[03] only {n_tr} training months; need at least 24", file=sys.stderr)
        return 1

    panels = {"quant": quant[:n_tr], "sentiment": sent[:n_tr]}
    r_tr = rets_tr.to_numpy(dtype=np.float64)
    cost = float(cfg.train["portfolio"]["transaction_cost_bps"])
    steps = cfg.timesteps()

    # ── tier 1: base agents, each on one modality ──────────────────────────
    trained: dict[str, list[BaseAgent]] = {"quant": [], "sentiment": []}
    for modality, feat in panels.items():
        r_env, f_env, _ = align_for_env(rets_tr, feat)
        for algo in ALGOS:
            env = PortfolioEnv(r_env, f_env, cost, seed=cfg.seed)
            agent = BaseAgent(algo=algo, modality=modality, seed=cfg.seed).train(env, steps)
            agent.save(out / "agents")
            trained[modality].append(agent)
            print(f"[03] trained {agent.label} for {steps} steps")

    # ── tier 2: one meta-agent per modality ────────────────────────────────
    meta_views = {}
    metas = {}
    for modality, agents in trained.items():
        r_env, f_env, _ = align_for_env(rets_tr, panels[modality])
        stacked = np.stack(
            [np.stack([a.predict_weights(np.concatenate([f_env[t].ravel(), np.full(len(cfg.tickers), 1 / len(cfg.tickers))]).astype(np.float32)) for t in range(len(r_env))]) for a in agents],
            axis=1,
        )
        meta = MetaAgent(len(agents), len(cfg.tickers), tuple(cfg.train["agents"]["meta"]["hidden"]), cfg.train["agents"]["meta"]["lr"], cfg.seed)
        meta.fit(stacked, r_env, epochs=cfg.epochs("meta"))
        meta.save(out / "agents" / f"meta_{modality}.pt")
        meta_views[modality] = meta.predict(stacked)
        metas[modality] = meta
        print(f"[03] trained meta_{modality}")

    # ── tier 3: super-agent over the two meta views ────────────────────────
    r_env, _, _ = align_for_env(rets_tr, panels["quant"])
    both = np.stack([meta_views["quant"], meta_views["sentiment"]], axis=1)
    sup = SuperAgent(len(cfg.tickers), tuple(cfg.train["agents"]["super"]["hidden"]), cfg.train["agents"]["super"]["lr"], cfg.seed)
    sup.fit(both, r_env, epochs=cfg.epochs("super"))
    sup.save(out / "agents" / "super.pt")
    mix = sup.modality_mix(both)
    print(f"[03] trained super-agent; learned quant/sentiment mix = {mix.round(3).tolist()}")
    print(f"[03] artifacts in {out / 'agents'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
