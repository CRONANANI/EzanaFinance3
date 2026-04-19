import { NextResponse } from 'next/server';
import {
  FEED_KEYS,
  getEarningsEvents,
  getDividendEvents,
  getIpoEvents,
  getEconomicEvents,
  getCongressTrades,
  getCryptoEvents,
  getCommodityEvents,
  getFmpKey,
  todayAndEndOfMonth,
} from '@/lib/fmp/upcoming-events';
import {
  parseSet,
  canonicalPoliticianKey,
  canonicalPoliticianSet,
} from '@/lib/upcoming-events/relevance-params';

export const dynamic = 'force-dynamic';

// Short edge cache — the route is recomputed on every miss, so the date
// window always reflects "now", never a baked-in build-time value.
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
};

const ICONS = {
  earnings: '📊',
  dividends: '💵',
  ipos: '🚀',
  economic: '📈',
  fed: '🏛️',
  'inside-the-capitol': '🏛',
  crypto: '🪙',
  commodity: '🛢️',
};

const COLORS = {
  earnings: '#10b981',
  dividends: '#22c55e',
  ipos: '#a855f7',
  economic: '#6366f1',
  fed: '#3b82f6',
  'inside-the-capitol': '#f97316',
  crypto: '#fbbf24',
  commodity: '#84cc16',
};

/** "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" → local Date (null if invalid). */
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim().replace('T', ' ');
  const [datePart, timePart] = s.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  if (timePart) {
    const [hh = 0, mm = 0] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  return new Date(y, m - 1, d);
}

function fmtDateLabel(dateStr) {
  return String(dateStr).split(' ')[0].split('T')[0];
}

function toTimeLabel(dateStr, fallback) {
  const d = parseLocalDate(dateStr);
  if (!d) return fallback;
  if (String(dateStr).includes(' ') || String(dateStr).includes('T')) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return fallback;
}

/**
 * Normalize a raw FMP record into the unified shape the Home card consumes.
 * Preserves legacy fields (id/type/icon/title/fullDate/day/month/year/time/color)
 * and adds `category`, `subtitle`, `impact`, `symbol` for the richer UI.
 */
