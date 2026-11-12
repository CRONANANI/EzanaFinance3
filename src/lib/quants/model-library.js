// src/lib/quants/model-library.js
// The For The Quants Model Library: the thirteen models on the tier board,
// the Ezana rubric that ranks them, and the helpers that turn rubric scores or
// community votes into tiers. Pure data and pure functions (client and server).

export const TIERS = ['S', 'A', 'B', 'C', 'D'];

/** Vote value per tier: S = 5 down to D = 1. */
export const TIER_SCORE = { S: 5, A: 4, B: 3, C: 2, D: 1 };

/** A model needs this many votes before the community view ranks it. */
export const MIN_COMMUNITY_VOTES = 5;

/** The four rubric criteria, each scored 1 to 5. A higher score is always better. */
export const RUBRIC = [
  {
    id: 'interpretability',
    label: 'Interpretability',
    hint: 'Can you explain every parameter and why the output moved?',
  },
  {
    id: 'dataEfficiency',
    label: 'Data efficiency',
    hint: 'Does it work on a few years of daily prices, or does it need far more?',
  },
  {
    id: 'robustness',
    label: 'Robustness',
    hint: 'Does it hold up out of sample and across market regimes?',
  },
  {
    id: 'practicalUse',
    label: 'Practical use',
    hint: 'How widely do working desks and funds rely on it today?',
  },
];

export const RUBRIC_MAX = RUBRIC.length * 5;

/* Tier floors on the 4 to 20 rubric total. */
const TIER_FLOORS = [
  ['S', 17],
  ['A', 15],
  ['B', 12],
  ['C', 8],
  ['D', 0],
];

