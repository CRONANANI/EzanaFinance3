/**
 * Burry Watcher: pure transforms (no network, no '@/' imports) so node tests
 * can import them directly. See scripts/check-burry.mjs.
 *
 *   pickLatest13F(submissions): the newest 13F-HR / 13F-HR/A in an EDGAR
 *     submissions JSON (filings.recent column arrays).
 *   amendmentTypeFromCover(xml): 'RESTATEMENT' | 'NEW HOLDINGS' | null.
 *   aggregatePositions(rows, ref): parseInfoTable() rows grouped by
 *     (issuer, position type), whole USD, sorted by value, with % of total.
 *   outletFor(url, source) / mapNewsArticles(articles): major-outlet allowlist.
 *   mapEchoRows(rows): published Echo rows to card items.
 */
import { normalize13FValue } from '../sec-13f-parse.js';

/** Scion Asset Management, LLC (Michael Burry). */
export const SCION_CIK = '0001649339';

/* Verified facts about the end of Scion's public 13F record. Used as a fallback
   for the provenance notice when the filing itself could not be read. */
export const SCION_FINAL = {
  periodOfReport: '2025-09-30',
  signedDate: '2025-11-03',
  registrationEnded: '2025-11-10',
};

const FORMS_13F = new Set(['13F-HR', '13F-HR/A']);

/**
 * Newest 13F holdings report in a submissions JSON. The latest period wins;
 * within a period the most recently filed document wins (an amendment filed
 * after the original replaces it). Also returns the other filings for that
 * period, newest first, so a caller can fall back to the original when the
 * amendment only adds new holdings.
 * @returns {{ chosen: object, samePeriod: object[] } | null}
 */
export function pickLatest13F(submissions) {
  const r = submissions?.filings?.recent;
  if (!r || !Array.isArray(r.form)) return null;
  const list = [];
  for (let i = 0; i < r.form.length; i += 1) {
    const form = String(r.form[i] || '')
      .trim()
      .toUpperCase();
    if (!FORMS_13F.has(form)) continue;
    const accessionNumber = r.accessionNumber?.[i];
    if (!accessionNumber) continue;
    list.push({
      form,
      accessionNumber,
      reportDate: r.reportDate?.[i] || null,
      filingDate: r.filingDate?.[i] || null,
      primaryDocument: r.primaryDocument?.[i] || null,
      isAmendment: form.endsWith('/A'),
    });
  }
  if (!list.length) return null;
  const cmp = (a, b) =>
    String(b.reportDate || '').localeCompare(String(a.reportDate || '')) ||
    String(b.filingDate || '').localeCompare(String(a.filingDate || '')) ||
    String(b.accessionNumber).localeCompare(String(a.accessionNumber));
  list.sort(cmp);
  const chosen = list[0];
  const samePeriod = list.filter((f) => f.reportDate === chosen.reportDate);
  return { chosen, samePeriod };
}

/** amendmentType on a 13F cover (primary_doc.xml), upper-cased; null if absent. */
export function amendmentTypeFromCover(xml) {
  const m = /<(?:\w+:)?amendmentType[^>]*>([\s\S]*?)<\/(?:\w+:)?amendmentType>/i.exec(
    String(xml || ''),
  );
  return m ? m[1].trim().toUpperCase() || null : null;
}

/** 'Put' | 'Call' | share type -> 'put' | 'call' | 'principal' | 'shares'. */
export function positionKind(row) {
  const pc = String(row?.put_call || '')
    .trim()
    .toLowerCase();
  if (pc === 'put') return 'put';
  if (pc === 'call') return 'call';
  if (
    String(row?.share_type || '')
      .trim()
      .toUpperCase() === 'PRN'
  )
    return 'principal';
  return 'shares';
}

const cleanIssuer = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Group parsed 13F rows by (issuer, position type). Values are normalised to
 * whole USD using the filing's period (pre-2023 filings report thousands).
 * For options the 13F value is the notional value of the underlying shares.
 * @param {Array} rows parseInfoTable() output
 * @param {{ periodOfReport?: string, filedAt?: string }} ref
 * @returns {{ positions: Array, totalValueUsd: number }}
 */
