/**
 * Ezana Sonar — IPO filings source adapter (Oct 30, SpaceX IPO false negative).
 *
 * Sonar had no IPO data at all, so "what was the ipo value of spacex" reached
 * synthesis with nothing about the offering and the model answered from its
 * training data ("SpaceX has not held an IPO"). This adapter gives the ping a
 * cited record of the offering: price, shares offered, proceeds, valuation,
 * exchange, ticker and first trade date.
 *
 * Sources, merged into one normalized record per symbol:
 *   - the market-data profile (ipoDate, exchange, name)
 *   - the IPO prospectus feed (price per share, gross proceeds, filing URL)
 *   - the IPO disclosure feed (form and filing URL)
 *   - the IPO calendar (exchange, shares, price range, market value)
 * The three IPO feeds are date-range endpoints, so they are queried around the
 * profile's ipoDate (or the last 90 days when there is none) and filtered to
 * the symbol. When none of them knows the symbol, SEC EDGAR is the fallback
 * (the repo's one EDGAR client, @/lib/sec-edgar): the company's own S-1,
 * S-1/A, F-1 or 424B4.
 *
 * Derived values come only from returned numbers and are labelled derived in
 * `meta` (proceeds = price x shares; implied valuation = price x outstanding
 * shares, only when a source returns outstanding shares). User-facing labels
 * are "IPO filings" and "SEC filings"; no vendor name reaches the UI.
 *
 * Cache: in memory per warm instance (the resolveCompany pattern), 6h for a
 * record and 10 minutes for a miss, so a company that lists after a miss is
 * picked up quickly. No table: the optional public.ipo_events cache is not
 * needed at this call volume.
 */
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { BoundedMap } from '@/lib/bounded-map';
import { edgarUrls, getSubmissions, getTickerMap } from '@/lib/sec-edgar';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const HIT_TTL_MS = 6 * 60 * 60 * 1000;
const MISS_TTL_MS = 10 * 60 * 1000;
const cache = new BoundedMap(500);

/* Registration and final prospectus forms, newest wins for the URL. */
const IPO_FORMS = new Set(['424B4', 'S-1', 'S-1/A', 'F-1', 'F-1/A']);

/** @type {import('./types').SonarSourceAdapter} */
const ipoEvents = {
  slug: 'ipo-events',
  label: 'IPO filings',
  dimension: 'Titans Shadow',
  minTier: 'free',
  timeoutMs: 6000,

  /** Only an IPO question with a resolved symbol; four upstream calls are not
      worth spending on every company ping. */
  isRelevant(q) {
    return Boolean(q?.intents?.includes('ipo')) && (q?.tickers?.length ?? 0) > 0;
  },

  async search(q, ctx = {}) {
    if (!this.isRelevant(q)) return [];
    const symbols = [...new Set(q.tickers.map((t) => String(t).toUpperCase()))].slice(0, 3);
    const records = await Promise.all(symbols.map((s) => getIpoRecord(s, ctx)));
    return records.filter(Boolean).map((r) => toFinding(r, q));
  },
};

export default ipoEvents;