export const QUANT_MODELS = [
  {
    id: 'black-scholes',
    name: 'Black-Scholes',
    family: 'Derivatives pricing',
    summary:
      'Prices a European option by assuming the stock follows geometric Brownian motion with constant volatility. Its real job on a desk is as a quoting language: traders quote implied volatility, and the formula converts it to a price.',
    equation: 'C = S N(d1) - K exp(-rT) N(d2),  d1 = [ln(S/K) + (r + s^2/2) T] / (s sqrt(T))',
    breaks:
      'Volatility is not constant and returns have fat tails, which is why implied volatility smiles across strikes. Use it to compare options, not as a forecast.',
    reading: 'Larcher, The Art of Quantitative Finance Vol. 1, ch. 4',
    scores: { interpretability: 5, dataEfficiency: 5, robustness: 3, practicalUse: 5 },
  },
  {
    id: 'trees',
    name: 'Trees',
    family: 'Derivatives pricing',
    summary:
      'Binomial and trinomial lattices step the price up or down through time and value an option by working backward from expiry. They handle early exercise and dividends, which a closed-form formula cannot.',
    equation: 'V = exp(-r dt) [p V_up + (1 - p) V_down],  p = (exp(r dt) - d) / (u - d)',
    breaks:
      'Convergence is slow and oscillates with the number of steps, and the tree grows quickly once there is more than one source of risk.',
    reading: 'Larcher, The Art of Quantitative Finance Vol. 1, ch. 3',
    scores: { interpretability: 5, dataEfficiency: 5, robustness: 4, practicalUse: 4 },
  },
  {
    id: 'markov-chains',
    name: 'Markov Chains',
    family: 'Regimes',
    summary:
      'Models a market as moving between a few states, where the odds of tomorrow depend only on today. The transition matrix tells you how sticky each state is and where the market settles in the long run.',
    equation: 'P(X[t+1] = j | X[t] = i) = p_ij,  stationary pi solves pi = pi P',
    breaks:
      'The states are a choice you make, and one day of memory is a strong assumption. Daily direction has almost no memory; volatility states have plenty.',
    reading: 'Velu, Hardy and Nehren, Algorithmic Trading and Quantitative Strategies, ch. 4.2',
    scores: { interpretability: 5, dataEfficiency: 4, robustness: 4, practicalUse: 4 },
    live: 'markov',
  },
  {
    id: 'garch',
    name: 'ARCH / GARCH',
    family: 'Volatility',
    summary:
      'Forecasts volatility from its own past. Large moves cluster, so yesterday’s shock and yesterday’s variance both feed today’s estimate, which then decays back toward a long-run level.',
    equation: 'sigma2[t] = omega + alpha e[t-1]^2 + beta sigma2[t-1],  alpha + beta < 1',
    breaks:
      'The plain model treats up and down shocks the same and is slow to react to a sudden regime break. It forecasts the size of moves, never the direction.',
    reading:
      'Velu, Hardy and Nehren, Algorithmic Trading and Quantitative Strategies, ch. 2.10 to 2.11',
    scores: { interpretability: 4, dataEfficiency: 4, robustness: 4, practicalUse: 5 },
    live: 'garch',
  },
  {
    id: 'pca',
    name: 'PCA',
    family: 'Factor structure',
    summary:
      'Rotates a set of correlated returns into uncorrelated components ranked by how much variance each explains. In equities the first component is usually the market, and the next few behave like sector or style factors.',
    equation: 'Sigma v_k = lambda_k v_k,  explained_k = lambda_k / sum(lambda)',
    breaks:
      'Components are statistical, not economic, so their meaning can drift between samples. Correlations rise in a crisis, which collapses the structure into one factor.',
    reading: 'Marti, From Data to Trade, ch. 2.1; Velu, Hardy and Nehren, ch. 3.2',
    scores: { interpretability: 4, dataEfficiency: 4, robustness: 4, practicalUse: 5 },
    live: 'pca',
  },
  {
    id: 'bachelier',
    name: 'Bachelier',
    family: 'Derivatives pricing',
    summary:
      'The original option model: price changes are normal in absolute terms instead of percentage terms. It is the standard choice when prices can sit near zero or go negative, such as rates and some commodity spreads.',
    equation: 'C = (F - K) N(d) + s sqrt(T) n(d),  d = (F - K) / (s sqrt(T))',
    breaks:
      'It allows negative prices, which is wrong for a stock over long horizons, and it shares the constant volatility assumption of Black-Scholes.',
    scores: { interpretability: 5, dataEfficiency: 5, robustness: 3, practicalUse: 3 },
  },
  {
    id: 'arma',
    name: 'MA / AR / ARIMA',
    family: 'Time series',
    summary:
      'Forecasts a series from its own lags and past forecast errors. It is the baseline every other time series model has to beat, and the right tool for spreads, yields and macro series that mean revert.',
    equation: 'y[t] = c + sum(phi_i y[t-i]) + sum(theta_j e[t-j]) + e[t]',
    breaks:
      'Raw stock returns have very little linear autocorrelation, so on prices it mostly forecasts the mean. It also assumes the relationship is stable over the sample.',
    reading: 'Velu, Hardy and Nehren, Algorithmic Trading and Quantitative Strategies, ch. 2',
    scores: { interpretability: 5, dataEfficiency: 5, robustness: 3, practicalUse: 3 },
  },
  {
    id: 'nelson-siegel',
    name: 'Nelson-Siegel',
    family: 'Yield curve',
    summary:
      'Describes an entire yield curve with three factors: level, slope and curvature. It gives a smooth curve from a handful of bond yields and makes curve moves easy to compare through time.',
    equation: 'y(m) = b0 + b1 (1 - exp(-m/t)) / (m/t) + b2 [(1 - exp(-m/t)) / (m/t) - exp(-m/t)]',
    breaks:
      'It is a curve fit, not an arbitrage-free model, and it struggles with curves that have more than one hump.',
    scores: { interpretability: 4, dataEfficiency: 4, robustness: 4, practicalUse: 4 },
  },
  {
    id: 'kalman',
    name: 'Kalman Filters',
    family: 'State estimation',
    summary:
      'Tracks a hidden quantity that changes through time, updating the estimate as each new observation arrives. In trading it gives a hedge ratio or beta that adapts instead of one fixed number for the whole sample.',
    equation: 'x[t] = x[t-1] + w,  y[t] = H x[t] + v,  update: x = x + K (y - H x)',
    breaks:
      'Results depend heavily on the two noise settings, which are hard to pin down. Too loose and it chases noise; too tight and it lags.',
    reading: 'Velu, Hardy and Nehren, Algorithmic Trading and Quantitative Strategies, ch. 4.1',
    scores: { interpretability: 3, dataEfficiency: 4, robustness: 4, practicalUse: 4 },
  },
  {
    id: 'heston-sabr',
    name: 'Heston / SABR',
    family: 'Stochastic volatility',
    summary:
      'Let volatility itself move randomly and correlate with price, which reproduces the smile and skew that Black-Scholes cannot. Heston is common in equities and FX; SABR is the market standard for rates.',
    equation: 'dS = mu S dt + sqrt(v) S dW1,  dv = kappa (theta - v) dt + xi sqrt(v) dW2',
    breaks:
      'They must be calibrated to a full options surface, the parameters are unstable day to day, and several parameter sets can fit the same smile.',
    scores: { interpretability: 3, dataEfficiency: 2, robustness: 3, practicalUse: 5 },
  },
  {
    id: 'hmm',
    name: 'HMM',
    family: 'Regimes',
    summary:
      'A Markov chain whose states you cannot see directly. The model infers the hidden regime, such as calm or stressed, from the returns it produces, and gives a probability for each regime on each day.',
    equation: 'r[t] ~ N(mu_S, sigma_S),  S[t] follows a Markov chain with matrix P',
    breaks:
      'Regimes are confirmed with a lag, the fit can land on different answers from different starting points, and the number of states is your call.',
    reading: 'Velu, Hardy and Nehren, Algorithmic Trading and Quantitative Strategies, ch. 4.2',
    scores: { interpretability: 3, dataEfficiency: 3, robustness: 3, practicalUse: 4 },
  },
  {
    id: 'autoencoders',
    name: 'Autoencoders',
    family: 'Deep learning',
    summary:
      'A neural network that compresses data into a small code and rebuilds it. In finance it works as a nonlinear PCA for factor extraction, and as an anomaly detector: whatever it rebuilds badly is unusual.',
    equation: 'z = f(x),  x_hat = g(z),  minimize |x - x_hat|^2',
    breaks:
      'It needs far more data than daily prices provide, the learned factors are hard to explain, and it overfits easily on noisy returns.',
    reading: 'Marti, From Data to Trade, ch. 6',
    scores: { interpretability: 1, dataEfficiency: 2, robustness: 2, practicalUse: 3 },
  },
  {
    id: 'vae-gan',
    name: 'VAEs / GANs',
    family: 'Deep learning',
    summary:
      'Generative networks that learn to produce synthetic market data resembling the real thing. The main use is creating extra scenarios for stress tests and for training other models.',
    equation:
      'VAE: maximize E[log p(x|z)] - KL(q(z|x) || p(z));  GAN: generator against discriminator',
    breaks:
      'Training is unstable, it is hard to verify that synthetic paths keep the properties that matter, and a model can replay its training data.',
    scores: { interpretability: 1, dataEfficiency: 1, robustness: 1, practicalUse: 2 },
  },
];

