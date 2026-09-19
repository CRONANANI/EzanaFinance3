"""Base DRL agents: PPO, SAC, DDPG, TD3, one per algorithm per modality.

Each base agent is trained on ONE modality — quantitative indicators or
sentiment scores — which is the paper's specialization step. The meta-agent
above it then learns how much to trust each algorithm within that modality.

stable-baselines3 is an optional extra, so this module imports cleanly without
torch and only fails when you actually ask it to train.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

ALGOS = ("PPO", "SAC", "DDPG", "TD3")
MODALITIES = ("quant", "sentiment")


def _sb3(algo: str):
    try:
        import stable_baselines3 as sb3
    except ImportError as exc:  # pragma: no cover - depends on optional extra
        raise ImportError("stable-baselines3 is required: pip install -e '.[rl]'") from exc
    try:
        return getattr(sb3, algo)
    except AttributeError as exc:
        raise ValueError(f"unknown algorithm {algo}; expected one of {ALGOS}") from exc


@dataclass
class BaseAgent:
    algo: str
    modality: str
    seed: int
    model: object | None = None

    @property
    def label(self) -> str:
        return f"{self.modality}_{self.algo}"

    def train(self, env, total_timesteps: int):
        cls = _sb3(self.algo)
        # Every agent gets the same seed offset by its position, so the four
        # algorithms explore differently but the whole run stays reproducible.
        offset = ALGOS.index(self.algo) + 10 * MODALITIES.index(self.modality)
        self.model = cls("MlpPolicy", env, seed=self.seed + offset, verbose=0)
        self.model.learn(total_timesteps=total_timesteps)
        return self

    def predict_weights(self, obs: np.ndarray) -> np.ndarray:
        from spo.envs.portfolio_env import softmax_weights

        if self.model is None:
            raise RuntimeError(f"{self.label} has not been trained")
        action, _ = self.model.predict(obs, deterministic=True)
        return softmax_weights(action)

    def save(self, outdir: str | Path):
        if self.model is None:
            raise RuntimeError(f"{self.label} has not been trained")
        path = Path(outdir) / f"{self.label}.zip"
        path.parent.mkdir(parents=True, exist_ok=True)
        self.model.save(path)
        return path

    @classmethod
    def load(cls, algo: str, modality: str, seed: int, outdir: str | Path) -> "BaseAgent":
        model = _sb3(algo).load(Path(outdir) / f"{modality}_{algo}.zip")
        return cls(algo=algo, modality=modality, seed=seed, model=model)


def build_roster(seed: int) -> list[BaseAgent]:
    """One agent per (modality, algorithm): eight in total."""
    return [
        BaseAgent(algo=a, modality=m, seed=seed) for m in MODALITIES for a in ALGOS
    ]
