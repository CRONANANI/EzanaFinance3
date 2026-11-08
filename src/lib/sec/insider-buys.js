/**
 * Insider open-market buys (Nov 2026): pure helpers shared by the Sonar
 * insider-buying ping (src/lib/sonar/landing-insider-buying.js) and the Echo
 * monthly stats script (scripts/echo-insider-month-stats.mjs). No network, no
 * '@/' imports, so Node scripts can import it directly.
 *
 * A "buy" is one reporting owner's open-market purchases on one Form 4:
 * transaction code P, acquired (A), non-derivative table. Several lines on
 * one filing (fills at different prices) collapse into one buy at the
 * value-weighted price. A 4/A that restates a buy replaces the original.
 *
 * Honesty rules, enforced here:
 *   - Value is shares x price as filed; a line without both is dropped,
 *     never estimated.
 *   - Awards (A), option exercises (M), tax withholding (F), gifts (G) and
 *     plan purchases (code P is open market only) never count as buys.
 *   - Roles come from the filing's relationship flags and officer title.
 */

export const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/* Listed-equity tickers as filed: letters, optional class suffix (BRK.B, BF-B). */
export function cleanTicker(t) {
  const s = String(t || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{1,5}(?:[.-][A-Z]{1,2})?$/.test(s) || ['NONE', 'NA'].includes(s)) return null;
  /* Mutual fund share classes (five letters ending in X) are not listed stock. */
  return /^[A-Z]{4}X$/.test(s) ? null : s;
}

/** The reporter's role, most senior first, and its display tier. */
export function roleOf({ title, isDirector, isOfficer, isTenPct }) {
  const t = String(title || '').toLowerCase();
  const ceo = /\bceo\b|chief executive/.test(t);
  const pres = /\bpresident\b/.test(t) && !/vice[\s-]+president|\bvp\b|\bevp\b|\bsvp\b/.test(t);
  const cfo = /\bcfo\b|chief financial/.test(t);
  const coo = /\bcoo\b|chief operating/.test(t);
  const chair = /\bchair/.test(t) && !/vice[\s-]+chair/.test(t);
  if (ceo && pres) return { label: 'President & CEO', tier: 'exec' };
  if (ceo) return { label: chair ? 'Chair & CEO' : 'CEO', tier: 'exec' };
  if (pres) return { label: 'President', tier: 'exec' };
  if (cfo) return { label: 'CFO', tier: 'exec' };
  if (coo) return { label: 'COO', tier: 'exec' };
  if (chair) return { label: 'Chair', tier: 'exec' };
  if (isOfficer) return { label: 'Officer', tier: 'officer' };
  if (isDirector) return { label: 'Director', tier: 'director' };
  if (isTenPct) return { label: '10% Owner', tier: 'owner' };
  return { label: 'Insider', tier: 'other' };
}

/** Title case for filer-cased names ("BAKER HUGHES CO" -> "Baker Hughes Co"). */
export function titleCase(s) {
  const str = String(s || '').trim();
  if (!str || /[a-z]/.test(str)) return str;
  return str
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Llc|Lp|Plc|Nv|Sa|Ag|Se|Ii|Iii|Iv|Usa|Us)\b/g, (m) => m.toUpperCase())
    .replace(/\b(Of|And|The)\b/g, (m, w, i) => (i === 0 ? m : m.toLowerCase()));
}

/**
 * Raw sec_insider_transactions rows -> grouped buys.
 * code: 'P' for open-market purchases (default), 'S' for open-market sales.
 */
