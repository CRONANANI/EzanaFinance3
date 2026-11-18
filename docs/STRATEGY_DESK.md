# Ezana Strategy Desk

Proprietary sports betting and prediction-market strategies, sold on a record
anyone can check. Started Nov 18 2026.

## Where it lives

`/betting-markets/strategies` (catalogue) and
`/betting-markets/strategies/[slug]` (one strategy), linked from the Betting
Markets header. Betting Markets already owns prediction markets, sports odds
and EV analysis, and the whole route sits behind the v1.0 beta gate, so the
desk launches with that page rather than as a new top-level surface. It shares
the Quant Lab idea (a strategy reads as plain sentences) but stays out of the
Quant Lab, which serves equities and the university councils.

## The standard (src/lib/strategies/metrics.js)

A strategy is Verified only when every check passes on its forward record
(bets counted after `rulesFrozenAt`):

1. At least 300 settled bets.
2. The 95% Wilson lower bound on the win rate exceeds the break-even rate
   implied by the prices actually paid (average price, vig or ask included).
3. Positive return per bet after fees.
4. Rules fixed before any counted bet.

Win rate is never shown without the break-even beside it. "Wins 90% of the
time" at an average price of 93 cents loses money.

The research backtest (every bet the stored data allows) is shown separately
and never counts toward Verified.

## Strategies

| Slug | Market | Status | Data |
|---|---|---|---|
| `pm-late-favourite` | Prediction markets | In backtest | `prediction_market_snapshots` (from Oct 19 2026) via `strategy_pm_late_favourite` (docs/sql/SQL_strategy_desk_pm_backtest.md) |
| `nba-3pt-matchup` | NBA player props | Awaiting data | Needs historical box scores and historical prop prices |

First research read (Nov 18 2026), late favourite: 52 bets, 49 won (94%),
average price 92.6 cents, about +1.8% per bet. Far short of 300 bets; the
interval is wide. Exactly the case the standard exists for.

## What it does not do yet

- Payments and access control: access text only; no checkout until a
  strategy is Verified and pricing is decided.
- Live signals: no feed of today's qualifying bets yet.
- Sports data: no historical odds feed; required for any sports strategy.

## Compliance notes

Every page carries a results and responsible-play notice (legal age where the
reader lives, not advice, 1-800-GAMBLER). Before selling: confirm the
jurisdictions served, age verification, and advertising rules for sports
betting content (US states, Ontario AGCO, Quebec), and keep performance
claims to the verified record.
