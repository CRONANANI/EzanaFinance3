import { NextResponse } from 'next/server';
import {
  getPoliticianBySlug,
  parseSlugToName,
  getSimilarTraders,
  US_STATE_FULL,
} from '@/lib/capitol-politicians';

export const dynamic = 'force-dynamic';

/** In-process cache for resolved BioGuideIDs (keyed by name+chamber). Expires on restart. */
const bioGuideCache = new Map();

function parseTradeSizeMidpoint(raw) {
  if (!raw || typeof raw !== 'string') return 0;
  const cleaned = raw.replace(/\$/g, '').replace(/,/g, '').trim();
  const plusMatch = cleaned.match(/^(\d+)\s*\+$/);
  if (plusMatch) return Number(plusMatch[1]);
  const rangeMatch = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    return Math.round((lo + hi) / 2);
  }
  const single = Number(cleaned);
  return Number.isFinite(single) ? single : 0;
}

async function resolveBioGuideId(pol) {
  const key = `${pol.name || ''}-${pol.chamber || ''}`;
  if (bioGuideCache.has(key)) return bioGuideCache.get(key);
  if (!process.env.QUIVER_API_KEY || !pol.name) return null;

  try {
    const url = new URL('https://api.quiverquant.com/beta/bulk/congresstrading');
    url.searchParams.set('representative', pol.name);
    url.searchParams.set('normalized', 'true');
    url.searchParams.set('page', '0');
    url.searchParams.set('page_size', '5');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.QUIVER_API_KEY}`,
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const id = rows[0]?.BioGuideID || null;
    if (id) bioGuideCache.set(key, id);
    return id;
  } catch (err) {
    console.error('[politician-profile] BioGuideID resolve failed:', err.message);
    return null;
  }
}

async function fetchQuiverTradesForPolitician(pol) {
  if (!process.env.QUIVER_API_KEY) return [];
  const bioguideId = await resolveBioGuideId(pol);
  if (!bioguideId) return [];

  try {
    const base = new URL('https://api.quiverquant.com/beta/bulk/congresstrading');
    base.searchParams.set('bioguide_id', bioguideId);
    base.searchParams.set('normalized', 'true');
    base.searchParams.set('page_size', '500');

    const all = [];
    for (let page = 0; page < 5; page += 1) {
      base.searchParams.set('page', String(page));
      const res = await fetch(base.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.QUIVER_API_KEY}`,
        },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) break;

      for (const r of rows) {
        const tx = (r.Transaction || '').toLowerCase();
        const isSell = tx.includes('sale') || tx.includes('sold') || tx.includes('disposal');
        const type = isSell ? 'Sale' : 'Purchase';
        all.push({
          symbol: (r.Ticker || '').toString().toUpperCase(),
          ticker: (r.Ticker || '').toString().toUpperCase(),
          transactionDate: r.Traded || null,
          disclosureDate: r.Filed || r.Traded || null,
          amount: r.Trade_Size_USD || '',
          transactionType: type,
          type,
          _tradeSizeUSD: r.Trade_Size_USD || '',
          _isSell: isSell,
          _excessReturn: r.excess_return ?? null,
        });
      }
      if (rows.length < 500) break;
    }
    return all;
  } catch (err) {
    console.error('[politician-profile] Quiver fetch failed:', err.message);
    return [];
  }
}

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

function fmtAmount(raw) {
  if (raw == null || raw === '') return '—';
  return String(raw).trim() || '—';
}

function isSellType(t) {
  const lower = String(t.type || t.transactionType || '').toLowerCase();
  return lower.includes('sale') || lower.includes('sell') || lower.includes('disposal');
}

function formatTradeDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function fetchTradesForMember(pol) {
  const lastLower = pol.lastName.toLowerCase();
  const endpoint =
    pol.chamber === 'Senate'
      ? `${BASE}/senate-trades-by-name?name=${encodeURIComponent(pol.firstName)}&apikey=${FMP_KEY}`
      : `${BASE}/house-trades-by-name?name=${encodeURIComponent(pol.firstName)}&apikey=${FMP_KEY}`;
  try {
    const res = await fetch(endpoint, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((t) => (t.lastName || '').toLowerCase() === lastLower);
  } catch {
    return [];
  }
}

/** Try both chambers when chamber unknown */
async function fetchTradesResolved(pol) {
  const sen = await fetchTradesForMember({ ...pol, chamber: 'Senate' });
  if (sen.length > 0) return { trades: sen, chamber: 'Senate' };
  const hou = await fetchTradesForMember({ ...pol, chamber: 'House' });
  return { trades: hou, chamber: 'House' };
}

function buildHoldingsFromTrades(trades) {
  const bySym = {};
  for (const t of trades) {
    const sym = (t.symbol || t.ticker || '').toUpperCase();
    if (!sym) continue;
    bySym[sym] = (bySym[sym] || 0) + 1;
  }
  const total = Object.values(bySym).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(bySym).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return sorted.map(([ticker, count]) => ({
    ticker,
    name: ticker,
    value: Math.round((count / total) * 1e6),
    pct: Math.round((count / total) * 1000) / 10,
    change: 0,
  }));
}

function buildPerfData(trades) {
  const buys = trades.filter((t) => !isSellType(t)).length;
  const sells = trades.filter((t) => isSellType(t)).length;
  const n = Math.max(1, trades.length);
  const bias = ((buys - sells) / n) * 8;
  const base = Math.min(25, Math.max(-25, 5 + bias));
  return {
    '1M': { returnPct: Math.round(base * 10) / 10 },
    '3M': { returnPct: Math.round(base * 1.1 * 10) / 10 },
    '6M': { returnPct: Math.round(base * 1.15 * 10) / 10 },
    '1Y': { returnPct: Math.round(base * 1.2 * 10) / 10 },
    All: { returnPct: Math.round(base * 1.25 * 10) / 10 },
  };
}

export async function GET(request) {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') || '').toLowerCase().trim();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  let pol = getPoliticianBySlug(slug);
  if (!pol) {
    const guessed = parseSlugToName(slug);
    if (guessed) {
      pol = {
        ...guessed,
        party: 'Unknown',
        chamber: null,
        state: '',
        initials: `${guessed.firstName[0] || ''}${guessed.lastName[0] || ''}`.toUpperCase().slice(0, 3),
        role: 'Member of Congress',
        district: null,
        yearsInOffice: '—',
        age: null,
        committees: '—',
        committeeUrl: 'https://www.congress.gov',
        stateFull: '',
        slug,
      };
    }
  }

  if (!pol) {
    return NextResponse.json({ error: 'Politician not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  let rawTrades = await fetchQuiverTradesForPolitician(pol);

  if (rawTrades.length === 0) {
    if (pol.chamber === 'Senate' || pol.chamber === 'House') {
      rawTrades = await fetchTradesForMember(pol);
    } else {
      const r = await fetchTradesResolved(pol);
      rawTrades = r.trades;
      if (r.chamber) pol = { ...pol, chamber: r.chamber };
    }
  }

  rawTrades.sort(
    (a, b) =>
      new Date(b.disclosureDate || b.transactionDate || 0) -
      new Date(a.disclosureDate || a.transactionDate || 0)
  );

  const trades = rawTrades.slice(0, 50).map((t) => ({
    date: formatTradeDate(t.disclosureDate || t.transactionDate),
    ticker: (t.symbol || t.ticker || '—').toUpperCase(),
    type: isSellType(t) ? 'SELL' : 'BUY',
    amount: fmtAmount(t.amount),
    price: '—',
  }));

  const holdings = buildHoldingsFromTrades(rawTrades);
  const totalTrades = rawTrades.length;
  const uniqueSyms = new Set(rawTrades.map((t) => (t.symbol || '').toUpperCase()).filter(Boolean)).size;

  let avgReporting = 28;
  const deltas = [];
  for (const t of rawTrades) {
    const tx = t.transactionDate ? new Date(t.transactionDate) : null;
    const disc = t.disclosureDate ? new Date(t.disclosureDate) : null;
    if (tx && disc && !Number.isNaN(tx.getTime()) && !Number.isNaN(disc.getTime())) {
      deltas.push(Math.max(0, (disc - tx) / 86400000));
    }
  }
  if (deltas.length > 0) {
    avgReporting = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  }

  const buys = rawTrades.filter((t) => !isSellType(t)).length;
  const sells = rawTrades.filter((t) => isSellType(t)).length;
  const monthlyChange =
    totalTrades === 0 ? 0 : Math.round(((buys - sells) / totalTrades) * 20 * 10) / 10;

  const totalValue = rawTrades.reduce((sum, t) => {
    if (t._tradeSizeUSD) {
      const mid = parseTradeSizeMidpoint(t._tradeSizeUSD);
      return sum + (t._isSell ? -mid : mid);
    }
    const raw = typeof t.amount === 'string' ? t.amount.replace(/[$,]/g, '') : t.amount;
    const n = Number(raw) || 0;
    return sum + (isSellType(t) ? -n : n);
  }, 0);
  const ytdPct = Math.min(40, Math.max(-40, monthlyChange * 1.5));
  const ytdDollar = Math.round((totalValue * ytdPct) / 100);

  const topIndustry = { name: holdings[0]?.ticker ? 'Mixed / Disclosed' : '—', pct: holdings[0]?.pct ?? 0 };

  const displayStateFull = pol.stateFull || US_STATE_FULL[pol.state] || pol.state || '';
  const stateUrlSlug = String(displayStateFull).toLowerCase().replace(/\s+/g, '-');

  const profile = {
    slug: pol.slug,
    name: pol.name,
    party: pol.party,
    chamber: pol.chamber,
    state: pol.state,
    stateFull: displayStateFull,
    stateUrlSlug,
    district: pol.district,
    initials: pol.initials,
    role: pol.role,
    yearsInOffice: pol.yearsInOffice,
    age: pol.age,
    committees: pol.committees,
    committeeUrl: pol.committeeUrl,
    totalValue,
    monthlyChange,
    topIndustry,
    ytdReturns: ytdPct,
    ytdDollar,
    similarTraders: getSimilarTraders(pol.slug, pol.party, 3),
    perfData: buildPerfData(rawTrades),
    holdings: holdings.length > 0 ? holdings : [{ ticker: '—', name: 'No symbols', value: 1, pct: 100, change: 0 }],
    trades: trades.length > 0 ? trades : [],
    filingStats: {
      avgReportingTime: avgReporting,
      totalFilings: Math.min(totalTrades, 99),
      timeliness: avgReporting <= 30 ? 'On Time' : 'Late',
    },
    _meta: {
      fmpTradeCount: totalTrades,
      source: rawTrades.some((t) => Object.prototype.hasOwnProperty.call(t, '_isSell')) ? 'Quiver' : 'FMP',
    },
  };

  return NextResponse.json({ profile });
}
