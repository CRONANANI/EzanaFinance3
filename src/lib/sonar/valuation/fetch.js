/**
 * Valuation inputs from the market-data provider (Nov 2026). Server only. Every call goes
 * through the engine's cached `fmp()` (six-hour cache per path and parameters), is capped at
 * `ms`, and fails soft: a missing leg removes the metrics that need it, never the card.
 *
 *   fetchValuationHistory(ticker, { quote })   the quick ping's snapshot inputs: quarterly
 *                                              income, cash flow and balance sheets, daily
 *                                              market cap over the lookback, annual estimates
 *   fetchDeepValuation(ticker, { quote })      the deep research model: the above plus the
 *                                              profile (beta, industry), the 10-year Treasury
 *                                              yield, consensus revenue growth, and industry
 *                                              peers' trailing multiples
 */
import { fmp } from '@/lib/sonar/engine/sources-memo';
import { buildValuationHistory, valuationSnapshot, LOOKBACK_YEARS } from './history';
import { buildValuationModel } from './model';
import { industryPeers } from './peers';

const num = (v) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : null;
};
const first = (d) => (Array.isArray(d) ? d[0] : d) || null;

/** The provider payloads behind the history (run alongside the dossier's own legs). */
export async function fetchValuationRaw(ticker, { ms = 3500, now = new Date() } = {}) {
  const t = String(ticker || '').toUpperCase();
  const from = new Date(now);
  /* One extra year so the first month-ends have four filed quarters behind them. */
  from.setUTCFullYear(from.getUTCFullYear() - LOOKBACK_YEARS - 1);
  const [income, cashflow, balance, caps, estimates] = await Promise.all([
    fmp('income-statement', { symbol: t, period: 'quarter', limit: 28 }, ms),
    fmp('cash-flow-statement', { symbol: t, period: 'quarter', limit: 28 }, ms),
    fmp('balance-sheet-statement', { symbol: t, period: 'quarter', limit: 28 }, ms),
    fmp(
      'historical-market-capitalization',
      {
        symbol: t,
        from: from.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
        limit: 2000,
      },
      ms,
    ),
    fmp('analyst-estimates', { symbol: t, period: 'annual', limit: 6 }, ms),
  ]);
  return { income, cashflow, balance, caps, estimates };
}

/** The quick ping's valuation snapshot from fetched payloads and the quote, or null. */
export function snapshotFromRaw(raw, { quote = null, now = new Date() } = {}) {
  try {
    if (!raw || !Array.isArray(raw.caps) || !raw.caps.length) return null;
    return valuationSnapshot(buildValuationHistory({ ...raw, quote }, { now }));
  } catch {
    return null;
  }
}

async function peerRow(t, ms) {
  const [r, k, g, p] = await Promise.all([
    fmp('ratios-ttm', { symbol: t }, ms),
    fmp('key-metrics-ttm', { symbol: t }, ms),
    fmp('financial-growth', { symbol: t, period: 'annual', limit: 1 }, ms),
    fmp('profile', { symbol: t }, ms),
  ]);
  const R = first(r) || {};
  const K = first(k) || {};
  const G = first(g) || {};
  const P = first(p) || {};
  const pe = num(R.priceToEarningsRatioTTM ?? R.peRatioTTM);
  const fcfY = num(K.freeCashFlowYieldTTM);
  return {
    ticker: t,
    name: P.companyName || t,
    industry: P.industry || null,
    marketCap: num(K.marketCap ?? P.marketCap ?? P.mktCap),
    pe: pe != null && pe > 0 ? pe : null,
    evEbitda: num(K.evToEBITDATTM ?? K.enterpriseValueOverEBITDATTM),
    ps: num(R.priceToSalesRatioTTM),
    fcfYield: fcfY != null ? fcfY * 100 : null,
    revenueGrowth:
      num(G.revenueGrowth ?? G.growthRevenue) != null
        ? num(G.revenueGrowth ?? G.growthRevenue) * 100
        : null,
    operatingMargin:
      num(R.operatingProfitMarginTTM) != null ? num(R.operatingProfitMarginTTM) * 100 : null,
    beta: num(P.beta),
  };
}

