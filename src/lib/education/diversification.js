export const DIVERSIFICATION_DISCLAIMER =
  'Educational only — not investment advice. All investing involves risk, including loss of principal.';

export const DIVERSIFICATION_LESSON_ID = 'stocks-basic-7';
export const DIVERSIFICATION_LESSON_PATH = `/learning-center/course/${DIVERSIFICATION_LESSON_ID}`;

/** Balanced talking points — principle-first; cite reputable sources where stated. */
export const DIVERSIFICATION_POINTS = [
  {
    id: 'index-spread',
    stat: null,
    source: 'SEC Investor.gov — Diversification',
    plainExplanation:
      'Broad index funds hold hundreds of companies, so trouble at one firm usually has limited impact on the whole fund.',
    tradeoff:
      'You also give up the chance of outsized gains from a single stock that dramatically outperforms.',
  },
  {
    id: 'unsystematic-vs-market',
    stat: null,
    source: 'SEC Investor.gov — Market risk vs. company-specific risk',
    plainExplanation:
      'Diversification mainly reduces company-specific (unsystematic) risk — it does not remove broad market risk in downturns.',
    tradeoff:
      'When the whole market falls, diversified funds still decline; diversification is not a shield against every scenario.',
  },
  {
    id: 'low-vol-reits',
    stat: null,
    source: 'Historical market behavior (qualitative)',
    plainExplanation:
      'Some lower-volatility funds and REIT categories have shown smaller price swings than many individual stocks over long periods.',
    tradeoff:
      'REITs are interest-rate sensitive (notably weak in 2022 for many REIT funds), and low-vol strategies often lag in strong bull markets. Lower volatility ≠ no risk.',
  },
  {
    id: 'time-horizon',
    stat: null,
    source: 'Long-run investing principles',
    plainExplanation:
      "Diversification's benefits are clearest over long holding periods, when single-company shocks matter less relative to overall growth.",
    tradeoff: 'Over short periods, even diversified portfolios can still post sharp losses.',
  },
];

export function getDiversificationPoint(id) {
  return DIVERSIFICATION_POINTS.find((p) => p.id === id) ?? DIVERSIFICATION_POINTS[0];
}
