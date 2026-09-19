"""The super-agent: merges the two meta views into final monthly weights.

Structurally the same convex-combination trick as MetaAgent, one tier up and
over two inputs (the quant meta view and the sentiment meta view) instead of
four. Because it also outputs a convex combination of two simplex vectors, the
final book is long-only and fully invested without any projection step.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from spo.agents.meta import MetaAgent


class SuperAgent(MetaAgent):
    def __init__(self, n_assets: int, hidden=(64,), lr: float = 3e-4, seed: int = 0):
        super().__init__(n_agents=2, n_assets=n_assets, hidden=hidden, lr=lr, seed=seed)

    def modality_mix(self, meta_weights: np.ndarray) -> np.ndarray:
        """The learned quant-vs-sentiment split, for the product surface.

        This is the number worth surfacing: it says how much of the final book
        the model attributes to sentiment rather than to price history.
        """
        torch = self.torch
        X = torch.as_tensor(np.asarray(meta_weights), dtype=torch.float32)
        if X.ndim == 2:
            X = X.unsqueeze(0)
        with torch.no_grad():
            alpha = torch.softmax(self.net(X.reshape(X.shape[0], -1)), dim=-1).numpy()
        return alpha.mean(axis=0)