export function aggregatePositions(rows, ref = {}) {
  const groups = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const issuer = cleanIssuer(r?.name_of_issuer);
    if (!issuer) continue;
    const kind = positionKind(r);
    const key = `${issuer.toUpperCase()}|${kind}`;
    const value = normalize13FValue(r.value, ref);
    const shares = Number(r.shares) || 0;
    const g = groups.get(key);
    if (g) {
      g.valueUsd += value;
      g.shares += shares;
      if (r.cusip && !g.cusips.includes(r.cusip)) g.cusips.push(r.cusip);
    } else {
      groups.set(key, {
        issuer,
        kind,
        titleOfClass: r.title_of_class || null,
        cusips: r.cusip ? [r.cusip] : [],
        valueUsd: value,
        shares,
      });
    }
  }
  const all = [...groups.values()];
  const totalValueUsd = all.reduce((s, p) => s + p.valueUsd, 0);
  const positions = all
    .map((p) => ({
      ...p,
      cusip: p.cusips[0] || null,
      pctOfReported: totalValueUsd ? (p.valueUsd / totalValueUsd) * 100 : null,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd || a.issuer.localeCompare(b.issuer));
  return { positions, totalValueUsd };
}

/* ── News: major-outlet allowlist ────────────────────────────────────── */

/** Registrable domain (or a specific subdomain) -> display name. */
export const MAJOR_OUTLETS = {
  'reuters.com': 'Reuters',
  'bloomberg.com': 'Bloomberg',
  'wsj.com': 'The Wall Street Journal',
  'ft.com': 'Financial Times',
  'cnbc.com': 'CNBC',
  'nytimes.com': 'The New York Times',
  'barrons.com': "Barron's",
  'marketwatch.com': 'MarketWatch',
  'businessinsider.com': 'Business Insider',
  'fortune.com': 'Fortune',
  'forbes.com': 'Forbes',
  'finance.yahoo.com': 'Yahoo Finance',
  'apnews.com': 'AP News',
  'economist.com': 'The Economist',
  'theguardian.com': 'The Guardian',
  'axios.com': 'Axios',
  'washingtonpost.com': 'The Washington Post',
  'bbc.co.uk': 'BBC',
  'bbc.com': 'BBC',
};

function hostOf(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.toLowerCase().replace(/\.$/, '') || null;
  } catch {
    return null;
  }
}

/**
 * Display name of a major outlet for an article URL (or bare source domain);
 * null for anything off the allowlist. A host matches a listed domain exactly
 * or as a subdomain ('www.reuters.com', 'edition.reuters.com'), never as a
 * prefix ('reuters.com.evil.io' fails). The URL host is authoritative when
 * present, so a mislabelled source cannot launder an off-list link.
 */
export function outletFor(url, source) {
  const host = hostOf(url) || hostOf(source);
  if (!host) return null;
  let best = null;
  for (const domain of Object.keys(MAJOR_OUTLETS)) {
    if ((host === domain || host.endsWith(`.${domain}`)) && (!best || domain.length > best.length))
      best = domain;
  }
  return best ? MAJOR_OUTLETS[best] : null;
}

const isHttpUrl = (s) => /^https?:\/\//i.test(String(s || ''));

/**
 * News API articles -> major-outlet items, newest first, de-duplicated by URL
 * and by title. Shape: { id, title, url, outlet, publishedAt }.
 */
export function mapNewsArticles(articles, { limit = 8 } = {}) {
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const a of Array.isArray(articles) ? articles : []) {
    const url = String(a?.url || '').trim();
    const title = String(a?.title || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title || !isHttpUrl(url)) continue;
    const outlet = outletFor(url, a?.source);
    if (!outlet) continue;
    const tKey = title.toLowerCase();
    if (seenUrl.has(url) || seenTitle.has(tKey)) continue;
    seenUrl.add(url);
    seenTitle.add(tKey);
    out.push({
      id: String(a?.uuid || url),
      title,
      url,
      outlet,
      publishedAt: a?.published_at || null,
    });
  }
  out.sort((x, y) => String(y.publishedAt || '').localeCompare(String(x.publishedAt || '')));
  return out.slice(0, limit);
}

/* ── Ezana Echo ──────────────────────────────────────────────────────── */

/** Published echo_articles rows -> { slug, title, excerpt, publishedAt, href }. */
export function mapEchoRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r?.article_slug && r?.article_title)
    .map((r) => ({
      slug: String(r.article_slug),
      title: String(r.article_title),
      excerpt: r.article_excerpt ? String(r.article_excerpt) : null,
      publishedAt: r.published_at || null,
      href: `/ezana-echo/${encodeURIComponent(String(r.article_slug))}`,
    }));
}

/** 'YYYY-MM-DD' (or ISO) minus `days`, as 'YYYY-MM-DD'. */
export function daysAgoIso(days, now = new Date()) {
  return new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
}
