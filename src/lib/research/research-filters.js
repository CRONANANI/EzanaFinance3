/**
 * Filters for the research page's search pill.
 *
 * The pill switches between Company, Industry and Portfolio, and the filter
 * menu beside it offers a different set of options for each:
 *
 *   company    which search results to list, and which sectors and movers
 *              the stock market heatmap shows
 *   industry   which sectors the performance list shows, and their order
 *   portfolio  which portfolio models are on the page
 *
 * A filter only ever narrows what is already on screen. It never changes a
 * number. Pure: no React, no DOM; covered by scripts/check-research-filters.mjs.
 */

/** Sectors of the stock market heatmap, in its own order. */
export const HEATMAP_SECTORS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Consumer',
  'Energy',
  'Industrials',
];

export const PORTFOLIO_MODELS = [
  { id: 'stress', label: 'Stress test' },
  { id: 'mpt', label: 'Modern Portfolio Theory' },
  { id: 'black_litterman', label: 'Black-Litterman' },
  { id: 'monte_carlo', label: 'Monte Carlo' },
];

/**
 * kind 'single': exactly one option is on; the first is the default.
 * kind 'multi':  any number; none selected means all of them.
 */
export const FILTER_GROUPS = {
  company: [
    {
      id: 'results',
      label: 'Search results',
      kind: 'single',
      options: [
        { id: 'all', label: 'All' },
        { id: 'stocks', label: 'Stocks' },
        { id: 'etfs', label: 'ETFs' },
      ],
    },
    {
      id: 'sectors',
      label: 'Heatmap sectors',
      kind: 'multi',
      options: HEATMAP_SECTORS.map((s) => ({ id: s, label: s })),
    },
    {
      id: 'movers',
      label: 'Heatmap movers',
      kind: 'single',
      options: [
        { id: 'all', label: 'All' },
        { id: 'gainers', label: 'Gainers' },
        { id: 'decliners', label: 'Decliners' },
      ],
    },
  ],
  industry: [
    {
      id: 'direction',
      label: 'Sectors',
      kind: 'single',
      options: [
        { id: 'all', label: 'All' },
        { id: 'advancing', label: 'Advancing' },
        { id: 'declining', label: 'Declining' },
      ],
    },
    {
      id: 'sort',
      label: 'Order',
      kind: 'single',
      options: [
        { id: 'best', label: 'Best first' },
        { id: 'worst', label: 'Worst first' },
        { id: 'name', label: 'A to Z' },
      ],
    },
  ],
  portfolio: [
    {
      id: 'models',
      label: 'Models shown',
      kind: 'multi',
      options: PORTFOLIO_MODELS,
    },
  ],
};

export const FILTER_VIEWS = Object.keys(FILTER_GROUPS);

function defaultsFor(view) {
  const out = {};
  for (const g of FILTER_GROUPS[view]) out[g.id] = g.kind === 'multi' ? [] : g.options[0].id;
  return out;
}

/** A fresh default state. Never share the arrays inside it. */
export function defaultFilters() {
  const out = {};
  for (const view of FILTER_VIEWS) out[view] = defaultsFor(view);
  return out;
}

/**
 * Rebuild a filter state from anything (a stored value, a stale shape).
 * Unknown views, groups and options are dropped; missing ones get defaults.
 */
export function sanitizeFilters(raw) {
  const out = defaultFilters();
  if (!raw || typeof raw !== 'object') return out;
  for (const view of FILTER_VIEWS) {
    const src = raw[view];
    if (!src || typeof src !== 'object') continue;
    for (const g of FILTER_GROUPS[view]) {
      const ids = g.options.map((o) => o.id);
      const value = src[g.id];
      if (g.kind === 'multi') {
        if (Array.isArray(value)) {
          const picked = ids.filter((id) => value.includes(id));
          /* Every option selected is the same as none: show everything. */
          out[view][g.id] = picked.length === ids.length ? [] : picked;
        }
      } else if (ids.includes(value)) {
        out[view][g.id] = value;
      }
    }
  }
  return out;
}

/** Choose an option. Returns a new state; the old one is left alone. */
export function chooseFilter(filters, view, groupId, optionId) {
  const group = FILTER_GROUPS[view]?.find((g) => g.id === groupId);
  if (!group) return filters;
  const current = filters[view][groupId];
  let next;
  if (group.kind === 'multi') {
    if (optionId === null) next = [];
    else if (!group.options.some((o) => o.id === optionId)) return filters;
    else if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
    else next = [...current, optionId];
  } else {
    if (!group.options.some((o) => o.id === optionId)) return filters;
    next = optionId;
  }
  return sanitizeFilters({ ...filters, [view]: { ...filters[view], [groupId]: next } });
}

/** Put one view back to its defaults. */
export function resetFilters(filters, view) {
  if (!FILTER_GROUPS[view]) return filters;
  return { ...filters, [view]: defaultsFor(view) };
}

/** How many groups of a view are away from their default. */
export function countActive(filters, view) {
  const groups = FILTER_GROUPS[view];
  if (!groups) return 0;
  let n = 0;
  for (const g of groups) {
    const value = filters?.[view]?.[g.id];
    if (g.kind === 'multi') {
      if (Array.isArray(value) && value.length) n += 1;
    } else if (value !== undefined && value !== g.options[0].id) {
      n += 1;
    }
  }
  return n;
}

/* ── Company ─────────────────────────────────────────────────────────── */

const FUND_TYPE = /^(etp|etf)$/i;

/** Keep the search suggestions the "Search results" filter allows. */
export function filterSuggestions(suggestions, results) {
  if (!Array.isArray(suggestions)) return [];
  if (results === 'etfs')
    return suggestions.filter((s) => FUND_TYPE.test(String(s?.type || '').trim()));
  if (results === 'stocks') {
    return suggestions.filter((s) => !FUND_TYPE.test(String(s?.type || '').trim()));
  }
  return suggestions;
}

/**
 * Narrow the heatmap's data. `sectorData` is { sector: [{ t, ch }] }.
 * Returns the same shape, with emptied sectors left out.
 */
export function filterHeatmap(sectorData, { sectors = [], movers = 'all' } = {}) {
  const out = {};
  for (const [sector, stocks] of Object.entries(sectorData || {})) {
    if (sectors.length && !sectors.includes(sector)) continue;
    const kept = (stocks || []).filter((s) => {
      if (movers === 'gainers') return s.ch > 0;
      if (movers === 'decliners') return s.ch < 0;
      return true;
    });
    if (kept.length) out[sector] = kept;
  }
  return out;
}

/* ── Industry ────────────────────────────────────────────────────────── */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Filter and order sector rows ({ name, changePct }). Rows without a number
 * are only listed when every sector is asked for, and always come last.
 */
export function applySectorFilters(rows, { direction = 'all', sort = 'best' } = {}) {
  const list = (rows || []).filter((r) => {
    if (direction === 'advancing') return isNum(r.changePct) && r.changePct > 0;
    if (direction === 'declining') return isNum(r.changePct) && r.changePct < 0;
    return true;
  });
  return [...list].sort((a, b) => {
    if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
    const aNum = isNum(a.changePct);
    const bNum = isNum(b.changePct);
    if (!aNum && !bNum) return 0;
    if (!aNum) return 1;
    if (!bNum) return -1;
    return sort === 'worst' ? a.changePct - b.changePct : b.changePct - a.changePct;
  });
}

/* ── Portfolio ───────────────────────────────────────────────────────── */

/** Whether a portfolio model card is on the page. None selected means all. */
export function modelVisible(models, id) {
  return !Array.isArray(models) || models.length === 0 || models.includes(id);
}
