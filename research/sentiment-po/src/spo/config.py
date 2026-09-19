"""Config loading and seeding.

One rule: a run is reproducible from (config file, seed) alone. Every random
source the pipeline touches — numpy, torch, the gymnasium env, and the
stable-baselines3 agents — is seeded from `seed` in train.yaml, so two runs of
the same config produce the same weights.
"""

from __future__ import annotations

import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = REPO_ROOT / "config"


def load_yaml(path: str | Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@dataclass(frozen=True)
class Config:
    instruments: dict[str, Any]
    train: dict[str, Any]
    smoke: bool = False

    @property
    def tickers(self) -> list[str]:
        return list(self.instruments["tickers"])

    @property
    def seed(self) -> int:
        return int(self.train["seed"])

    @property
    def universe_is_verified(self) -> bool:
        """True only once the paper's real ticker list has been transcribed.

        Everything that prints a reproduction claim checks this first, so a run
        on the placeholder universe can never be labelled a HARLF reproduction.
        """
        return self.instruments.get("provenance") == "paper"

    def timesteps(self) -> int:
        a = self.train["agents"]["base"]
        return int(a["smoke_timesteps"] if self.smoke else a["total_timesteps"])

    def epochs(self, tier: str) -> int:
        a = self.train["agents"][tier]
        return int(a["smoke_epochs"] if self.smoke else a["epochs"])


def load_config(
    instruments: str | Path | None = None,
    train: str | Path | None = None,
    smoke: bool = False,
) -> Config:
    return Config(
        instruments=load_yaml(instruments or CONFIG_DIR / "instruments.yaml"),
        train=load_yaml(train or CONFIG_DIR / "train.yaml"),
        smoke=smoke,
    )


def seed_everything(seed: int) -> None:
    """Seed every source in one call. torch is optional, so it is seeded only
    when the rl/nlp extras are installed."""
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    try:
        import numpy as np

        np.random.seed(seed)
    except ImportError:
        pass
    try:
        import torch

        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.use_deterministic_algorithms(True, warn_only=True)
    except ImportError:
        pass


def run_dir(cfg: Config, label: str) -> Path:
    out = REPO_ROOT / cfg.train["report"]["outdir"] / label
    out.mkdir(parents=True, exist_ok=True)
    return out
