"""Per-modality meta-agents.

A meta-agent is a small PyTorch network that learns how to blend the four base
agents' proposed allocations WITHIN one modality. Its input is the four weight
vectors concatenated; its output is one weight vector on the simplex.

It learns a convex combination rather than an arbitrary map: the output is
softmax over per-agent logits, applied to the base agents' own weights. That
keeps the result long-only and fully invested by construction, so the meta
tier cannot violate the constraints its base agents respected.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np


def _torch():
    try:
        import torch

        return torch
    except ImportError as exc:  # pragma: no cover - depends on optional extra
        raise ImportError("torch is required: pip install -e '.[rl]'") from exc


class MetaAgent:
    def __init__(self, n_agents: int, n_assets: int, hidden=(64, 64), lr: float = 3e-4, seed: int = 0):
        torch = _torch()
        self.torch = torch
        self.n_agents = n_agents
        self.n_assets = n_assets
        torch.manual_seed(seed)

        nn = torch.nn
        layers: list = []
        dim = n_agents * n_assets
        for h in hidden:
            layers += [nn.Linear(dim, h), nn.ReLU()]
            dim = h
        layers += [nn.Linear(dim, n_agents)]   # one logit per base agent
        self.net = nn.Sequential(*layers)
        self.opt = torch.optim.Adam(self.net.parameters(), lr=lr)

    def _mix(self, stacked):
        """stacked: (B, n_agents, n_assets) -> (B, n_assets) on the simplex."""
        torch = self.torch
        flat = stacked.reshape(stacked.shape[0], -1)
        logits = self.net(flat)
        alpha = torch.softmax(logits, dim=-1).unsqueeze(-1)
        return (alpha * stacked).sum(dim=1)

    def fit(self, agent_weights: np.ndarray, returns: np.ndarray, epochs: int = 200):
        """Maximize realized log wealth growth of the blended book.

        Same objective as the env's reward, so the tiers agree on what good
        means. Training on log growth rather than mean return is what stops the
        meta tier from learning to lever up on the highest-variance base agent.
        """
        torch = self.torch
        X = torch.as_tensor(np.asarray(agent_weights), dtype=torch.float32)
        R = torch.as_tensor(np.asarray(returns), dtype=torch.float32)
        for _ in range(epochs):
            self.opt.zero_grad()
            w = self._mix(X)
            port = (w * R).sum(dim=-1)
            loss = -torch.log1p(port.clamp(min=-0.999)).mean()
            loss.backward()
            self.opt.step()
        return self

    def predict(self, agent_weights: np.ndarray) -> np.ndarray:
        torch = self.torch
        X = torch.as_tensor(np.asarray(agent_weights), dtype=torch.float32)
        single = X.ndim == 2
        if single:
            X = X.unsqueeze(0)
        with torch.no_grad():
            out = self._mix(X).numpy()
        return out[0] if single else out

    def save(self, path: str | Path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.torch.save(self.net.state_dict(), path)

    def load(self, path: str | Path):
        self.net.load_state_dict(self.torch.load(path))
        return self
