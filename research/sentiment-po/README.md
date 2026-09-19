# Sentiment Portfolio Optimization

A reproduction scaffold for **HARLF** plus the Ezana-data sentiment variant.

Research code. It is a standalone Python project that never ships to the
Next.js bundle: nothing here is imported by the app, and nothing in the app is
imported here. The only seam between the two is a publisher script that writes
finished model outputs into a Supabase table the product reads.

## The paper

> **HARLF: Hierarchical Reinforcement Learning and Lightweight LLM-Driven
> Sentiment Integration for Financial Portfolio Optimization.**
> Benjamin Coriat (CentraleSupelec) and Eric Benhamou (AI for Alpha).
> arXiv:2507.18560, also SSRN 5365047. Presented at the IJCAI 2025 FinLLM
> workshop.

Architecture, three tiers:

1. **Base agents.** PPO, SAC, DDPG and TD3, each specialized on ONE modality,
   either quantitative indicators or FinBERT sentiment scores. Eight agents.
2. **Meta-agents.** A small PyTorch network per modality that learns how to
   weight its four base agents.
3. **Super-agent.** Merges the two meta views into the final monthly weights.

Constraints: long only, no leverage, monthly rebalancing, 14 global equity and
commodity instruments.

## Reproduction status

**BLOCKED, and the table below is empty on purpose.**

The paper's own numbers are the reproduction target. Ours are not filled in
because the paper's defining parameters have not been transcribed from the PDF:
every host serving it (arxiv.org and its HTML/PDF mirrors, and the aggregator
pages) is blocked by the network egress proxy in the environment where this
scaffold was written, so the source could not be read first-hand. The
architecture below is corroborated by multiple secondary sources; the
parameters marked UNVERIFIED are not.

| Quantity              | Paper                                                    | This repo                         | Status                  |
| --------------------- | -------------------------------------------------------- | --------------------------------- | ----------------------- |
| Annualized ROI        | 26.0%                                                    | pending                           | no run yet              |
| Sharpe                | 1.2                                                      | pending                           | no run yet              |
| S&P 500 comparison    | 13.2% (per the task brief; not verified against the PDF) | pending                           | no run yet              |
| Test window           | 2018-2024                                                | 2018-2024                         | agrees                  |
| Train window          | 2000 or 2003 to 2017                                     | 2003-2017                         | **CONFLICT, see below** |
| Universe              | 14 global equity and commodity instruments               | 14 placeholders                   | **UNVERIFIED**          |
| Indicator set         | not read                                                 | conventional monthly set          | **UNVERIFIED**          |
| Reward                | not read                                                 | log wealth growth net of cost     | **UNVERIFIED**          |
| Sentiment aggregation | not read                                                 | mean of per-article (P+ minus P-) | **UNVERIFIED**          |
| Transaction cost      | not read                                                 | 10bps                             | **UNVERIFIED**          |

**The train-window conflict.** The task brief says training runs 2003-2017.
Secondary sources quoting the abstract say 2000-2017. `config/train.yaml` uses
2003 because that is the brief's figure, and flags it. Resolve against the PDF.

**What it takes to unblock.** Open the paper, then:

1. Replace `tickers` in `config/instruments.yaml` with its universe and set
   `provenance: paper`.
2. Replace `features.quant`, `sentiment.aggregation`,
   `portfolio.transaction_cost_bps` and `windows.train_start` in
   `config/train.yaml` with the paper's values, deleting the UNVERIFIED notes
   as each is confirmed.
3. Find the three Colab notebook links in the paper and mirror their data
   handling wherever the prose is ambiguous.
4. Run the full pipeline and fill in this table.

Until step 1 is done, `Config.universe_is_verified` is False, every run stamps
`is_paper_reproduction: false` into its `metrics.json`, and **a run made with
the placeholder universe is an Ezana run on an Ezana universe, not a HARLF
reproduction.** Do not describe it as one.

## Install

```bash
cd research/sentiment-po
pip install -e .                  # core: env, features, backtest, report
pip install -e '.[rl]'            # torch + stable-baselines3, needed to train
pip install -e '.[nlp]'           # transformers, needed for FinBERT
pip install -e '.[market]'        # yfinance, needed for real prices
pip install -e '.[all]'           # everything
```

The core install is deliberately light. Metrics, the env, feature construction
and the Ezana export all work without torch, so CI and the tests run in
seconds.

## Run it

```bash
# Smoke: seeded synthetic data, tiny agents, minutes on CPU. For CI.
python scripts/01_fetch_data.py --smoke
python scripts/02_score_sentiment.py --smoke
python scripts/03_train.py --smoke                    # needs [rl]
python scripts/04_backtest.py --smoke
python scripts/05_report.py --smoke

# Real run
python scripts/01_fetch_data.py                       # needs [market]
python scripts/02_score_sentiment.py --source finbert_news --news path/to/fnspid.parquet
python scripts/03_train.py
python scripts/04_backtest.py
python scripts/05_report.py
```

`04_backtest.py --equal-weight-only` scores an equal-weight book instead of
loading agents, which exercises the whole accounting and reporting path
without the rl extras. That is how the pipeline is tested here.

Artifacts land in `runs/<label>/`: `weights.parquet`, `ledger.parquet`,
`metrics.json` and three PNGs. `runs/` and `data/` are gitignored.

**Smoke runs are synthetic.** `01 --smoke` generates a seeded geometric random
walk, not market data. Every stage says so, and `metrics.json` carries
`"synthetic": true` so nothing downstream can publish it by accident.

## Reproducibility

A run is determined by (config, seed). `seed_everything` seeds Python, numpy,
torch and the env from `seed` in `train.yaml`; each base agent offsets that
seed by its position so the eight agents explore differently but the run as a
whole repeats. There is no `Math.random`-equivalent anywhere: no unseeded
randomness, no wall-clock dependence.

## Design notes worth knowing

**Look-ahead.** `align_for_env` shifts the feature tensor one month back
against returns, so the allocation for month _t_ only sees information through
the end of month _t-1_. This is the single easiest place to introduce a bug
that produces a spectacular and meaningless Sharpe, so `tests/test_invariants.py`
asserts it directly.

**Constraints hold by construction.** Base agents map unconstrained actions
onto the simplex with a softmax. Meta and super agents output a _convex
combination_ of their inputs' weight vectors. Since a convex combination of
simplex points is a simplex point, long-only and no-leverage survive all three
tiers without a projection step that could silently clip.

**Reward is log growth, not simple return.** Log returns are additive across
months, so maximizing the per-step reward maximizes terminal wealth.
Maximizing mean simple return does not, and quietly pays the agent for
volatility.

**Monthly, not daily.** Every metric annualizes from monthly returns because
the strategy rebalances monthly. Annualizing the same numbers from daily data
would inflate Sharpe by roughly sqrt(21).

## Layout

```
config/            instruments.yaml, train.yaml  (all tunables, with provenance)
src/spo/
  config.py        loading + seeding
  pipeline.py      shared plumbing, synthetic smoke data
  data/market.py   OHLCV -> monthly indicator panel
  data/news.py     SentimentSource interface + FNSPID corpus
  data/ezana.py    Ezana's own dataset signals (Phase 2)
  sentiment/       FinBERT scoring and monthly aggregation
  envs/            the gymnasium portfolio env
  agents/          base (sb3) / meta / super
  backtest/        walk-forward runner + metrics
  report/          matplotlib charts
scripts/           01..05 pipeline, 00 export, 06 publish
tests/             invariants that run without torch
```