function normalizers() {
  return {
    earnings: (e, i) => {
      const d = parseLocalDate(e.date);
      if (!d || !e.symbol) return null;
      const eps = typeof e.epsEstimated === 'number' ? e.epsEstimated : null;
      return {
        id: `earn-${e.symbol}-${fmtDateLabel(e.date)}-${i}`,
        category: 'earnings',
        type: 'earnings',
        icon: ICONS.earnings,
        title: `${e.symbol} Earnings`,
        subtitle: eps != null ? `Est. EPS $${eps.toFixed(2)}` : null,
        symbol: e.symbol,
        fullDate: fmtDateLabel(e.date),
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        time: toTimeLabel(e.date, 'After Close'),
        color: COLORS.earnings,
        impact: null,
        epsEstimated: eps,
        revenueEstimated: e.revenueEstimated ?? null,
      };
    },
    dividends: (d, i) => {
      const dt = parseLocalDate(d.date);
      if (!dt || !d.symbol) return null;
      const amt = typeof d.dividend === 'number' ? d.dividend : Number(d.dividend);
      const yld = typeof d.yield === 'number' ? d.yield : Number(d.yield);
      const subParts = [];
      if (Number.isFinite(amt)) subParts.push(`$${amt.toFixed(2)}`);
      if (Number.isFinite(yld) && yld > 0) subParts.push(`${yld.toFixed(2)}% yield`);
      if (d.frequency) subParts.push(String(d.frequency));
      return {
        id: `div-${d.symbol}-${fmtDateLabel(d.date)}-${i}`,
        category: 'dividends',
        type: 'dividends',
        icon: ICONS.dividends,
        title: `${d.symbol} Dividend`,
        subtitle: subParts.join(' · ') || null,
        symbol: d.symbol,
        fullDate: fmtDateLabel(d.date),
        day: dt.getDate(),
        month: dt.getMonth(),
        year: dt.getFullYear(),
        time: 'Ex-date',
        color: COLORS.dividends,
        impact: null,
        dividend: Number.isFinite(amt) ? amt : null,
        yield: Number.isFinite(yld) ? yld : null,
        frequency: d.frequency || null,
        paymentDate: d.paymentDate || null,
        recordDate: d.recordDate || null,
      };
    },
    ipos: (i, idx) => {
      const dt = parseLocalDate(i.date);
      if (!dt) return null;
      const name = i.company || i.symbol || 'IPO';
      const subParts = [i.exchange, i.priceRange].filter(Boolean);
      return {
        id: `ipo-${i.symbol || name}-${fmtDateLabel(i.date)}-${idx}`,
        category: 'ipos',
        type: 'ipos',
        icon: ICONS.ipos,
        title: `${name} IPO`,
        subtitle: subParts.join(' · ') || null,
        symbol: i.symbol || null,
        fullDate: fmtDateLabel(i.date),
        day: dt.getDate(),
        month: dt.getMonth(),
        year: dt.getFullYear(),
        time: 'IPO Day',
        color: COLORS.ipos,
        impact: null,
        exchange: i.exchange || null,
        priceRange: i.priceRange || null,
        marketCap: i.marketCap ?? null,
      };
    },
    economic: (e, i) => {
      const d = parseLocalDate(e.date);
      if (!d || !e.event) return null;
      const impactLower = String(e.impact ?? '').trim().toLowerCase();
      const isHigh = impactLower === 'high';
      const impact =
        impactLower === 'high' ? 'High'
        : impactLower === 'medium' ? 'Medium'
        : impactLower === 'low' ? 'Low'
        : null;
      const subParts = [e.country, e.estimate != null ? `Est. ${e.estimate}` : null].filter(Boolean);
      return {
        id: `econ-${e.country || 'US'}-${String(e.event).slice(0, 24)}-${fmtDateLabel(e.date)}-${i}`,
        category: 'economic',
        type: isHigh ? 'fed' : 'economic',
        icon: isHigh ? ICONS.fed : ICONS.economic,
        title: e.event,
        subtitle: subParts.join(' · ') || null,
        fullDate: fmtDateLabel(e.date),
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        time: toTimeLabel(e.date, '8:30 AM'),
        color: isHigh ? COLORS.fed : COLORS.economic,
        impact,
        country: e.country || null,
        actual: e.actual ?? null,
        estimate: e.estimate ?? null,
        previous: e.previous ?? null,
      };
    },
    'inside-the-capitol': (c, i) => {
      const rawDate = c.transactionDate || c.disclosureDate;
      const dt = parseLocalDate(rawDate);
      if (!dt || !c.symbol) return null;
      const name = c.firstName
        ? `${c.firstName} ${c.lastName || ''}`.trim()
        : c.representative || c.senator || 'Unknown';
      const rawType = String(c.type || c.transactionType || '').toLowerCase();
      const isBuy = rawType.includes('purchase') || rawType.includes('buy');
      const action = isBuy ? 'Bought' : 'Sold';
      const chamber = c.chamber || (c.senator ? 'Senate' : 'House');
      return {
        id: `congress-${c.symbol}-${fmtDateLabel(rawDate)}-${name}-${i}`,
        category: 'inside-the-capitol',
        type: 'inside-the-capitol',
        icon: ICONS['inside-the-capitol'],
        title: `${name} ${action} ${c.symbol}`,
        subtitle: [chamber, c.amount || null].filter(Boolean).join(' · ') || null,
        symbol: c.symbol,
        politician: name,
        fullDate: fmtDateLabel(rawDate),
        day: dt.getDate(),
        month: dt.getMonth(),
        year: dt.getFullYear(),
        time: 'Disclosure',
        color: COLORS['inside-the-capitol'],
        impact: null,
        chamber,
        action,
      };
    },
    crypto: (c, i) => {
      const dt = parseLocalDate(c.date);
      if (!dt || !c.symbol) return null;
      return {
        id: `crypto-${c.symbol}-${fmtDateLabel(c.date)}-${c.kind || 'event'}-${i}`,
        category: 'crypto',
        type: 'crypto',
        icon: ICONS.crypto,
        title: c.title ? `${c.symbol}: ${c.title}` : c.symbol,
        subtitle: c.subtitle || null,
        symbol: c.symbol,
        fullDate: fmtDateLabel(c.date),
        day: dt.getDate(),
        month: dt.getMonth(),
        year: dt.getFullYear(),
        time: c.time || '—',
        color: COLORS.crypto,
        impact: null,
      };
    },
    commodity: (c, i) => {
      const dt = parseLocalDate(c.date);
      if (!dt || !c.symbol) return null;
      return {
        id: `commodity-${c.symbol}-${fmtDateLabel(c.date)}-${i}`,
        category: 'commodity',
        type: 'commodity',
        icon: ICONS.commodity,
        title: c.title ? `${c.symbol}: ${c.title}` : c.symbol,
        subtitle: c.subtitle || null,
        symbol: c.symbol,
        fullDate: fmtDateLabel(c.date),
        day: dt.getDate(),
        month: dt.getMonth(),
        year: dt.getFullYear(),
        time: c.time || '—',
        color: COLORS.commodity,
        impact: null,
      };
    },
  };
}

/**
 * Client-side safety net: FMP sometimes returns items outside the requested
 * window. Defensively filter against the same today / end-of-month range.
 */
function withinWindow(ev, fromDate, toDate) {
  const d = parseLocalDate(ev.fullDate);
  if (!d) return false;
  return d >= fromDate && d <= toDate;
}