/** Cached read-through of fetchIpoRecord. */
export async function getIpoRecord(symbol, ctx = {}) {
  const key = String(symbol || '').toUpperCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.value ? HIT_TTL_MS : MISS_TTL_MS)) return hit.value;
  let value = null;
  try {
    value = await fetchIpoRecord(key, ctx);
  } catch {
    value = null;
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Test hook: forget cached records. */
export function clearIpoCache() {
  cache.clear?.();
}

async function fmp(path, params, ms) {
  const key = getFmpKey();
  if (!key) return null;
  const qs = new URLSearchParams({ ...params, apikey: key });
  try {
    const res = await fetchWithTimeout(`${FMP_STABLE}/${path}?${qs}`, { cache: 'no-store' }, ms);
    if (!res.ok) {
      console.warn(`[sonar/ipo] ${path} HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : data ? [data] : null;
  } catch (e) {
    console.warn(`[sonar/ipo] ${path} failed`, e?.name || 'error');
    return null;
  }
}

const sameSymbol = (symbol) => (r) => String(r?.symbol || '').toUpperCase() === symbol;

/**
 * One normalized IPO record for `symbol`, or null when no source has one.
 * @param {string} symbol
 * @param {{ timeoutMs?: number, edgar?: boolean }} [ctx]
 */
export async function fetchIpoRecord(symbol, ctx = {}) {
  const ms = Math.max(1500, Math.min(Number(ctx.timeoutMs) || 4000, 5000));
  const profileRows = await fmp('profile', { symbol }, ms);
  const prof = (profileRows || []).find(sameSymbol(symbol)) || null;
  const profIpoDate = isoDate(prof?.ipoDate);

  const center = profIpoDate || today();
  const from = shiftDate(center, -45);
  const to = profIpoDate ? shiftDate(center, 45) : today();
  const window = { from, to };

  const [prospectusRows, disclosureRows, calendarRows] = await Promise.all([
    fmp('ipos-prospectus', { ...window, symbol }, ms),
    fmp('ipos-disclosure', { ...window, symbol }, ms),
    fmp('ipos-calendar', window, ms),
  ]);
  const byDateDesc = (a, b) =>
    String(b?.filingDate || b?.date || '').localeCompare(String(a?.filingDate || a?.date || ''));
  const p = (prospectusRows || []).filter(sameSymbol(symbol)).sort(byDateDesc)[0] || null;
  const d = (disclosureRows || []).filter(sameSymbol(symbol)).sort(byDateDesc)[0] || null;
  const cal = (calendarRows || []).filter(sameSymbol(symbol)).sort(byDateDesc)[0] || null;

  let filing = null;
  if (!p && !d && !cal && ctx.edgar !== false) {
    filing = await edgarIpoFiling(symbol).catch(() => null);
  }

  if (!p && !d && !cal && !filing && !profIpoDate) return null;

  const price = num(p?.pricePublicPerShare) ?? num(p?.ipoPrice) ?? singlePrice(cal?.priceRange);
  const reportedProceeds = num(p?.pricePublicTotal) ?? num(p?.totalProceeds);
  let shares = num(cal?.shares) ?? num(p?.sharesOffered);
  let sharesDerived = false;
  if (shares == null && reportedProceeds != null && price) {
    shares = reportedProceeds / price;
    sharesDerived = true;
  }
  const proceeds = reportedProceeds ?? (price && shares ? price * shares : null);
  const proceedsDerived = reportedProceeds == null && proceeds != null;
  const outstanding = num(prof?.sharesOutstanding) ?? num(p?.sharesOutstanding);
  const reportedValuation = num(cal?.marketCap);
  const impliedValuation = reportedValuation ?? (price && outstanding ? price * outstanding : null);
  const valuationDerived = reportedValuation == null && impliedValuation != null;

  return {
    symbol,
    company: prof?.companyName || cal?.company || filing?.company || symbol,
    exchange: exchangeLabel(cal?.exchange || prof?.exchange || prof?.exchangeShortName),
    ipoDate: isoDate(p?.ipoDate) || isoDate(cal?.date) || profIpoDate || null,
    price,
    priceRange: price ? null : cal?.priceRange || null,
    shares,
    sharesDerived,
    proceeds,
    proceedsDerived,
    impliedValuation,
    valuationDerived,
    form: p?.form || d?.form || filing?.form || null,
    filingDate: isoDate(p?.filingDate) || isoDate(d?.filingDate) || filing?.filingDate || null,
    filingUrl: p?.url || d?.url || filing?.url || null,
    sources: [
      prof ? 'profile' : null,
      p ? 'prospectus' : null,
      d ? 'disclosure' : null,
      cal ? 'calendar' : null,
      filing ? 'edgar' : null,
    ].filter(Boolean),
  };
}

/* company_tickers.json is ~1MB and changes rarely: one copy per warm instance. */
let tickerMapCache = null;
async function cikFor(symbol) {
  if (!tickerMapCache || Date.now() - tickerMapCache.at > 24 * 60 * 60 * 1000) {
    tickerMapCache = { at: Date.now(), value: await getTickerMap() };
  }
  for (const row of Object.values(tickerMapCache.value || {})) {
    if (String(row?.ticker || '').toUpperCase() === symbol) {
      return { cik: row.cik_str, company: row.title || null };
    }
  }
  return null;
}

/** The company's newest IPO registration or prospectus on EDGAR. */
export async function edgarIpoFiling(symbol) {
  const who = await cikFor(symbol);
  if (!who) return null;
  const subs = await getSubmissions(who.cik);
  const recent = subs?.filings?.recent;
  if (!recent?.form) return null;
  let best = null;
  for (let i = 0; i < recent.form.length; i++) {
    const form = String(recent.form[i] || '').toUpperCase();
    if (!IPO_FORMS.has(form)) continue;
    const row = {
      form,
      filingDate: recent.filingDate?.[i] || null,
      accessionNo: recent.accessionNumber?.[i],
      primaryDoc: recent.primaryDocument?.[i],
    };
    /* The final prospectus beats a registration statement; then newest. */
    const rank = (r) => (r.form === '424B4' ? 1 : 0);
    if (
      !best ||
      rank(row) > rank(best) ||
      (rank(row) === rank(best) && String(row.filingDate) > String(best.filingDate))
    ) {
      best = row;
    }
  }
  if (!best?.accessionNo) return null;
  const { primaryDocUrl } = edgarUrls({
    accessionNo: best.accessionNo,
    cik: who.cik,
    primaryDoc: best.primaryDoc,
  });
  return {
    form: best.form,
    filingDate: best.filingDate,
    url: primaryDocUrl,
    company: subs?.name || who.company,
  };
}

/** A normalized record as a cited Sonar finding. */
export function toFinding(r, q = {}) {
  const parts = [
    r.price ? `priced its IPO at ${usd(r.price)} per share` : null,
    !r.price && r.priceRange ? `set an IPO price range of $${r.priceRange} per share` : null,
    r.shares ? `${r.sharesDerived ? 'about ' : ''}${compact(r.shares)} shares offered` : null,
    r.proceeds ? `${r.proceedsDerived ? 'about ' : ''}${usdBig(r.proceeds)} raised` : null,
    r.impliedValuation
      ? `${r.valuationDerived ? 'implied valuation about' : 'valued at about'} ${usdBig(r.impliedValuation)}`
      : null,
    r.exchange ? `listed on ${r.exchange} as ${r.symbol}` : `trades as ${r.symbol}`,
    r.ipoDate ? `first trade ${r.ipoDate}` : null,
  ].filter(Boolean);
  const filed =
    !r.price && !r.proceeds && r.form
      ? ` Its ${r.form} was filed with the SEC${r.filingDate ? ` on ${r.filingDate}` : ''}.`
      : '';
  return {
    sourceSlug: 'ipo-events',
    title: `${r.company} IPO`,
    summary: `${r.company} ${parts.join(', ')}.${filed}`,
    date: r.ipoDate || r.filingDate || null,
    relevance: q?.intents?.includes('ipo') ? 1 : 0.6,
    citation: r.filingUrl
      ? { label: `SEC filings${r.form ? ` (${r.form})` : ''}`, href: r.filingUrl }
      : {
          label: 'IPO filings',
          href: `/company-research?ticker=${encodeURIComponent(r.symbol)}`,
        },
    meta: { ...r },
  };
}

/* helpers */
function num(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
/** "135" or "$135.00" is a price; "130-135" is a range, not a price. */
function singlePrice(range) {
  if (range == null) return null;
  const s = String(range).trim();
  if (/\d\s*[-–]\s*\$?\d/.test(s)) return null;
  return num(s);
}
function isoDate(v) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v || ''));
  return m ? m[1] : null;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function exchangeLabel(ex) {
  const s = String(ex || '').trim();
  if (!s) return null;
  const up = s.toUpperCase();
  if (up.startsWith('NASDAQ')) return 'Nasdaq';
  if (up === 'NYSE' || up.startsWith('NEW YORK STOCK')) return 'NYSE';
  return s;
}
function usd(n) {
  return `$${n.toFixed(2)}`;
}
function usdBig(n) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(1)}M`;
}
function compact(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  return `${(n / 1e6).toFixed(1)}M`;
}
