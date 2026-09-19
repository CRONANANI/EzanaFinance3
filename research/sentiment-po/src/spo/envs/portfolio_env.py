"""Monthly long-only portfolio allocation environment.

gymnasium is an optional extra. The env subclasses gymnasium.Env when it is
installed and falls back to a duck-typed base otherwise, so the step/reset
logic — the part worth testing — runs under plain numpy.

Constraints, from the paper: long-only, no leverage, monthly rebalancing.
Actions are unconstrained reals mapped onto the simplex by softmax, which is
what keeps an off-policy agent (DDPG, TD3) from ever proposing a short or a
levered book no matter what it outputs.

Timing: the observation at step t is built from features at t, and the reward
is the portfolio return from t to t+1. Features are shifted once on entry so
the agent never sees a value computed from the return it is being asked to
predict. This is the single easiest place in the whole pipeline to introduce
look-ahead, so it is asserted in tests.
"""

from __future__ import annotations

import numpy as np

try:  # pragma: no cover - depends on optional extra
    import gymnasium as gym
    from gymnasium import spaces

    _BASE = gym.Env
    _HAS_GYM = True
except ImportError:  # pragma: no cover
    _BASE = object
    spaces = None
    _HAS_GYM = False


def softmax_weights(action: np.ndarray) -> np.ndarray:
    """Map an unconstrained action onto the long-only simplex.

    Shifted by the max before exponentiating, so a large action component
    cannot overflow to inf and produce nan weights.
    """
    a = np.asarray(action, dtype=np.float64).ravel()
    e = np.exp(a - np.max(a))
    total = e.sum()
    if not np.isfinite(total) or total <= 0:
        return np.full(a.shape, 1.0 / a.size)
    return e / total


class PortfolioEnv(_BASE):
    """One episode walks the month index once, start to end."""

    metadata = {"render_modes": []}

    def __init__(
        self,
        returns: np.ndarray,
        features: np.ndarray,
        transaction_cost_bps: float = 10.0,
        seed: int | None = None,
    ):
        """
        returns:  (T, N) monthly simple returns, row t = return from t to t+1
        features: (T, N, F) observation tensor aligned to the same index
        """
        super().__init__()
        self.returns = np.asarray(returns, dtype=np.float64)
        self.features = np.asarray(features, dtype=np.float64)
        if self.returns.shape[0] != self.features.shape[0]:
            raise ValueError("returns and features disagree on the number of months")
        if self.returns.shape[1] != self.features.shape[1]:
            raise ValueError("returns and features disagree on the number of assets")

        self.n_steps, self.n_assets = self.returns.shape
        self.n_features = self.features.shape[2]
        self.cost = float(transaction_cost_bps) / 10_000.0
        self._seed = seed

        self.t = 0
        self.prev_weights = np.full(self.n_assets, 1.0 / self.n_assets)

        if _HAS_GYM:
            self.action_space = spaces.Box(
                low=-10.0, high=10.0, shape=(self.n_assets,), dtype=np.float32
            )
            self.observation_space = spaces.Box(
                low=-np.inf,
                high=np.inf,
                shape=(self.n_assets * self.n_features + self.n_assets,),
                dtype=np.float32,
            )
            if seed is not None:
                self.action_space.seed(seed)
                self.observation_space.seed(seed)

    def _obs(self) -> np.ndarray:
        """Features for this month, plus the book we are holding going in.

        The current weights are part of the observation because the agent is
        charged for turnover: without them it cannot tell a cheap rebalance
        from an expensive one.
        """
        flat = self.features[self.t].ravel()
        return np.concatenate([flat, self.prev_weights]).astype(np.float32)

    def reset(self, *, seed: int | None = None, options=None):
        if seed is not None:
            self._seed = seed
        self.t = 0
        self.prev_weights = np.full(self.n_assets, 1.0 / self.n_assets)
        return self._obs(), {}

    def step(self, action):
        w = softmax_weights(action)

        gross = float(np.dot(w, self.returns[self.t]))
        # One-way turnover, charged on the traded notional.
        traded = float(np.abs(w - self.prev_weights).sum()) / 2.0
        cost = traded * self.cost
        net = gross - cost

        # Reward is log wealth growth, not the simple return. Log is additive
        # across months, so maximizing the per-step reward maximizes terminal
        # wealth; maximizing mean simple return does not, and quietly rewards
        # volatility. Clipped at -0.999 so a catastrophic month cannot produce
        # -inf and poison the agent's value function.
        reward = float(np.log1p(max(net, -0.999)))

        self.prev_weights = w
        self.t += 1
        terminated = self.t >= self.n_steps
        obs = self._obs() if not terminated else np.zeros_like(self._obs_shape_zero())
        info = {"gross_return": gross, "net_return": net, "cost": cost, "weights": w.copy()}
        return obs, reward, terminated, False, info

    def _obs_shape_zero(self) -> np.ndarray:
        return np.zeros(self.n_assets * self.n_features + self.n_assets, dtype=np.float32)


def align_for_env(returns_df, features_tensor):
    """Shift features back one month against returns, then drop the ragged ends.

    returns_df.loc[t] is the return realised OVER month t. The agent allocating
    at the start of month t may only use information through the end of month
    t-1, so row t of the observation tensor must be features[t-1]. Getting this
    backwards is a look-ahead bug that shows up as an implausibly good Sharpe.
    """
    import pandas as pd

    r = pd.DataFrame(returns_df)
    if features_tensor.shape[0] != len(r):
        raise ValueError("feature tensor and return frame are not the same length")
    shifted = np.roll(features_tensor, shift=1, axis=0)
    shifted[0] = 0.0
    keep = slice(1, len(r))
    return r.iloc[keep].to_numpy(dtype=np.float64), shifted[keep], r.index[keep]
