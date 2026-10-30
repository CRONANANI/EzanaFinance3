/**
 * One map from any sector label the app shows (GICS-style "Health Care",
 * "Financials") to the names the upstreams use, for every place a sector
 * name leaves the app: the market-data screener (`fmp`) and the news
 * industries filter (`news`). Built from CANONICAL_TO_DISPLAY in
 * @/lib/fmp/sector-performance so the heatmap, the sector modal and the
 * route can never disagree. The news provider names its industries the same
 * way the screener names sectors, so `news` equals `fmp` for all eleven.
 */
import { CANONICAL_SECTORS, CANONICAL_TO_DISPLAY } from '@/lib/fmp/sector-performance';

/* Labels people type or older surfaces use that are neither canonical nor
   the display label. */
const EXTRA_ALIASES = {
  'Information Technology': 'Technology',
  Tech: 'Technology',
  Financial: 'Financial Services',
  Finance: 'Financial Services',
  'Health care': 'Healthcare',
  Telecom: 'Communication Services',
  'Communication Services': 'Communication Services',
  Staples: 'Consumer Defensive',
  Discretionary: 'Consumer Cyclical',
};

function entry(canonical) {
  return { fmp: canonical, news: canonical, label: CANONICAL_TO_DISPLAY[canonical] || canonical };
}

/** label -> { fmp, news, label } */
export const SECTOR_MAP = Object.freeze(
  Object.fromEntries([
    ...CANONICAL_SECTORS.map((c) => [c, entry(c)]),
    ...Object.entries(CANONICAL_TO_DISPLAY).map(([c, display]) => [display, entry(c)]),
    ...Object.entries(EXTRA_ALIASES).map(([alias, c]) => [alias, entry(c)]),
  ]),
);

/** The eleven sectors as the UI labels them. */
export const UI_SECTORS = Object.freeze(Object.values(CANONICAL_TO_DISPLAY));

const LOWER = new Map(Object.entries(SECTOR_MAP).map(([k, v]) => [k.toLowerCase(), v]));

/** Case-insensitive lookup; null for an unknown label. */
export function mapSector(label) {
  return (
    LOWER.get(
      String(label ?? '')
        .trim()
        .toLowerCase(),
    ) || null
  );
}

/* Period toggle value -> field in the price-change endpoint. */
export const PERIOD_FIELD = Object.freeze({
  '1D': '1D',
  '1W': '5D',
  '5D': '5D',
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  YTD: 'ytd',
  '1Y': '1Y',
});

export const SUPPORTED_PERIODS = Object.freeze(Object.keys(PERIOD_FIELD));
