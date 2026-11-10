/**
 * Smart Watchlists (Nov 2026): the rule language, shared by the builder
 * dialog, the API (validation) and the engine (matching).
 *
 * A smart list has one asset class, a match mode ('all' | 'any') and 1 to 6
 * conditions. Each condition is `{ type, ...params }` from CONDITIONS below.
 * The engine gathers candidates for the class (see smart-engine.js), and
 * `evaluateCandidate` decides whether each one matches and why. Pure: no
 * React, no DOM, no fetch. Tested by scripts/check-watchlist-monitor.mjs.
 *
 * Candidate shape:
 *   priced assets  { type, ticker, name, sector, marketCap, price, changePct, trades }
 *   politicians    { type: 'politician', ticker: bioguide_id, name, party, chamber, state, trades }
 *   trades         [{ date: 'YYYY-MM-DD', side: 'buy' | 'sell', amount: number|null,
 *                     ticker?, party?, chamber? }]
 *                  (for an asset: congressional trades in it; for a
 *                   politician: that member's trades)
 */

export const MAX_CONDITIONS = 6;
export const MAX_ITEMS_CAP = 50;
export const PER_RUN_CAP = 10;

export const PARTIES = [
  { id: 'D', label: 'Democrat' },
  { id: 'R', label: 'Republican' },
  { id: 'I', label: 'Independent' },
];
export const CHAMBERS = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];
export const SIDES = [
  { id: 'buy', label: 'Bought' },
  { id: 'sell', label: 'Sold' },
  { id: 'any', label: 'Traded' },
];
/** Display sectors the stock screener understands (src/lib/research/sectorMap.js UI_SECTORS). */
export const STOCK_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Communication Services',
  'Industrials',
  'Energy',
  'Utilities',
  'Real Estate',
  'Basic Materials',
];

/** How the app labels each screener sector (CANONICAL_TO_DISPLAY in lib/fmp/sector-performance). */
export const SECTOR_LABELS = {
  Technology: 'Technology',
  Healthcare: 'Health Care',
  'Financial Services': 'Financials',
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Defensive': 'Consumer Staples',
  'Communication Services': 'Communication Services',
  Industrials: 'Industrials',
  Energy: 'Energy',
  Utilities: 'Utilities',
  'Real Estate': 'Real Estate',
  'Basic Materials': 'Materials',
};
const sectorLabel = (s) => SECTOR_LABELS[s] || s;

const PRICED = ['stock', 'bond_etf', 'commodity', 'crypto'];

/**
 * The catalog. `classes` says which asset classes offer the condition;
 * `defaults` seeds the builder.
 */
export const CONDITIONS = {
  day_change: {
    label: 'Day change',
    classes: PRICED,
    defaults: { op: 'gte', value: 3 },
  },
  price: {
    label: 'Price',
    classes: PRICED,
    defaults: { min: 10, max: null },
  },
  market_cap: {
    label: 'Market cap',
    classes: ['stock'],
    defaults: { min: 10, max: null }, // billions of USD
  },
  sector: {
    label: 'Sector',
    classes: ['stock'],
    defaults: { sectors: ['Technology'] },
  },
  congress_traded: {
    label: 'Congressional trades',
    classes: ['stock'],
    defaults: { side: 'buy', days: 30, min_members: 1, min_amount: null, party: 'any' },
  },
  party: {
    label: 'Party',
    classes: ['politician'],
    defaults: { parties: ['D'] },
  },
  chamber: {
    label: 'Chamber',
    classes: ['politician'],
    defaults: { chambers: ['senate'] },
  },
  state: {
    label: 'State',
    classes: ['politician'],
    defaults: { states: [] },
  },
  trade_activity: {
    label: 'Trading activity',
    classes: ['politician'],
    defaults: { side: 'any', days: 30, min_trades: 3 },
  },
  traded_ticker: {
    label: 'Traded a ticker',
    classes: ['politician'],
    defaults: { ticker: 'NVDA', side: 'buy', days: 90 },
  },
  trade_size: {
    label: 'Trade size',
    classes: ['politician'],
    defaults: { min_amount: 250000, days: 90 },
  },
};