function hasRelevance(params) {
  return (
    params.tickers.size > 0 ||
    params.politicians.size > 0 ||
    params.cryptos.size > 0 ||
    params.commodities.size > 0
  );
}

export async function GET(request) {
  try {
    if (!getFmpKey()) {
      return NextResponse.json(
        { events: [], errors: ['FMP_API_KEY is not configured on the server.'] },
        { headers: CACHE_HEADERS }
      );
    }

    const url = new URL(request.url);
    const country = url.searchParams.get('country') || 'US';
    const tickers = parseSet(url.searchParams.get('tickers'));
    const politicians = canonicalPoliticianSet(
      parseSet(url.searchParams.get('politicians'), { upper: false })
    );
    const cryptos = parseSet(url.searchParams.get('cryptos'));
    const commodities = parseSet(url.searchParams.get('commodities'));
    const relevance = { tickers, politicians, cryptos, commodities };

    // Skip relevance-gated feeds entirely if the user follows nothing of
    // that kind — saves an FMP roundtrip and keeps the response tiny.
    const loaders = [
      { key: 'earnings', run: getEarningsEvents, gated: tickers.size > 0 },
      { key: 'dividends', run: getDividendEvents, gated: tickers.size > 0 },
      { key: 'ipos', run: getIpoEvents, gated: tickers.size > 0 },
      // Economic is always shown for the user's country — not gated.
      { key: 'economic', run: () => getEconomicEvents(country), gated: true },
      {
        key: 'inside-the-capitol',
        run: getCongressTrades,
        gated: politicians.size > 0,
      },
      { key: 'crypto', run: getCryptoEvents, gated: cryptos.size > 0 },
      { key: 'commodity', run: getCommodityEvents, gated: commodities.size > 0 },
    ];

    const activeLoaders = loaders.filter((l) => l.gated);
    const results = await Promise.allSettled(activeLoaders.map((l) => l.run()));

    const norm = normalizers();
    const errors = [];
    const events = [];

    results.forEach((r, idx) => {
      const key = activeLoaders[idx].key;
      if (r.status === 'fulfilled') {
        const arr = Array.isArray(r.value) ? r.value : [];
        for (let i = 0; i < arr.length; i += 1) {
          const mapped = norm[key](arr[i], i);
          if (!mapped) continue;

          // Relevance gating per event. Economic always passes (country was
          // already applied upstream). All other categories require the
          // event's subject to be in the user's followed set.
          if (key === 'earnings' || key === 'dividends' || key === 'ipos') {
            if (!relevance.tickers.has(String(mapped.symbol || '').toUpperCase())) {
              continue;
            }
          } else if (key === 'inside-the-capitol') {
            const politicianKey = canonicalPoliticianKey(mapped.politician);
            if (!relevance.politicians.has(politicianKey)) continue;
          } else if (key === 'crypto') {
            if (!relevance.cryptos.has(String(mapped.symbol || '').toUpperCase())) {
              continue;
            }
          } else if (key === 'commodity') {
            if (!relevance.commodities.has(String(mapped.symbol || '').toUpperCase())) {
              continue;
            }
          }
          events.push(mapped);
        }
      } else {
        const msg = r.reason?.message || String(r.reason || 'unknown error');
        errors.push(`${key}: ${msg}`);
      }
    });

    // Defensive window filter — FMP sometimes echoes items just outside range.
    const { from, to } = todayAndEndOfMonth();
    const fromDate = parseLocalDate(from);
    const toDate = parseLocalDate(to);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const inWindow = events.filter((ev) => withinWindow(ev, fromDate, toDate));

    // Drop economic "Low" impact events — the card highlights market-moving
    // items only. Everything else (earnings, dividends, congress, …) is
    // already gated by the user's relevance set, so it all passes through.
    const priority = inWindow.filter((ev) => {
      if (ev.category !== 'economic') return true;
      return ev.impact !== 'Low';
    });

    // Dedupe — the same event may be normalised from multiple sources (eg.
    // an earnings date that's also in a politician's disclosed trades).
    const byId = new Map();
    for (const ev of priority) {
      if (!byId.has(ev.id)) byId.set(ev.id, ev);
    }

    const sorted = Array.from(byId.values()).sort((a, b) => {
      const da = parseLocalDate(a.fullDate)?.getTime() ?? 0;
      const db = parseLocalDate(b.fullDate)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return FEED_KEYS.indexOf(a.category) - FEED_KEYS.indexOf(b.category);
    });

    return NextResponse.json(
      {
        events: sorted,
        errors,
        window: { from, to },
        relevance: {
          tickers: tickers.size,
          politicians: politicians.size,
          cryptos: cryptos.size,
          commodities: commodities.size,
          country,
          isEmpty: !hasRelevance(relevance),
        },
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { events: [], errors: [error.message || 'Server error'] },
      { status: 500 }
    );
  }
}
