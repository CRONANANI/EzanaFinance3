/**
 * Sonar adaptive research: what every executor shares (Nov 2026).
 *
 * Bounded steps, the source book that hands out citation ids, the news-cache read, and the
 * small formatters. Nothing here knows about a scenario.
 */
import { clusterArticles, rankClusters, sourceClass } from './news-intelligence';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const day = (iso) => {
  const [y, m, d] = String(iso || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : '';
};
export const usd = (v) =>
  v == null
    ? 'N/A'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (v, d = 1) =>
  v == null ? 'N/A' : `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(d)}%`;
export const aboveBelow = (v) =>
  v == null ? null : `${Math.abs(v).toFixed(1)}% ${v >= 0 ? 'above' : 'below'}`;
export const isoDaysAgo = (now, n) =>
  new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);

export const ADJUSTMENT = {
  splits: 'Prices are adjusted for splits. Dividends are not included.',
  splits_dividends: 'Prices are adjusted for splits and dividends.',
};

/* Bounded step: a result, or null with the failure recorded. Never throws. */
export async function step(telemetry, name, ms, fn) {
  const t0 = Date.now();
  let timer;
  try {
    const value = await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
    telemetry.steps.push({ step: name, ms: Date.now() - t0, ok: true });
    return value;
  } catch (e) {
    telemetry.steps.push({
      step: name,
      ms: Date.now() - t0,
      ok: false,
      error: e?.message || 'error',
    });
    telemetry.degraded.push(name);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function sourceBook() {
  const list = [];
  const byKey = new Map();
  return {
    list,
    /* The same address or record is one source, cited by the same id every time. */
    add({ key, title, publisher = null, url = null, date = null, detail = null, kind = null }) {
      const k = key || url || title;
      if (byKey.has(k)) return byKey.get(k);
      const id = `S${list.length + 1}`;
      list.push({
        id,
        title,
        publisher,
        url,
        date,
        detail,
        sourceClass: kind || (url ? sourceClass(url) : 'dataset'),
      });
      byKey.set(k, id);
      return id;
    },
  };
}

export async function newsItems(
  deps,
  telemetry,
  { tickers, phrase, entityTerms, eventTerms, now, limit = 6 },
) {
  if (!deps.news) return [];
  const rows = await step(telemetry, 'news_cache', 3500, () =>
    deps.news({ tickers, phrase, limit: 14 }),
  );
  if (!rows?.length) return [];
  return rankClusters(clusterArticles(rows), { entityTerms, eventTerms, now }).slice(0, limit);
}

const tokens = (s) =>
  new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
export function tooSimilar(a, b) {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return false;
  let n = 0;
  for (const t of x) if (y.has(t)) n += 1;
  return n / Math.min(x.size, y.size) >= 0.7;
}

export const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export const NA = 'N/A';
/** $1.23T, $4.5B, $6.7M, $8,900. */
export function money(v, d = 1) {
  if (num(v) == null) return NA;
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(d)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(d)}M`;
  return `${s}$${Math.round(a).toLocaleString('en-US')}`;
}
/** 1.94B, 35.2M, 8,900: a count, no currency. */
export function count(v) {
  if (num(v) == null) return NA;
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
  return `${s}${Math.round(a).toLocaleString('en-US')}`;
}
/** "Q2 2026" for a quarter-end date. */
export function quarterOf(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? `Q${Math.ceil(Number(m[2]) / 3)} ${m[1]}` : null;
}
/** Follow-up questions that do not repeat the question asked or each other. */
export const freshQuestions = (plan, list, max = 3) =>
  list
    .filter(Boolean)
    .filter((f) => !tooSimilar(f, plan.resolvedQuestion) && !tooSimilar(f, plan.originalQuestion))
    .filter((f, i, all) => all.findIndex((g) => tooSimilar(f, g)) === i)
    .slice(0, max);