/** Condition types offered for a class, in catalog order. */
export const conditionsFor = (assetClass) =>
  Object.entries(CONDITIONS)
    .filter(([, c]) => c.classes.includes(assetClass))
    .map(([type]) => type);

/** A fresh condition of `type` with its defaults. */
export const newCondition = (type) => ({ type, ...(CONDITIONS[type]?.defaults || {}) });

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const finiteOrNull = (v) => {
  const n = num(v);
  return n === null || !Number.isFinite(n) ? null : n;
};
const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const TICKER_RE = /^[A-Z][A-Z0-9.=-]{0,11}$/;

/** Clean one condition. Returns { ok, condition } or { ok: false, error }. */
export function sanitizeCondition(raw, assetClass) {
  const type = raw?.type;
  const spec = CONDITIONS[type];
  if (!spec) return { ok: false, error: 'Unknown condition.' };
  if (!spec.classes.includes(assetClass)) {
    return { ok: false, error: `${spec.label} is not available for this asset class.` };
  }
  switch (type) {
    case 'day_change': {
      const value = finiteOrNull(raw.value);
      if (value === null || Math.abs(value) > 100)
        return { ok: false, error: 'Day change needs a percent between -100 and 100.' };
      return { ok: true, condition: { type, op: raw.op === 'lte' ? 'lte' : 'gte', value } };
    }
    case 'price':
    case 'market_cap': {
      const min = finiteOrNull(raw.min);
      const max = finiteOrNull(raw.max);
      if (min === null && max === null)
        return { ok: false, error: `${spec.label} needs a minimum or a maximum.` };
      if ((min !== null && min < 0) || (max !== null && max < 0))
        return { ok: false, error: `${spec.label} cannot be negative.` };
      if (min !== null && max !== null && min > max)
        return { ok: false, error: `${spec.label}: the minimum is above the maximum.` };
      return { ok: true, condition: { type, min, max } };
    }
    case 'sector': {
      const sectors = [...new Set((raw.sectors || []).filter((s) => STOCK_SECTORS.includes(s)))];
      if (!sectors.length) return { ok: false, error: 'Pick at least one sector.' };
      return { ok: true, condition: { type, sectors } };
    }
    case 'congress_traded': {
      const side = ['buy', 'sell', 'any'].includes(raw.side) ? raw.side : 'buy';
      const party = ['D', 'R', 'I', 'any'].includes(raw.party) ? raw.party : 'any';
      return {
        ok: true,
        condition: {
          type,
          side,
          party,
          days: clampInt(raw.days, 1, 365, 30),
          min_members: clampInt(raw.min_members, 1, 50, 1),
          min_amount: finiteOrNull(raw.min_amount),
        },
      };
    }
    case 'party': {
      const parties = [...new Set((raw.parties || []).filter((p) => ['D', 'R', 'I'].includes(p)))];
      if (!parties.length) return { ok: false, error: 'Pick at least one party.' };
      return { ok: true, condition: { type, parties } };
    }
    case 'chamber': {
      const chambers = [
        ...new Set((raw.chambers || []).filter((c) => ['house', 'senate'].includes(c))),
      ];
      if (!chambers.length) return { ok: false, error: 'Pick the House, the Senate or both.' };
      return { ok: true, condition: { type, chambers } };
    }
    case 'state': {
      const states = [
        ...new Set(
          (raw.states || [])
            .map((s) => String(s).trim().toUpperCase())
            .filter((s) => /^[A-Z]{2}$/.test(s)),
        ),
      ];
      if (!states.length) return { ok: false, error: 'Add at least one two-letter state code.' };
      return { ok: true, condition: { type, states } };
    }
    case 'trade_activity': {
      return {
        ok: true,
        condition: {
          type,
          side: ['buy', 'sell', 'any'].includes(raw.side) ? raw.side : 'any',
          days: clampInt(raw.days, 1, 365, 30),
          min_trades: clampInt(raw.min_trades, 1, 500, 3),
        },
      };
    }
    case 'traded_ticker': {
      const ticker = String(raw.ticker || '')
        .trim()
        .toUpperCase();
      if (!TICKER_RE.test(ticker)) return { ok: false, error: 'Enter a valid ticker.' };
      return {
        ok: true,
        condition: {
          type,
          ticker,
          side: ['buy', 'sell', 'any'].includes(raw.side) ? raw.side : 'buy',
          days: clampInt(raw.days, 1, 365, 90),
        },
      };
    }
    case 'trade_size': {
      const min = finiteOrNull(raw.min_amount);
      if (min === null || min <= 0)
        return { ok: false, error: 'Trade size needs a minimum amount.' };
      return {
        ok: true,
        condition: { type, min_amount: min, days: clampInt(raw.days, 1, 365, 90) },
      };
    }
    default:
      return { ok: false, error: 'Unknown condition.' };
  }
}