/** The deep research valuation model, or null. */
export async function fetchDeepValuation(
  ticker,
  { quote = null, ms = 6000, now = new Date() } = {},
) {
  const t = String(ticker || '').toUpperCase();
  try {
    const tFrom = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const [raw, subject, treasury] = await Promise.all([
      fetchValuationRaw(t, { ms, now }),
      peerRow(t, ms),
      fmp('treasury-rates', { from: tFrom, to: now.toISOString().slice(0, 10) }, ms),
    ]);
    if (!Array.isArray(raw.caps) || !raw.caps.length) return null;
    const history = buildValuationHistory({ ...raw, quote }, { now });
    const tr = (Array.isArray(treasury) ? treasury : [])
      .filter((r) => num(r?.year10) != null)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    /* Consensus revenue growth for the next fiscal year against the trailing revenue. */
    const today = now.toISOString().slice(0, 10);
    const nextFy = (Array.isArray(raw.estimates) ? raw.estimates : [])
      .filter((r) => String(r?.date || '') > today && num(r?.revenueAvg) != null)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
    const consensusGrowth =
      nextFy && history.ttm?.revenue > 0 ? num(nextFy.revenueAvg) / history.ttm.revenue - 1 : null;
    const sel = industryPeers(subject.industry, t, { max: 6 });
    const peers = (
      await Promise.all(sel.peers.map((p) => peerRow(p, ms).catch(() => null)))
    ).filter((p) => p && (p.pe != null || p.evEbitda != null || p.ps != null));
    return buildValuationModel({
      history,
      market: { beta: subject.beta, riskFree: tr ? num(tr.year10) / 100 : null },
      consensusGrowth,
      peers,
      peerLogic: { ...sel.logic, treasuryDate: tr?.date || null },
      subject,
    });
  } catch {
    return null;
  }
}

const fmtX = (v) => `${Number(v).toFixed(1)}x`;
const ordinal = (p) => {
  const n = Math.round(p);
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
};

/**
 * The snapshot as one evidence snippet for the brief, so the brief's Valuation line cites
 * Ezana's computed history rather than restating a single multiple. Pure.
 */
export function valuationSnippet(snap, { name, ticker } = {}) {
  if (!snap?.rows?.length) return null;
  const parts = [];
  for (const r of snap.rows) {
    if (r.value == null) continue;
    const v = r.unit === '%' ? `${r.value.toFixed(2)}%` : fmtX(r.value);
    if (r.percentile != null)
      parts.push(
        `${r.label} ${v} (${ordinal(r.percentile)} percentile of ${r.observations} month-end observations over ${snap.lookbackYears} years, median ${r.unit === '%' ? `${r.median.toFixed(2)}%` : fmtX(r.median)}${r.direction === 'yield' ? '; a higher yield means a lower valuation' : ''})`,
      );
    else
      parts.push(
        `${r.label} ${v} (no historical percentile: ${String(r.note || 'insufficient history')
          .replace(/\.$/, '')
          .toLowerCase()})`,
      );
  }
  if (!parts.length) return null;
  return {
    corpus: 'valuation',
    title: `${name || ticker} valuation against its own history`,
    snippet: `Ezana's valuation history for ${name || ticker} (${ticker}) as of ${snap.asOf}: ${parts.join('; ')}.${snap.context ? ` Overall: ${snap.context.label.toLowerCase()} (${snap.context.basis}).` : ''} A percentile is position in the stock's own history, not a verdict on value.`,
    date: snap.asOf,
    meta: { ticker },
  };
}

/** Fetch and build the valuation snippet for a quick ping (cached payloads), or null. */
export async function valuationEvidence(ticker, { name = null, ms = 2500, now = new Date() } = {}) {
  const t = String(ticker || '').toUpperCase();
  const [raw, quote] = await Promise.all([
    fetchValuationRaw(t, { ms, now }),
    fmp('quote', { symbol: t }, ms),
  ]);
  return valuationSnippet(snapshotFromRaw(raw, { quote: first(quote), now }), { name, ticker: t });
}
