#!/usr/bin/env node
/**
 * The data behind an Ezana Echo insider-trading month (Nov 2026). Run LOCALLY:
 *
 *   node scripts/echo-insider-month-stats.mjs 2026-10
 *
 * Reads sec_insider_transactions for the month (run
 * scripts/backfill-insider-form4.mjs for the month first), groups open-market
 * purchases (P) and sales (S) into one row per reporter per Form 4 with the
 * app's own helpers (src/lib/sec/insider-buys.js), adds each company's latest
 * quote, P/E, sector and headquarters from FMP, and writes every figure the
 * article may use to research/echo/insider-<month>.json.
 *
 * The article is written FROM this file and nothing else: no figure in the
 * prose or a chart may be absent from it (Echo zero-data-invention rule).
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and FMP_API_KEY in
 * .env.local.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { groupTransactions, summarizeBuys, median } from '../src/lib/sec/insider-buys.js';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv('.env.local');

const month = process.argv[2];
if (!/^\d{4}-\d{2}$/.test(month || '')) {
  console.error('Usage: node scripts/echo-insider-month-stats.mjs YYYY-MM');
  process.exit(1);
}
const from = `${month}-01`;
const to = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
  .toISOString()
  .slice(0, 10);
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);
const FMP = process.env.FMP_API_KEY;
if (!FMP) console.warn('FMP_API_KEY missing: quotes, sectors and HQs will be null.');

/* ── Read the month ─────────────────────────────────────────────────── */
async function readMonth() {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db
      .from('sec_insider_transactions')
      .select(
        'accession_no, table_kind, line_no, form_type, filed_at, issuer_cik, issuer_name, issuer_ticker, reporter_cik, reporter_name, reporter_title, is_director, is_officer, is_ten_pct_owner, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd, direct_indirect',
      )
      .in('transaction_code', ['P', 'S'])
      .eq('table_kind', 'non_derivative')
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('accession_no')
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function coverage() {
  const { count: filings } = await db
    .from('sec_filings')
    .select('accession_no', { count: 'exact', head: true })
    .eq('form_family', 'insider')
    .gte('filed_at', from)
    .lte('filed_at', `${to}T23:59:59Z`);
  return { form4FilingsIndexed: filings ?? null };
}

/* ── FMP, about 5 requests a second ─────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fmp(path) {
  if (!FMP) return null;
  await sleep(200);
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/${path}&apikey=${encodeURIComponent(FMP)}`,
    );
    if (!res.ok) return null;
    const d = await res.json();
    return (Array.isArray(d) ? d[0] : d) || null;
  } catch {
    return null;
  }
}
async function company(ticker) {
  const sym = encodeURIComponent(ticker.replace('.', '-'));
  const [q, r, p] = [
    await fmp(`quote?symbol=${sym}`),
    await fmp(`ratios-ttm?symbol=${sym}`),
    await fmp(`profile?symbol=${sym}`),
  ];
  return {
    price: q?.price ?? null,
    marketCap: q?.marketCap ?? null,
    pe: r?.priceToEarningsRatioTTM ?? r?.peRatioTTM ?? null,
    sector: p?.sector || null,
    industry: p?.industry || null,
    city: p?.city || null,
    state: p?.state || null,
    country: p?.country || null,
  };
}

/* ── Compute ────────────────────────────────────────────────────────── */
const raw = await readMonth();
const buys = groupTransactions(raw, { code: 'P' });
const sells = groupTransactions(raw, { code: 'S' });
console.log(`${month}: ${raw.length} P/S rows -> ${buys.length} buys, ${sells.length} sales`);

const buyTickers = [...new Set([...buys].sort((a, b) => b.value - a.value).map((b) => b.ticker))];
const sellTop = [
  ...new Set([...sells].sort((a, b) => b.value - a.value).map((b) => b.ticker)),
].slice(0, 40);
const companies = new Map();
for (const t of [...new Set([...buyTickers, ...sellTop])]) companies.set(t, await company(t));
console.log(`quotes for ${companies.size} companies`);

for (const b of buys) {
  const c = companies.get(b.ticker) || {};
  b.priceNow = c.price ?? null;
  b.marketCap = c.marketCap ?? null;
  b.pe = c.pe ?? null;
  b.sector = c.sector || 'Unclassified';
  b.sincePct = b.priceNow && b.price ? (b.priceNow / b.price - 1) * 100 : null;
}
for (const s of sells) s.sector = companies.get(s.ticker)?.sector || 'Unclassified';

const pick = (b) => ({
  ticker: b.ticker,
  name: b.name,
  reporter: b.reporter,
  role: b.role.label,
  tier: b.role.tier,
  title: b.title,
  date: b.date,
  firstDate: b.firstDate,
  shares: Math.round(b.shares),
  price: Number(b.price.toFixed(4)),
  value: Math.round(b.value),
  priceNow: b.priceNow ?? null,
  sincePct: b.sincePct == null ? null : Number(b.sincePct.toFixed(2)),
  marketCap: b.marketCap ?? null,
  pe: b.pe == null ? null : Number(Number(b.pe).toFixed(1)),
  sector: b.sector,
  accession: b.accession,
  issuerCik: b.issuerCik,
});

const side = (list) => {
  const s = summarizeBuys(list);
  return {
    count: s.count,
    total: Math.round(s.total),
    companies: s.companies,
    insiders: s.insiders,
    median: s.median == null ? null : Math.round(s.median),
    tiers: s.tiers,
    tierValue: Object.fromEntries(Object.entries(s.tierValue).map(([k, v]) => [k, Math.round(v)])),
    quoted: s.quoted,
    upCount: s.upCount,
  };
};

const daily = new Map();
for (const [list, k] of [
  [buys, 'buy'],
  [sells, 'sell'],
]) {
  for (const b of list) {
    const d = daily.get(b.date) || {
      date: b.date,
      buyValue: 0,
      buyCount: 0,
      sellValue: 0,
      sellCount: 0,
    };
    d[`${k}Value`] += b.value;
    d[`${k}Count`] += 1;
    daily.set(b.date, d);
  }
}

const sectors = new Map();
for (const b of buys) {
  const s = sectors.get(b.sector) || {
    sector: b.sector,
    buyValue: 0,
    buyCount: 0,
    sellValue: 0,
    sellCount: 0,
    sinceW: 0,
    sinceV: 0,
  };
  s.buyValue += b.value;
  s.buyCount += 1;
  if (Number.isFinite(b.sincePct)) {
    s.sinceW += b.sincePct * b.value;
    s.sinceV += b.value;
  }
  sectors.set(b.sector, s);
}
for (const x of sells) {
  const s = sectors.get(x.sector) || {
    sector: x.sector,
    buyValue: 0,
    buyCount: 0,
    sellValue: 0,
    sellCount: 0,
    sinceW: 0,
    sinceV: 0,
  };
  s.sellValue += x.value;
  s.sellCount += 1;
  sectors.set(x.sector, s);
}

const clusters = new Map();
for (const b of buys) {
  const c = clusters.get(b.ticker) || {
    ticker: b.ticker,
    name: b.name,
    insiders: new Set(),
    value: 0,
    buys: 0,
  };
  c.insiders.add(b.reporterCik || b.reporter);
  c.value += b.value;
  c.buys += 1;
  clusters.set(b.ticker, c);
}

const topBuys = [...buys].sort((a, b) => b.value - a.value);
const hq = topBuys.slice(0, 12).map((b) => {
  const c = companies.get(b.ticker) || {};
  return { ticker: b.ticker, name: b.name, city: c.city, state: c.state, country: c.country };
});

const sinceList = buys.filter((b) => Number.isFinite(b.sincePct)).map((b) => b.sincePct);
const buckets = [
  ['below -20%', (v) => v < -20],
  ['-20% to -10%', (v) => v >= -20 && v < -10],
  ['-10% to 0%', (v) => v >= -10 && v < 0],
  ['0% to +10%', (v) => v >= 0 && v < 10],
  ['+10% to +20%', (v) => v >= 10 && v < 20],
  ['+20% or more', (v) => v >= 20],
].map(([label, f]) => ({ label, count: sinceList.filter(f).length }));

const out = {
  month,
  from,
  to,
  generatedAt: new Date().toISOString(),
  method:
    'SEC Form 4, non-derivative table. Buys: code P, acquired. Sales: code S, disposed. One row per reporter per filing (fills summed, value-weighted price); an amended Form 4 replaces the original. Prices, market cap, P/E, sector and HQ are the latest FMP quote/profile at generation time, not as of the trade.',
  coverage: { ...(await coverage()), transactionRows: raw.length },
  buys: { ...side(buys), medianSincePct: median(sinceList) },
  sells: side(sells),
  ratio: {
    sellToBuyValue: buys.length
      ? Number(
          (sells.reduce((t, s) => t + s.value, 0) / buys.reduce((t, b) => t + b.value, 0)).toFixed(
            2,
          ),
        )
      : null,
    sellToBuyCount: buys.length ? Number((sells.length / buys.length).toFixed(2)) : null,
  },
  daily: [...daily.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, buyValue: Math.round(d.buyValue), sellValue: Math.round(d.sellValue) })),
  topBuys: topBuys.slice(0, 20).map(pick),
  topSells: [...sells]
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)
    .map((s) => ({
      ticker: s.ticker,
      name: s.name,
      reporter: s.reporter,
      role: s.role.label,
      date: s.date,
      shares: Math.round(s.shares),
      price: Number(s.price.toFixed(4)),
      value: Math.round(s.value),
      sector: s.sector,
    })),
  execBuys: buys
    .filter((b) => b.role.tier === 'exec')
    .sort((a, b) => b.value - a.value)
    .map(pick),
  clusters: [...clusters.values()]
    .filter((c) => c.insiders.size >= 2)
    .map((c) => ({
      ticker: c.ticker,
      name: c.name,
      insiders: c.insiders.size,
      buys: c.buys,
      value: Math.round(c.value),
    }))
    .sort((a, b) => b.insiders - a.insiders || b.value - a.value),
  sectors: [...sectors.values()]
    .map((s) => ({
      sector: s.sector,
      buyValue: Math.round(s.buyValue),
      buyCount: s.buyCount,
      sellValue: Math.round(s.sellValue),
      sellCount: s.sellCount,
      buySincePctValueWeighted: s.sinceV ? Number((s.sinceW / s.sinceV).toFixed(2)) : null,
    }))
    .sort((a, b) => b.buyValue - a.buyValue),
  sinceBuckets: buckets,
  hq,
};

mkdirSync('research/echo', { recursive: true });
const file = `research/echo/insider-${month}.json`;
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${file}`);
console.log(
  `buys ${out.buys.count} / $${(out.buys.total / 1e6).toFixed(1)}M across ${out.buys.companies} companies; sales ${out.sells.count} / $${(out.sells.total / 1e6).toFixed(1)}M; Form 4s indexed ${out.coverage.form4FilingsIndexed}`,
);
