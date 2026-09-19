"""The invariants that matter. None of these need torch, so CI can run them
on the light install in seconds.

The look-ahead test is the important one: a reproduction that accidentally
lets the agent see the return it is predicting will post a beautiful Sharpe
and mean nothing.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np
import pandas as pd

from spo.backtest import metrics as M
from spo.backtest.run import evaluate_weights
from spo.envs.portfolio_env import PortfolioEnv, align_for_env, softmax_weights


def test_weights_stay_on_the_simplex():
    for action in (np.zeros(5), np.array([1.0, -3.0, 2.5, 0.0, 9.0]), np.array([1e5, 0.0, 0.0])):
        w = softmax_weights(action)
        assert np.isclose(w.sum(), 1.0)          # fully invested, no leverage
        assert (w >= 0).all()                     # long only
        assert np.isfinite(w).all()               # no overflow to nan


def test_features_lag_returns():
    """Row t of the observation must come from month t-1, never month t."""
    idx = pd.date_range("2020-01-31", periods=4, freq="ME")
    rets = pd.DataFrame(np.arange(8, dtype=float).reshape(4, 2), index=idx)
    feats = np.arange(4 * 2, dtype=float).reshape(4, 2, 1)
    r, f, i = align_for_env(rets, feats)
    assert len(r) == len(f) == len(i) == 3
    # first kept row is month 1; its features are month 0's
    assert np.allclose(r[0], rets.iloc[1].to_numpy())
    assert np.allclose(f[0].ravel(), feats[0].ravel())


def test_annualized_roi_compounds():
    r = pd.Series([0.01] * 12)
    assert np.isclose(M.annualized_roi(r), 1.01**12 - 1)


def test_max_drawdown_is_peak_to_trough():
    assert np.isclose(M.max_drawdown(pd.Series([0.1, -0.2, 0.05])), -0.2)


def test_turnover_is_one_way():
    w = pd.DataFrame([[0.5, 0.5], [0.6, 0.4]])
    assert np.isclose(M.turnover(w), 0.1)


def test_transaction_cost_is_charged_on_turnover():
    idx = pd.date_range("2020-01-31", periods=2, freq="ME")
    rets = pd.DataFrame(np.zeros((2, 2)), index=idx, columns=["A", "B"])
    held = pd.DataFrame([[1.0, 0.0], [1.0, 0.0]], index=idx, columns=["A", "B"])
    led = evaluate_weights(held, rets, transaction_cost_bps=10)
    # moving from equal weight into all-A is 0.5 turnover -> 5bps
    assert np.isclose(led["cost"].iloc[0], 0.0005)
    assert np.isclose(led["cost"].iloc[1], 0.0)   # no trade, no cost


def test_env_rewards_log_growth_net_of_cost():
    rets = np.array([[0.10, 0.0]])
    env = PortfolioEnv(rets, np.zeros((1, 2, 1)), transaction_cost_bps=0)
    env.reset()
    _, reward, terminated, _, info = env.step(np.zeros(2))
    assert np.isclose(info["gross_return"], 0.05)
    assert np.isclose(reward, np.log1p(0.05))
    assert terminated


def test_env_rejects_misaligned_panels():
    try:
        PortfolioEnv(np.zeros((3, 2)), np.zeros((4, 2, 1)))
    except ValueError:
        return
    raise AssertionError("env accepted panels of different lengths")
