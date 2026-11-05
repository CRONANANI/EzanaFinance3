/**
 * Sonar revenue mix (Nov 4): how much of a company's revenue comes from
 * government customers, quarter by quarter, as the company reports its
 * segments. Built for "How dependent is Palantir on government spending?",
 * general to any company whose reported segments include a government or
 * public-sector line (Palantir: Government and Commercial).
 *
 *   detectGovExposure(text)   the ping asks about government dependence
 *   fetchRevenueMix(ticker)   quarterly and fiscal-year segment revenue,
 *                             classified government vs everything else
 *   exposureEvidence(mix)     the snippets the brief reads (corpus 'exposure')
 *
 * Integrity rules, enforced here:
 *   - Values are the company's reported segment revenue. Shares and growth
 *     rates are derived from them and labelled as derived, with inputs.
 *   - A company with no government-type segment returns null: Ezana never
 *     infers customer type from anything else.
 *   - Fewer than four comparable quarters returns null, so no chart is
 *     drawn from an incomplete series.
 *   - Segment revenue is customer type. Geography (U.S. vs international)
 *     is a different cut and is not mixed in here.
 *
 * SERVER ONLY. Bounded, cached 12 hours, fails soft. No vendor name in any
 * text a visitor sees.
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { cacheGet, cacheSet } from '@/lib/sonar/engine/cache';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const TTL_S = 12 * 3600;
const MIN_QUARTERS = 4;

const GOV_RE = /\b(government|governments|public sector|federal|defen[cs]e)\b/i;
const CUE_RE =
  /\b(government|governments|federal|public sector|defen[cs]e|pentagon|dod|agency|agencies|contracts?|contractors?|procurement|taxpayer|budget)\b/i;
const DEPEND_RE =
  /\b(dependen\w*|reliant|reliance|exposure|exposed|rely|relies|share of revenue|revenue mix|how much)\b/i;

/** A ping about a company's reliance on government money. */
export function detectGovExposure(text) {
  const t = String(text || '');
  return CUE_RE.test(t) && (DEPEND_RE.test(t) || /\bcontracts?\b/i.test(t));
}

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Classify one period's segments. Returns null when no government segment.
 * @param {Record<string, number>} data segment -> revenue
 */
export function classifySegments(data) {
  const parts = Object.entries(data || {})
    .map(([k, v]) => [k, num(v)])
    .filter(([, v]) => v != null && v > 0);
  if (parts.length < 2) return null;
  const gov = parts.filter(([k]) => GOV_RE.test(k));
  if (!gov.length || gov.length === parts.length) return null;
  const govValue = gov.reduce((s, [, v]) => s + v, 0);
  const otherParts = parts.filter(([k]) => !GOV_RE.test(k));
  const otherValue = otherParts.reduce((s, [, v]) => s + v, 0);
  const total = govValue + otherValue;
  return {
    gov: govValue,
    other: otherValue,
    total,
    govShare: govValue / total,
    govLabel: gov.map(([k]) => k).join(' + '),
    otherLabel: otherParts.map(([k]) => k).join(' + '),
  };
}

/** Pure: raw rows (newest or oldest first) -> the mix series, or null. */
export function buildMix(rows, { ticker, annualRows = [] } = {}) {
  const toPoint = (r) => {
    const c = classifySegments(r?.data);
    if (!c) return null;
    return {
      date: String(r.date || '').slice(0, 10),
      fiscalYear: num(r.fiscalYear) ?? (Number(String(r.date).slice(0, 4)) || null),
      period: r.period || null,
      ...c,
    };
  };
  const quarters = (rows || [])
    .map(toPoint)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (quarters.length < MIN_QUARTERS) return null;
  /* One label for the series: the segment names must agree across the
     quarters shown, or the periods are not comparable. */
  const labelKey = (p) => `${p.govLabel}|${p.otherLabel}`;
  const latestKey = labelKey(quarters[quarters.length - 1]);
  const comparable = quarters.filter((p) => labelKey(p) === latestKey).slice(-20);
  if (comparable.length < MIN_QUARTERS) return null;

  /* Year over year against the same quarter a year earlier (four back),
     never against the previous quarter. */
  const withGrowth = comparable.map((p, i) => {
    const prior = comparable[i - 4];
    return {
      ...p,
      govYoy: prior && prior.gov ? p.gov / prior.gov - 1 : null,
      otherYoy: prior && prior.other ? p.other / prior.other - 1 : null,
      totalYoy: prior && prior.total ? p.total / prior.total - 1 : null,
    };
  });
  const annual = (annualRows || [])
    .map(toPoint)
    .filter(Boolean)
    .filter((p) => labelKey(p) === latestKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6);
  const last = withGrowth[withGrowth.length - 1];
  const ttm = withGrowth.slice(-4);
  const ttmGov = ttm.reduce((s, p) => s + p.gov, 0);
  const ttmTotal = ttm.reduce((s, p) => s + p.total, 0);
  return {
    ticker,
    govLabel: last.govLabel,
    otherLabel: last.otherLabel,
    quarters: withGrowth,
    annual,
    latest: last,
    yearAgo: withGrowth[withGrowth.length - 5] || null,
    ttm: ttm.length === 4 ? { gov: ttmGov, total: ttmTotal, govShare: ttmGov / ttmTotal } : null,
    source: 'Company-reported segment revenue (10-Q and 10-K)',
  };
}

