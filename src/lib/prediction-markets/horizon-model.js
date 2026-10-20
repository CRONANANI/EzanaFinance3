/**
 * Event Horizon (prediction markets page): pure model. The card plots the
 * open markets that resolve inside the chosen horizon against the scheduled
 * events the rest of Ezana already tracks (US macro releases, large-cap
 * earnings, congressional committee meetings), then explains one market in a
 * modal with the events dated before it resolves.
 *
 * Nothing here estimates or invents a value. Positions come from close
 * dates and live probabilities; links between a market and an event come
 * from the market's category and shared words, and are labelled as such.
 * No imports, so scripts/check-prediction-markets.mjs can test it under node.
 */

export const HORIZONS = [
  { value: '3m', label: '3M', months: 3 },
  { value: '6m', label: '6M', months: 6 },
  { value: '12m', label: '12M', months: 12 },
];

export const EVENT_KINDS = {
  macro: { label: 'Macro release', lane: 'Macro' },
  earnings: { label: 'Earnings', lane: 'Earnings' },
  congress: { label: 'Congress', lane: 'Congress' },
};

/** Which event kinds bear on a page category. */
const KIND_BY_CATEGORY = {
  economy: ['macro', 'earnings'],
  crypto: ['macro'],
  tech: ['earnings', 'macro'],
  politics: ['congress', 'macro'],
  elections: ['congress'],
  geopolitics: ['congress', 'macro'],
  sports: [],
  culture: [],
};

const DAY = 86400000;

const STOP = new Set(
  (
    'will the a an and or of in on by to for be is are was at as with from this that ' +
    'before after than more less over under above below end yes no not any its it ' +
    'what which who how when does do 2025 2026 2027 2028 market price reach hit'
  ).split(' '),
);

const ts = (v) => {
  if (v == null) return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

/** End of the horizon, by calendar months from `now`. */
export function horizonEnd(now, value) {
  const h = HORIZONS.find((x) => x.value === value) || HORIZONS[0];
  const d = new Date(ts(now) ?? Date.now());
  d.setUTCMonth(d.getUTCMonth() + h.months);
  return d.getTime();
}

/** Lower-case content words of four letters or more. */
export function keywords(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9$ ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/**
 * Markets that close after `now` and by the horizon end, largest volume
 * first, at most `limit`. Ties keep id order so SSR and client agree.
 */
export function horizonMarkets(rows, now, value, limit = 48) {
  const t0 = ts(now) ?? Date.now();
  const t1 = horizonEnd(t0, value);
  return (rows || [])
    .filter((r) => {
      const c = ts(r?.closes);
      return c != null && c > t0 && c <= t1 && Number.isFinite(r?.p);
    })
    .sort((a, b) => (b.vol || 0) - (a.vol || 0) || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
}

/** Events inside [now, horizon end], date order. */
export function horizonEvents(events, now, value) {
  const t0 = ts(now) ?? Date.now();
  const t1 = horizonEnd(t0, value);
  return (events || [])
    .filter((e) => {
      const t = ts(e?.date);
      return t != null && t >= t0 - DAY && t <= t1;
    })
    .sort((a, b) => ts(a.date) - ts(b.date));
}

/**
 * Scheduled events that could move a market: dated from `now` up to one day
 * after the market closes, of a kind that bears on its category or sharing a
 * content word with its question. Word matches rank first, then the events
 * nearest the close. Each result says why it matched.
 */
export function relatedEvents(market, events, now, limit = 6) {
  if (!market) return [];
  const t0 = ts(now) ?? Date.now();
  const close = ts(market.closes);
  if (close == null) return [];
  const kinds = new Set(KIND_BY_CATEGORY[market.category] || []);
  const words = keywords(market.question);
  const out = [];
  for (const e of events || []) {
    const t = ts(e?.date);
    if (t == null || t < t0 - DAY || t > close + DAY) continue;
    const shared = [...keywords(`${e.title || ''} ${e.symbol || ''} ${e.detail || ''}`)].filter(
      (w) => words.has(w),
    );
    const byKind = kinds.has(e.kind);
    if (!shared.length && !byKind) continue;
    out.push({
      ...e,
      why: shared.length ? `Shares "${shared[0]}" with the question` : 'Same theme as this market',
      score: (shared.length ? 2 : 0) + (byKind ? 1 : 0),
      gapDays: Math.round((close - t) / DAY),
    });
  }
  return out
    .sort(
      (a, b) =>
        b.score - a.score || a.gapDays - b.gapDays || String(a.id).localeCompare(String(b.id)),
    )
    .slice(0, limit);
}

/** Up to `limit` other horizon markets in the same category, nearest close first. */
export function relatedMarkets(market, markets, limit = 3) {
  if (!market) return [];
  const close = ts(market.closes) ?? 0;
  return (markets || [])
    .filter((m) => m.id !== market.id && m.category && m.category === market.category)
    .sort(
      (a, b) =>
        Math.abs(ts(a.closes) - close) - Math.abs(ts(b.closes) - close) ||
        String(a.id).localeCompare(String(b.id)),
    )
    .slice(0, limit);
}

/** Month boundaries between t0 and t1 for gridlines and axis ticks. */
export function monthTicks(t0, t1) {
  const out = [];
  const d = new Date(t0);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= t1) {
    out.push(d.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/** Whole days from now until a timestamp, never negative. */
export function daysUntil(v, now) {
  const t = ts(v);
  const t0 = ts(now) ?? Date.now();
  if (t == null) return null;
  return Math.max(0, Math.ceil((t - t0) / DAY));
}
