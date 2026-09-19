"""FinBERT scoring.

Per-article score is P(positive) - P(negative), which puts a confidently
neutral article at 0 and keeps the sign meaningful. Monthly per-ticker
aggregation is the mean of those scores, configured by
`sentiment.aggregation` in train.yaml.

PROVENANCE: the paper's exact aggregation could not be read (see
config/instruments.yaml). `mean_score` is the conventional choice and is
marked UNVERIFIED in the README's reproduction table.
"""

from __future__ import annotations

import numpy as np


class FinBertScorer:
    """Lazy wrapper around ProsusAI/finbert. Requires the `nlp` extra."""

    def __init__(self, model_name: str = "ProsusAI/finbert", batch_size: int = 32, device: str | None = None):
        self.model_name = model_name
        self.batch_size = batch_size
        self.device = device
        self._pipe = None

    def _ensure(self):
        if self._pipe is not None:
            return
        try:
            from transformers import pipeline
        except ImportError as exc:  # pragma: no cover - depends on optional extra
            raise ImportError("transformers is required: pip install -e '.[nlp]'") from exc
        self._pipe = pipeline(
            "text-classification",
            model=self.model_name,
            top_k=None,          # return every class, so both tails are available
            truncation=True,
            max_length=512,
            device=self.device,
        )

    @staticmethod
    def _to_score(scores: list[dict]) -> float:
        by_label = {s["label"].lower(): float(s["score"]) for s in scores}
        return by_label.get("positive", 0.0) - by_label.get("negative", 0.0)

    def score_many(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros(0)
        self._ensure()
        out: list[float] = []
        for i in range(0, len(texts), self.batch_size):
            chunk = [t if t.strip() else "neutral" for t in texts[i : i + self.batch_size]]
            for res in self._pipe(chunk):
                out.append(self._to_score(res))
        return np.asarray(out, dtype=np.float64)


def aggregate_monthly(scores, how: str = "mean_score") -> float:
    """Collapse one ticker-month's article scores into a single feature."""
    arr = np.asarray(list(scores), dtype=np.float64)
    if arr.size == 0:
        return 0.0
    if how == "mean_score":
        return float(arr.mean())
    if how == "sum_score":
        return float(arr.sum())
    if how == "net_polarity":
        # share positive minus share negative, ignoring magnitude
        return float((arr > 0).mean() - (arr < 0).mean())
    raise ValueError(f"unknown aggregation: {how}")