/**
 * Clean a whole rule from a request body.
 * Returns { ok, rule: { asset_class, match, conditions, max_items, notify, enabled } }
 * or { ok: false, error }.
 */
export function sanitizeRule(raw) {
  const assetClass = raw?.asset_class;
  if (![...PRICED, 'politician'].includes(assetClass))
    return { ok: false, error: 'Pick an asset class.' };
  const list = Array.isArray(raw.conditions) ? raw.conditions : [];
  if (list.length < 1) return { ok: false, error: 'Add at least one condition.' };
  if (list.length > MAX_CONDITIONS)
    return { ok: false, error: `Use at most ${MAX_CONDITIONS} conditions.` };
  const conditions = [];
  for (const c of list) {
    const r = sanitizeCondition(c, assetClass);
    if (!r.ok) return r;
    conditions.push(r.condition);
  }
  return {
    ok: true,
    rule: {
      asset_class: assetClass,
      match: raw.match === 'any' ? 'any' : 'all',
      conditions,
      max_items: clampInt(raw.max_items, 1, MAX_ITEMS_CAP, 25),
      notify: raw.notify !== false,
      enabled: raw.enabled !== false,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Plain-language descriptions                                         */
/* ------------------------------------------------------------------ */

const usd = (v) => {
  if (!Number.isFinite(v)) return '';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString('en-US')}`;
};
const money2 = (v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const sideVerb = (s) => (s === 'buy' ? 'bought' : s === 'sell' ? 'sold' : 'traded');
const partyName = (p) => PARTIES.find((x) => x.id === p)?.label || p;
const joinOr = (xs) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
const days = (n) => (n === 1 ? 'the last day' : `the last ${n} days`);

/** One line for a condition, e.g. "Up 3% or more today". */
export function describeCondition(c) {
  switch (c?.type) {
    case 'day_change':
      if (c.op === 'lte') {
        return c.value < 0
          ? `Down ${Math.abs(c.value)}% or more today`
          : `Day change of ${c.value}% or lower`;
      }
      return c.value >= 0 ? `Up ${c.value}% or more today` : `Day change of ${c.value}% or higher`;
    case 'price':
      if (c.min != null && c.max != null)
        return `Price between ${money2(c.min)} and ${money2(c.max)}`;
      return c.min != null
        ? `Price at or above ${money2(c.min)}`
        : `Price at or below ${money2(c.max)}`;
    case 'market_cap':
      if (c.min != null && c.max != null) return `Market cap between $${c.min}B and $${c.max}B`;
      return c.min != null
        ? `Market cap of $${c.min}B or more`
        : `Market cap of $${c.max}B or less`;
    case 'sector':
      return `In ${joinOr(c.sectors.map(sectorLabel))}`;
    case 'congress_traded': {
      const who =
        c.party && c.party !== 'any' ? `${partyName(c.party)} members` : 'members of Congress';
      const count = c.min_members > 1 ? `${c.min_members} or more ${who}` : who;
      const size = c.min_amount ? ` (${usd(c.min_amount)}+ trades)` : '';
      return `${sideVerb(c.side)[0].toUpperCase()}${sideVerb(c.side).slice(1)} by ${count} in ${days(c.days)}${size}`;
    }
    case 'party':
      return joinOr(c.parties.map(partyName));
    case 'chamber':
      return c.chambers.length === 2
        ? 'House or Senate'
        : CHAMBERS.find((x) => x.id === c.chambers[0])?.label || '';
    case 'state':
      return `From ${joinOr(c.states)}`;
    case 'trade_activity':
      return `${c.min_trades}+ trades ${c.side === 'any' ? '' : `(${sideVerb(c.side)}) `}in ${days(c.days)}`;
    case 'traded_ticker':
      return `${sideVerb(c.side)[0].toUpperCase()}${sideVerb(c.side).slice(1)} ${c.ticker} in ${days(c.days)}`;
    case 'trade_size':
      return `A trade of ${usd(c.min_amount)} or more in ${days(c.days)}`;
    default:
      return '';
  }
}

/** The whole rule as a sentence: "Stocks that are up 3% or more today and in Technology". */
export function describeRule(rule) {
  const parts = (rule?.conditions || []).map(describeCondition).filter(Boolean);
  const glue = rule?.match === 'any' ? ' or ' : ' and ';
  return parts.join(glue);
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

const DAY = 86400000;
const within = (dateStr, nDays, now) => {
  const t = Date.parse(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) && now - t <= nDays * DAY;
};
const sideOk = (want, side) => want === 'any' || want === side;

/**
 * Test one condition. Returns a short reason string when it matches, else
 * null. Unknown data (a missing price, sector or market cap) never matches.
 */
export function testCondition(c, cand, now = Date.now()) {
  switch (c.type) {
    case 'day_change': {
      const v = cand.changePct;
      if (!Number.isFinite(v)) return null;
      const ok = c.op === 'lte' ? v <= c.value : v >= c.value;
      return ok ? `${v >= 0 ? 'Up' : 'Down'} ${Math.abs(v).toFixed(2)}% today` : null;
    }
    case 'price': {
      const p = cand.price;
      if (!Number.isFinite(p)) return null;
      if (c.min != null && p < c.min) return null;
      if (c.max != null && p > c.max) return null;
      return `Price ${money2(p)}`;
    }
    case 'market_cap': {
      const m = cand.marketCap;
      if (!Number.isFinite(m)) return null;
      const b = m / 1e9;
      if (c.min != null && b < c.min) return null;
      if (c.max != null && b > c.max) return null;
      return `Market cap $${b >= 100 ? b.toFixed(0) : b.toFixed(1)}B`;
    }
    case 'sector':
      return cand.sector && c.sectors.includes(cand.sector) ? sectorLabel(cand.sector) : null;
    case 'congress_traded': {
      const hits = (cand.trades || []).filter(
        (t) =>
          within(t.date, c.days, now) &&
          sideOk(c.side, t.side) &&
          (c.party === 'any' || t.party === c.party) &&
          (!c.min_amount || (Number.isFinite(t.amount) && t.amount >= c.min_amount)),
      );
      const members = new Set(hits.map((t) => t.member || t.bioguide || `${t.date}-${t.amount}`));
      if (members.size < (c.min_members || 1)) return null;
      return `${sideVerb(c.side)[0].toUpperCase()}${sideVerb(c.side).slice(1)} by ${members.size} member${members.size === 1 ? '' : 's'} of Congress in ${c.days}d`;
    }
    case 'party':
      return cand.party && c.parties.includes(cand.party) ? partyName(cand.party) : null;
    case 'chamber':
      return cand.chamber && c.chambers.includes(cand.chamber)
        ? CHAMBERS.find((x) => x.id === cand.chamber)?.label
        : null;
    case 'state':
      return cand.state && c.states.includes(cand.state) ? cand.state : null;
    case 'trade_activity': {
      const n = (cand.trades || []).filter(
        (t) => within(t.date, c.days, now) && sideOk(c.side, t.side),
      ).length;
      return n >= c.min_trades ? `${n} trades in ${c.days}d` : null;
    }
    case 'traded_ticker': {
      const hit = (cand.trades || []).find(
        (t) => t.ticker === c.ticker && within(t.date, c.days, now) && sideOk(c.side, t.side),
      );
      return hit
        ? `${sideVerb(hit.side)[0].toUpperCase()}${sideVerb(hit.side).slice(1)} ${c.ticker} on ${hit.date}`
        : null;
    }
    case 'trade_size': {
      const hit = (cand.trades || [])
        .filter(
          (t) =>
            within(t.date, c.days, now) && Number.isFinite(t.amount) && t.amount >= c.min_amount,
        )
        .sort((a, b) => b.amount - a.amount)[0];
      return hit ? `${usd(hit.amount)} trade${hit.ticker ? ` in ${hit.ticker}` : ''}` : null;
    }
    default:
      return null;
  }
}

/** { match, reasons } for a candidate against a rule. */
export function evaluateCandidate(cand, rule, now = Date.now()) {
  const reasons = [];
  let hits = 0;
  for (const c of rule.conditions) {
    const r = testCondition(c, cand, now);
    if (r) {
      hits += 1;
      reasons.push(r);
    } else if (rule.match !== 'any') {
      return { match: false, reasons: [] };
    }
  }
  const match = rule.match === 'any' ? hits > 0 : hits === rule.conditions.length;
  return { match, reasons: match ? reasons : [] };
}

/**
 * The matches to add, best first: biggest move for priced assets, most
 * recent activity for politicians. Skips anything already in the list or
 * added by this list before (so a removed asset stays removed).
 */
export function pickAdds(
  candidates,
  rule,
  { existing = new Set(), seen = new Set(), room = PER_RUN_CAP, now = Date.now() } = {},
) {
  const key = (c) => `${c.type}:${c.ticker}`;
  const out = [];
  for (const c of candidates) {
    if (!c?.ticker || existing.has(key(c)) || seen.has(key(c))) continue;
    const r = evaluateCandidate(c, rule, now);
    if (r.match) out.push({ ...c, reason: r.reasons.join(' · ') });
  }
  const score = (c) =>
    c.type === 'politician'
      ? Math.max(0, ...(c.trades || []).map((t) => Date.parse(t.date) || 0))
      : Math.abs(Number.isFinite(c.changePct) ? c.changePct : 0) * 1e3 + (c.marketCap || 0) / 1e12;
  out.sort((a, b) => score(b) - score(a));
  return out.slice(0, Math.max(0, Math.min(room, PER_RUN_CAP)));
}

/**
 * Screener filters a rule implies when every condition must hold
 * (match 'all'). With 'any' the engine screens broadly and filters after.
 */
export function screenerParams(rule) {
  const p = {
    country: 'US',
    isActivelyTrading: 'true',
    isEtf: 'false',
    isFund: 'false',
    limit: '400',
  };
  p.marketCapMoreThan = String(3e8);
  if (rule.match !== 'all') return p;
  for (const c of rule.conditions) {
    if (c.type === 'market_cap') {
      if (c.min != null) p.marketCapMoreThan = String(Math.max(3e8, c.min * 1e9));
      if (c.max != null) p.marketCapLowerThan = String(c.max * 1e9);
    }
    if (c.type === 'price') {
      if (c.min != null) p.priceMoreThan = String(c.min);
      if (c.max != null) p.priceLowerThan = String(c.max);
    }
  }
  return p;
}

/** Sectors to screen one at a time (match 'all' with a sector condition), else [null]. */
export function screenerSectors(rule) {
  if (rule.match !== 'all') return [null];
  const s = rule.conditions.find((c) => c.type === 'sector');
  return s ? s.sectors : [null];
}

/** Is a rule due to run? Hourly cadence; a manual run can force it. */
export function isDue(rule, now = Date.now(), everyMs = 55 * 60000) {
  if (!rule?.enabled) return false;
  const last = rule.last_run_at ? Date.parse(rule.last_run_at) : 0;
  return !last || now - last >= everyMs;
}