async function fmpJson(path, params, ms) {
  const key = getFmpKey();
  if (!key) return null;
  try {
    const qs = new URLSearchParams({ ...params, apikey: key }).toString();
    const res = await fetchWithTimeout(`${FMP_STABLE}/${path}?${qs}`, { cache: 'no-store' }, ms);
    if (!res.ok) {
      /* 402/403: the plan does not include segment revenue. Logged once per
         run so the gap is visible in the logs, never shown to visitors. */
      console.warn('[sonar] revenue mix unavailable', { path, status: res.status });
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

/** Quarterly and fiscal-year segment revenue for a ticker, or null. */
export async function fetchRevenueMix(ticker, { ms = 1_400 } = {}) {
  const t = String(ticker || '').toUpperCase();
  if (!t) return null;
  const key = `revmix:v1:${t}`;
  const hit = await cacheGet(key).catch(() => undefined);
  if (hit !== undefined) return hit;
  const [q, a] = await Promise.all([
    fmpJson('revenue-product-segmentation', { symbol: t, period: 'quarter' }, ms),
    fmpJson('revenue-product-segmentation', { symbol: t, period: 'annual' }, ms),
  ]);
  const mix = Array.isArray(q)
    ? buildMix(q, { ticker: t, annualRows: Array.isArray(a) ? a : [] })
    : null;
  /* A miss is cached too (as null) for an hour, so a company without a
     government segment does not refetch on every ping. */
  await cacheSet(key, mix, mix ? TTL_S : 3600).catch(() => {});
  return mix;
}

const usd = (v) => {
  const a = Math.abs(Number(v) || 0);
  if (a >= 1e9) return `$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(a / 1e6).toFixed(1)}M`;
  return `$${Math.round(a / 1e3)}K`;
};
const pct = (r) => `${(r * 100).toFixed(1)}%`;
const growth = (r) => (r == null ? null : `${r >= 0 ? 'up' : 'down'} ${pct(Math.abs(r))}`);

/** Snippets for the brief, in the order it should read them. */
export function exposureEvidence(mix, { name } = {}) {
  if (!mix?.latest) return [];
  const who = name || mix.ticker;
  const L = mix.latest;
  const Y = mix.yearAgo;
  const out = [];
  const gy = growth(L.govYoy);
  const oy = growth(L.otherYoy);
  out.push({
    corpus: 'exposure',
    title: `${who} revenue by customer type, quarter ended ${L.date}`,
    snippet: `In the quarter ended ${L.date}, ${who} reported ${usd(L.gov)} of ${mix.govLabel.toLowerCase()} revenue and ${usd(L.other)} of ${mix.otherLabel.toLowerCase()} revenue, so government customers were ${pct(L.govShare)} of segment revenue${Y ? `, against ${pct(Y.govShare)} a year earlier` : ''}.${gy && oy ? ` Year over year, ${mix.govLabel.toLowerCase()} revenue was ${gy} and ${mix.otherLabel.toLowerCase()} revenue ${oy}.` : ''}`,
    date: L.date,
    meta: { source: mix.source, derived: 'share = government / (government + other segments)' },
  });
  if (mix.ttm) {
    const first = mix.quarters[0];
    out.push({
      corpus: 'exposure',
      title: `${who} government share over time`,
      snippet: `Over the last four reported quarters government customers were ${pct(mix.ttm.govShare)} of ${who}'s segment revenue (${usd(mix.ttm.gov)} of ${usd(mix.ttm.total)}); in the quarter ended ${first.date}, the earliest shown, the share was ${pct(first.govShare)}. ${L.govShare < first.govShare ? 'The government share has fallen over the period shown.' : L.govShare > first.govShare ? 'The government share has risen over the period shown.' : 'The government share is unchanged over the period shown.'}`,
      date: L.date,
      meta: { source: mix.source, derived: 'trailing four quarters, summed' },
    });
  }
  return out;
}
