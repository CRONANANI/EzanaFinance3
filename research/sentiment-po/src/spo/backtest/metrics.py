"""Portfolio performance metrics.

Pure numpy/pandas: no RL, no torch, so this is importable and testable without
the heavy extras. Every metric is annualized from MONTHLY returns, because the
strategy rebalances monthly — annualizing from daily returns here would inflate
Sharpe by roughly sqrt(21).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

MONTHS_PER_YEAR = 12


def annualized_roi(monthly_returns: pd.Series) -> float:
    """Compound annual growth rate implied by the monthly return stream."""
    r = pd.Series(monthly_returns).dropna()
    if r.empty:
        return float("nan")
    total_growth = float((1.0 + r).prod())
    years = len(r) / MONTHS_PER_YEAR
    if years <= 0 or total_growth <= 0:
        return float("nan")
    return total_growth ** (1.0 / years) - 1.0


def annualized_vol(monthly_returns: pd.Series) -> float:
    r = pd.Series(monthly_returns).dropna()
    if len(r) < 2:
        return float("nan")
    return float(r.std(ddof=1)) * np.sqrt(MONTHS_PER_YEAR)


def sharpe(monthly_returns: pd.Series, risk_free_annual: float = 0.0) -> float:
    """Annualized Sharpe on monthly data.

    The risk-free rate is converted to a monthly equivalent geometrically, not
    by dividing by 12, so the excess return is the real one.
    """
    r = pd.Series(monthly_returns).dropna()
    if len(r) < 2:
        return float("nan")
    rf_m = (1.0 + risk_free_annual) ** (1.0 / MONTHS_PER_YEAR) - 1.0
    excess = r - rf_m
    sd = float(excess.std(ddof=1))
    if np.isclose(sd, 0.0):
        return float("nan")
    return float(excess.mean()) / sd * np.sqrt(MONTHS_PER_YEAR)


def sortino(monthly_returns: pd.Series, risk_free_annual: float = 0.0) -> float:
    """Downside-deviation Sharpe.

    The denominator divides by the FULL sample length, not by the count of
    losing months: dividing by the losing count would make a strategy with two
    bad months look worse than one with twenty mild ones.
    """
    r = pd.Series(monthly_returns).dropna()
    if len(r) < 2:
        return float("nan")
    rf_m = (1.0 + risk_free_annual) ** (1.0 / MONTHS_PER_YEAR) - 1.0
    excess = r - rf_m
    downside = excess.clip(upper=0.0)
    dd = float(np.sqrt((downside**2).sum() / len(excess)))
    if np.isclose(dd, 0.0):
        return float("nan")
    return float(excess.mean()) / dd * np.sqrt(MONTHS_PER_YEAR)


def equity_curve(monthly_returns: pd.Series, start: float = 1.0) -> pd.Series:
    r = pd.Series(monthly_returns).dropna()
    return start * (1.0 + r).cumprod()


def max_drawdown(monthly_returns: pd.Series) -> float:
    """Worst peak-to-trough decline, returned as a negative number."""
    curve = equity_curve(monthly_returns)
    if curve.empty:
        return float("nan")
    peak = curve.cummax()
    return float((curve / peak - 1.0).min())


def turnover(weights: pd.DataFrame) -> float:
    """Average one-way turnover per rebalance.

    Half the sum of absolute weight changes: selling 10% of A to buy 10% of B
    is 10% turnover, not 20%.
    """
    w = pd.DataFrame(weights).dropna(how="all")
    if len(w) < 2:
        return 0.0
    return float(w.diff().abs().sum(axis=1).iloc[1:].mean() / 2.0)


def summarize(
    monthly_returns: pd.Series,
    weights: pd.DataFrame | None = None,
    risk_free_annual: float = 0.0,
) -> dict[str, float]:
    out = {
        "annualized_roi": annualized_roi(monthly_returns),
        "annualized_vol": annualized_vol(monthly_returns),
        "sharpe": sharpe(monthly_returns, risk_free_annual),
        "sortino": sortino(monthly_returns, risk_free_annual),
        "max_drawdown": max_drawdown(monthly_returns),
        "months": int(pd.Series(monthly_returns).dropna().shape[0]),
    }
    out["turnover"] = turnover(weights) if weights is not None else float("nan")
    return {k: (None if isinstance(v, float) and np.isnan(v) else v) for k, v in out.items()}
