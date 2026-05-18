# Betting Markets Engine — Ezana Finance

> **Skill purpose**: Guide all development of the Expected Value (EV) engine that powers the betting markets page. This file documents the mathematical framework, sport-specific modeling approaches, data sources, algorithms, and implementation patterns for computing EV across NFL, NBA, NHL, MLB, and Football (soccer). References: _Football Analytics with Python & R_ (Eager & Erickson, O'Reilly 2023) — the project's primary sports analytics textbook.
>
> **Current state**: Static placeholder data. The system is designed to graduate from mock data → heuristic EV → statistical models → real-time odds-comparison engine as data integrations go live.

---

## 1. CORE CONCEPTS

### 1a. What Is Expected Value (EV)?

Expected Value is the mathematical edge a bettor has over the sportsbook. It is computed as:

```
EV = (Probability_model × Payout) − (1 − Probability_model) × Stake
```

Or equivalently, as a percentage per $100 wagered:

```
EV% = (Model_probability − Implied_probability) / (1 − Implied_probability) × 100
```

Where:

- **Implied probability** = the probability embedded in the sportsbook's odds (after removing vig)
- **Model probability** = our independent estimate of the true outcome probability
- **Edge** = Model_probability − Implied_probability

A positive EV means the bet has long-term profitability. The EV engine's job is to find these discrepancies.

### 1b. Market Types

| Market                   | Description                                             | Primary Sports     |
| ------------------------ | ------------------------------------------------------- | ------------------ |
| **Spread**               | Point handicap that splits outcomes 50/50               | NFL, NBA, Football |
| **Moneyline**            | Bet on outright winner                                  | All sports         |
| **Total (Over/Under)**   | Sum of both teams' scores vs a line                     | All sports         |
| **Prop (Proposition)**   | Player/event-specific outcomes (TDs, goals, strikeouts) | All sports         |
| **Puck Line / Run Line** | Fixed spread (NHL ±1.5, MLB ±1.5)                       | NHL, MLB           |

### 1c. Odds Conversion

All internal calculations use decimal probability (0–1). Convert from American odds:

```js
function americanToImplied(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function removeVig(impliedHome, impliedAway) {
  const total = impliedHome + impliedAway;
  return {
    home: impliedHome / total,
    away: impliedAway / total,
  };
}
```

_Textbook ref: Eager Ch.6 — "The Main Markets in Football", odds conversion formulas, vig calculation._

### 1d. Break-Even Probability

A bet is only +EV if our model probability exceeds the break-even probability:

```
Break-even = Risk / (Risk + Potential_win)
```

For standard -110 lines: 110 / (110 + 100) = **52.38%**

_Textbook ref: Eager Ch.6 — "the vig on each bet ... requires a 52.38% success rate ... to break even."_

---

## 2. SPORT-SPECIFIC MODELS

### 2a. NFL — Poisson Regression for Props + Logistic for Spread/Total

**Primary model: Poisson regression (GLM)**
_Textbook ref: Eager Ch.6 — "Application of Poisson Regression: Prop Markets"_

The Poisson distribution models count outcomes (TDs, interceptions, sacks) where:

- Events occur with roughly equal probability per unit time
- Events are approximately independent

**Implementation**:

```
P(X = k) = (λ^k × e^(-λ)) / k!
```

Where λ (lambda) is the expected count from our regression model:

```
log(λ) = β₀ + β₁(player_rate) + β₂(total_line) + β₃(opponent_defense_rank)
```

**Feature inputs for NFL props**:

- `pass_td_rate` — player's season average TDs per game
- `total_line` — the game's market total (higher totals = more scoring opportunities)
- `opponent_pass_defense_rank` — opponent's pass defense EPA/play
- `home_away` — home field advantage factor
- `rest_days` — days since last game
- `weather` — wind speed, temperature (outdoor games only)

**Spread/Total model: Logistic regression**
_Textbook ref: Eager Ch.5 — "Generalized Linear Models"_

For spread and total bets, use logistic regression where the binary outcome is cover/no-cover:

```
P(cover) = 1 / (1 + e^(-(β₀ + β₁x₁ + ... + βₙxₙ)))
```

Features: team offensive/defensive DVOA, recent ATS record, injury-adjusted ratings, home/away splits.

**NFL data sources**:

- Play-by-play: `nfl_data_py` (Python) / `nflfastR` (R) — publicly available, updated weekly during season
- Odds: External API (to be integrated — OddsAPI, Sportradar, or similar)
- Injuries: Publicly reported injury reports (Wednesday/Thursday/Friday designations)

### 2b. NBA — Rating-Adjusted Spread + Player Prop Models

**Spread/ML model**:
NBA spreads are driven by team ratings adjusted for:

- Net rating (offense - defense per 100 possessions)
- Pace (possessions per game)
- Home court advantage (~+3 points historically)
- Back-to-back fatigue penalty (~-2 points)
- Injury impact (player VORP as proxy)

```
Predicted_margin = (Home_net_rating - Away_net_rating) / pace_factor + HCA + fatigue_adj + injury_adj
```

Convert predicted margin to win probability using a logistic function calibrated to historical data.

**Player props**:
NBA player props (points, rebounds, assists) can be modeled with:

- Poisson regression (for low-count props: 3-pointers, steals, blocks)
- Negative binomial regression (for over-dispersed counts: points, rebounds)
- Player's rolling average × opponent defense rank × pace

### 2c. NHL — Expected Goals (xG) + Poisson for Goal Totals

**Core model**: Poisson regression on team goal totals.

NHL scoring is well-modeled by Poisson because:

- Goals are rare events (~3 per team per game)
- Roughly independent shot-by-shot

```
λ_home = base_rate × (home_offense_xG / league_avg) × (away_defense_xGA / league_avg) × HCA
λ_away = base_rate × (away_offense_xG / league_avg) × (home_defense_xGA / league_avg)
```

**Puck line (±1.5)**:
Compute P(win by 2+) from the Poisson distribution:

```
P(home covers -1.5) = Σ P(home=k) × P(away<k-1) for all k
```

**Key features**: Goalie confirmed starter, 5v5 expected goals rate, power play %, recent form, back-to-back.

### 2d. MLB — Pitching Matchup + Poisson Runs

**Run-line model**: Poisson regression on runs scored per team.

Baseball is the most Poisson-friendly sport because:

- Runs are discrete count events
- Plate appearances are relatively independent

```
λ_team = team_runs_per_game × (starter_ERA_adj / league_avg) × park_factor × bullpen_fatigue_factor
```

**Key features**:

- Starting pitcher: ERA, FIP, xFIP, WHIP, handedness
- Bullpen: innings logged in last 3 days, ERA in high-leverage
- Batter vs pitcher splits (L/R matchup)
- Park factor (Coors Field = 1.3×, Dodger Stadium = 0.95×)
- Weather: wind direction at Wrigley, humidity

**Textbook ref**: Eager Ch.6 — the Poisson framework for count data generalizes perfectly to baseball runs.

### 2e. Football (Soccer) — Expected Goals (xG) + Poisson

**Goal model**: Poisson regression on team goal totals.

Soccer scoring is the most classically Poisson-distributed:

- Goals per team per game average ~1.2–1.5 in top leagues
- Independent event assumption holds reasonably well

```
λ_home = home_xG_per_90 × (away_xGA_per_90 / league_avg_xGA) × HCA
λ_away = away_xG_per_90 × (home_xGA_per_90 / league_avg_xGA)
```

**Asian Handicap conversion**: Soccer spreads use Asian Handicap (AH) — convert AH to implied probability, compare with our Poisson-derived probability.

**Key features**: xG for/against, squad rotation (midweek European games), injuries, managerial changes, travel distance.

---

## 3. EV CALCULATION PIPELINE

### 3a. Pipeline Architecture

```
DATA SOURCES → FEATURE ENGINEERING → MODEL PREDICTION → ODDS COMPARISON → EV OUTPUT
     │                  │                    │                  │              │
External APIs    Normalize per     Run sport-specific    Fetch live odds   Rank by EV%
(odds, stats,    sport: ratings,   GLM (Poisson /       from sportsbook   Filter by
injuries)        rolling avgs,     Logistic). Output:   API. Convert to   confidence
                 matchup data      P(outcome)           implied prob      threshold
```

### 3b. Confidence Classification

| Confidence     | Edge Threshold | Data Quality                                  | Action              |
| -------------- | -------------- | --------------------------------------------- | ------------------- |
| **High**       | Edge ≥ 4%      | Full injury data + confirmed lineups/starters | Display prominently |
| **Medium**     | 2% ≤ Edge < 4% | Partial injury data OR unconfirmed starters   | Display with caveat |
| **Low**        | 1% ≤ Edge < 2% | Thin data or model uncertainty high           | Display muted       |
| **No display** | Edge < 1%      | Below threshold                               | Filter out          |

### 3c. API Route Design

**`/api/betting/ev-opportunities`**

```
GET /api/betting/ev-opportunities?sport=NFL
Auth: requireUser
Response: {
  sport: 'NFL',
  opportunities: [{
    id, title, ev, confidence, sport,
    analysis: { headline, implied, model, edge, evPer100, confidence, basedOn, math[], backstory[] }
  }],
  lastUpdated: ISO timestamp
}
```

**`/api/betting/ev-opportunities/analyze`** (for modal deep-dive)

```
POST /api/betting/ev-opportunities/analyze
Auth: requireUser
Body: { opportunityId }
Response: {
  analysis: { ...full analysis object },
  relatedOpportunities: [...],
  historicalAccuracy: { last30days: '62%', allTime: '58%' }
}
```

---

## 4. DATA SOURCES & INTEGRATION ROADMAP

### Phase 1 — Static Placeholder (Now)

- Hardcoded `EV_ITEMS_BY_SPORT` in `page.js`
- No live odds fetching
- Manual curation of mock opportunities

### Phase 2 — Historical Model Training

- Ingest historical play-by-play data via `nfl_data_py` / `nflfastR`
- Train Poisson regression models offline (Node.js or Python script)
- Export model coefficients as JSON
- Server-side prediction using stored coefficients

### Phase 3 — Live Odds Integration

- Integrate odds API (The Odds API, Sportradar, or direct sportsbook feeds)
- Real-time comparison: our model probability vs live implied probability
- Auto-generate EV opportunities when edge exceeds threshold
- Cron job: `/api/cron/compute-ev` runs every 30 min on game days

### Phase 4 — User Personalization

- Track which EV opportunities users click/follow
- Surface sport preferences based on activity breadcrumbs
- Send push notifications for high-confidence opportunities
- A/B test different confidence thresholds

---

## 5. MATHEMATICAL REFERENCE

### 5a. Poisson Probability Mass Function

```
P(X = k) = (λ^k × e^(-λ)) / k!
```

In JavaScript:

```js
function poissonPMF(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Cumulative: P(X <= k)
function poissonCDF(k, lambda) {
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += poissonPMF(i, lambda);
  return sum;
}
```

_Textbook ref: Eager Ch.6 — "The Poisson Distribution ... defines the probability of obtaining the integer x as λ^x × e^(-λ) / x!"_

### 5b. Logistic Regression for Binary Outcomes

```
P(Y=1) = 1 / (1 + e^(-(β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ)))
```

_Textbook ref: Eager Ch.5 — Logistic regression for completion percentage; same framework applies to spread cover prediction._

### 5c. GLM Implementation in Node.js

For Phase 2, implement a lightweight Poisson GLM in JavaScript:

```js
// Simplified Poisson prediction using pre-trained coefficients
function predictPoisson(coefficients, features) {
  // Linear predictor on log scale
  let logLambda = coefficients.intercept;
  for (const [feature, value] of Object.entries(features)) {
    logLambda += coefficients[feature] * value;
  }
  // Transform to data scale
  return Math.exp(logLambda);
}

// Example: NFL passing TD prediction
const nflPassTDCoefficients = {
  intercept: -0.985, // from Eager Ch.6 Poisson regression
  pass_td_rate: 0.307, // per-TD multiplier
  total_line: 0.0196, // per-point total line effect
};

const mahomesLambda = predictPoisson(nflPassTDCoefficients, {
  pass_td_rate: 2.38,
  total_line: 51,
});
// mahomesLambda ≈ 2.11 expected TDs
```

### 5d. Monte Carlo Simulation for Complex Markets

For parlays, same-game parlays, or correlated events:

```js
function monteCarloEV(simulations, modelFn, oddsImplied) {
  let wins = 0;
  for (let i = 0; i < simulations; i++) {
    if (modelFn()) wins++;
  }
  const modelProb = wins / simulations;
  return modelProb - oddsImplied;
}
```

_Textbook ref: Eager does not cover Monte Carlo directly, but the Poisson simulation framework in Ch.6 extends naturally._

---

## 6. TEXTBOOK REFERENCE MAPPING

| EV Engine Feature             | Primary Reference         | Key Concepts                                                          |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------- |
| **Poisson for count props**   | Eager Ch.6                | Poisson distribution, PMF, CDF, λ estimation, `glm(family="poisson")` |
| **Logistic for spread bets**  | Eager Ch.5                | Logistic regression, odds ratios, binary classification               |
| **Feature engineering**       | Eager Ch.3–4              | Normalizing rushing data, yards over expected, multiple regression    |
| **Regression to the mean**    | Eager Ch.2                | Stable vs unstable stats, identifying regression candidates           |
| **Data wrangling (nflfastR)** | Eager Ch.1 + Appendix B–C | Play-by-play data, filtering, aggregation, summary stats              |
| **Model evaluation**          | Eager Ch.6                | Residual deviance, AIC, predicted vs actual comparison                |
| **Player clustering**         | Eager Ch.8                | PCA + K-means for player type identification                          |
| **Draft value curves**        | Eager Ch.7                | Exponential regression, surplus value, market efficiency              |

---

## 7. IMPORTANT CONVENTIONS

1. **All EV calculations run server-side** — never expose model coefficients or raw odds data to the client. API routes return only the computed EV%, confidence, and display data.

2. **Fail open** — if the EV engine is down or odds API is unreachable, show a "No opportunities detected" message. Never show stale EV data as current.

3. **No financial advice** — EV opportunities are informational and educational. Every display must include a disclaimer: "For educational purposes only. Not financial advice."

4. **Respect odds API rate limits** — cache odds fetches for 5 minutes minimum. Use the matching engine pattern from `src/lib/notifications/matching-engine.js`.

5. **Log model performance** — track predicted probability vs actual outcome for every displayed opportunity. Store in `ml_model_registry` (see ML instructions).

6. **Vig-adjusted probabilities only** — always remove the vig before comparing with our model. Raw sportsbook odds include vig that inflates implied probabilities.

7. **Minimum sample size** — never generate a model prediction for a player/team with fewer than 10 games of data in the current season.

8. **Regression to the mean** — all player rate stats should be regressed toward the league/position average based on sample size. Small samples get pulled heavily toward the mean.

_Textbook ref: Eager Ch.2 — "exploratory data analysis to examine which subset of quarterback passing data is more stable year to year" + Ch.6 — "the concept of regression toward the mean. When people are above average, statistical models expect them to decrease to be closer to average."_