export function groupTransactions(rows, { code = 'P' } = {}) {
  const ad = code === 'S' ? 'D' : 'A';
  const byFiling = new Map();
  for (const r of rows || []) {
    if (r.transaction_code !== code) continue;
    if (r.acquired_disposed && r.acquired_disposed !== ad) continue;
    if (r.table_kind && r.table_kind !== 'non_derivative') continue;
    const shares = num(r.shares);
    const price = num(r.price);
    const value = num(r.value_usd) ?? (shares != null && price != null ? shares * price : null);
    if (!shares || shares <= 0 || !value || value <= 0) continue;
    const ticker = cleanTicker(r.issuer_ticker);
    if (!ticker) continue;
    const key = `${r.accession_no}|${r.reporter_cik || r.reporter_name || ''}`;
    const g = byFiling.get(key) || {
      accession: r.accession_no,
      formType: r.form_type || '4',
      filedAt: r.filed_at || null,
      ticker,
      issuerCik: r.issuer_cik || null,
      name: titleCase(r.issuer_name) || ticker,
      reporterCik: r.reporter_cik || null,
      reporter: titleCase(r.reporter_name) || 'Undisclosed reporter',
      title: r.reporter_title || null,
      isDirector: Boolean(r.is_director),
      isOfficer: Boolean(r.is_officer),
      isTenPct: Boolean(r.is_ten_pct_owner),
      indirect: false,
      shares: 0,
      value: 0,
      lines: 0,
      firstDate: r.transaction_date,
      date: r.transaction_date,
    };
    g.shares += shares;
    g.value += value;
    g.lines += 1;
    if (r.direct_indirect === 'I') g.indirect = true;
    if (r.transaction_date && (!g.firstDate || r.transaction_date < g.firstDate))
      g.firstDate = r.transaction_date;
    if (r.transaction_date && (!g.date || r.transaction_date > g.date)) g.date = r.transaction_date;
    byFiling.set(key, g);
  }
  /* A 4/A restating the same buy (same issuer, reporter, last date, shares)
     replaces the original: keep the later filing. */
  const kept = new Map();
  for (const g of byFiling.values()) {
    const k = `${g.ticker}|${g.reporterCik || g.reporter}|${g.date}|${Math.round(g.shares)}`;
    const cur = kept.get(k);
    if (!cur || String(g.filedAt || '') > String(cur.filedAt || '')) kept.set(k, g);
  }
  return [...kept.values()].map((g) => ({
    ...g,
    price: g.value / g.shares,
    role: roleOf(g),
  }));
}

export const groupBuys = (rows) => groupTransactions(rows, { code: 'P' });

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** The headline figures for a set of buys (all computed, none estimated). */
export function summarizeBuys(buys) {
  const list = buys || [];
  const byValue = [...list].sort((a, b) => b.value - a.value);
  const roles = new Map();
  for (const b of list) roles.set(b.role.label, (roles.get(b.role.label) || 0) + 1);
  const topRole = [...roles.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const tiers = { exec: 0, director: 0, officer: 0, owner: 0, other: 0 };
  const tierValue = { exec: 0, director: 0, officer: 0, owner: 0, other: 0 };
  for (const b of list) {
    tiers[b.role.tier] += 1;
    tierValue[b.role.tier] += b.value;
  }
  const known = list.filter((b) => Number.isFinite(b.sincePct));
  return {
    count: list.length,
    total: list.reduce((t, b) => t + b.value, 0),
    companies: new Set(list.map((b) => b.ticker)).size,
    insiders: new Set(list.map((b) => b.reporterCik || b.reporter)).size,
    median: median(list.map((b) => b.value)),
    largest: byValue[0] || null,
    smallest: byValue[byValue.length - 1] || null,
    topRole: topRole ? { label: topRole[0], count: topRole[1] } : null,
    tiers,
    tierValue,
    quoted: known.length,
    upCount: known.filter((b) => b.sincePct > 0).length,
  };
}

/* ── Formatting (no em dashes) ──────────────────────────────────────── */

export function usdTight(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e7) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
}

/* Whole-decade axis labels: $100K, $1M, $10M, $100M, $1B. */
export function decadeFmt(v) {
  const n = Number(v);
  if (n >= 1e9) return `$${n / 1e9}B`;
  if (n >= 1e6) return `$${n / 1e6}M`;
  if (n >= 1e3) return `$${n / 1e3}K`;
  return `$${n}`;
}

/* Spoken form for captions: $1.00M reads as $1M, $161.9M stays. */
export function usdSpoken(v) {
  return usdTight(v)
    .replace(/\.0+([KMB])$/, '$1')
    .replace(/(\.\d)0([KMB])$/, '$1$2');
}

export function priceFmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function sharesFmt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : 'n/a';
}

export function pctSigned(v, dp = 2) {
  if (!Number.isFinite(v)) return 'n/a';
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`;
}

export function dayFmt(iso, { year = true } = {}) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  const day = d.getUTCDate();
  const mon = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return year ? `${day} ${mon} ${d.getUTCFullYear()}` : `${day} ${mon}`;
}

/** "2 Nov–5 Nov 2026" (en dash, never an em dash). */
export function rangeFmt(from, to) {
  if (!from || !to) return '';
  if (from === to) return dayFmt(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${dayFmt(from, { year: !sameYear })}–${dayFmt(to)}`;
}

/** EDGAR filing index page for a buy. */
export function filingUrl({ accession, issuerCik }) {
  if (!accession || !issuerCik) return null;
  const cik = String(parseInt(String(issuerCik).replace(/\D/g, ''), 10));
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${String(accession).replace(/-/g, '')}/${accession}-index.htm`;
}