export const MODEL_IDS = QUANT_MODELS.map((m) => m.id);

export function rubricTotal(model) {
  return RUBRIC.reduce((sum, c) => sum + (model.scores?.[c.id] || 0), 0);
}

export function tierForTotal(total) {
  return TIER_FLOORS.find(([, floor]) => total >= floor)[0];
}

/** Mean vote (1 to 5) to a tier, rounding to the nearest. */
export function tierForMeanVote(avg) {
  const rounded = Math.min(5, Math.max(1, Math.round(avg)));
  return TIERS.find((t) => TIER_SCORE[t] === rounded);
}

/**
 * Group models into tier rows.
 * @param {'rubric'|'community'} mode
 * @param {Record<string, { votes: number, avg: number }>} [summary] community vote summary
 * @returns {{ rows: { tier: string, models: object[] }[], unranked: object[] }}
 */
export function buildBoard(mode = 'rubric', summary = {}) {
  const rows = TIERS.map((tier) => ({ tier, models: [] }));
  const unranked = [];
  for (const model of QUANT_MODELS) {
    const total = rubricTotal(model);
    const s = summary[model.id];
    const entry = { ...model, total, rubricTier: tierForTotal(total), votes: s?.votes || 0 };
    if (mode === 'community') {
      if (!s || s.votes < MIN_COMMUNITY_VOTES) {
        unranked.push(entry);
        continue;
      }
      entry.communityTier = tierForMeanVote(s.avg);
      rows.find((r) => r.tier === entry.communityTier).models.push(entry);
    } else {
      rows.find((r) => r.tier === entry.rubricTier).models.push(entry);
    }
  }
  for (const row of rows) {
    row.models.sort((a, b) =>
      mode === 'community'
        ? (summary[b.id]?.avg || 0) - (summary[a.id]?.avg || 0)
        : b.total - a.total || a.name.localeCompare(b.name),
    );
  }
  return { rows, unranked };
}
