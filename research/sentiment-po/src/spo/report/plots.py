"""Run report: equity curves, weight evolution, drawdown.

matplotlib with the Agg backend so this runs headless in CI. Colours are left
to matplotlib's default cycle on purpose: these are research artifacts, not
product surfaces, and the product's chart contract lives in the Next.js app.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

from spo.backtest import metrics as M  # noqa: E402


def equity_curves(strategy_net: pd.Series, benchmarks: dict[str, pd.Series], outdir: Path) -> Path:
    fig, ax = plt.subplots(figsize=(10, 5))
    M.equity_curve(strategy_net).plot(ax=ax, label="HARLF-style strategy", linewidth=2)
    for name, series in benchmarks.items():
        M.equity_curve(series).plot(ax=ax, label=name, linewidth=1, alpha=0.8)
    ax.set_title("Growth of 1.00 over the test window")
    ax.set_ylabel("Multiple of initial capital")
    ax.legend()
    ax.grid(alpha=0.25)
    path = Path(outdir) / "equity_curves.png"
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def weight_evolution(weights: pd.DataFrame, outdir: Path) -> Path:
    fig, ax = plt.subplots(figsize=(10, 5))
    weights.plot.area(ax=ax, linewidth=0)
    ax.set_title("Allocation over time")
    ax.set_ylabel("Portfolio weight")
    ax.set_ylim(0, 1)
    ax.legend(ncol=4, fontsize=7, loc="upper center")
    path = Path(outdir) / "weight_evolution.png"
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def drawdown(strategy_net: pd.Series, outdir: Path) -> Path:
    curve = M.equity_curve(strategy_net)
    dd = curve / curve.cummax() - 1.0
    fig, ax = plt.subplots(figsize=(10, 3.2))
    ax.fill_between(dd.index, dd.to_numpy(), 0.0, alpha=0.4)
    ax.set_title("Drawdown")
    ax.set_ylabel("Peak to trough")
    ax.grid(alpha=0.25)
    path = Path(outdir) / "drawdown.png"
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def write_all(strategy_net: pd.Series, benchmarks: dict[str, pd.Series], weights: pd.DataFrame, outdir: Path) -> list[Path]:
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    return [
        equity_curves(strategy_net, benchmarks, outdir),
        weight_evolution(weights, outdir),
        drawdown(strategy_net, outdir),
    ]
