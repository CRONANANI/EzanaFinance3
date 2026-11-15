/**
 * Related catalysts for one watchlist item (Market Monitor 2.0), server only.
 *
 * Every row comes from data the app already holds or already calls. There
 * are no placeholder rows: a source that fails or has nothing contributes
 * nothing, and an empty result means the panel shows its empty state.
 *
 *   stock        next earnings date, recent congressional trades in the
 *                ticker, recent federal contract awards to the company
 *   bond ETF,    upcoming high-impact US economic releases
 *   commodity
 *   crypto,      none yet (no verified source in the repo)
 *   politician
 *
 * Source labels name public sources only, never a data vendor.
 */
import { getEarningsEvents, getEconomicEvents } from '@/lib/fmp/upcoming-events';
import { parseNoteKey } from '@/lib/watchlist/notes';

const DAY = 86400000;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const STOCK_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

const usdShort = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};

const settle = async (label, fn) => {
  try {
    return (await fn()) || [];
  } catch (err) {
    console.warn(`[watchlist catalysts] ${label} unavailable:`, err?.message || err);
    return [];
  }
};

async function earnings(ticker, today) {
  const rows = await getEarningsEvents([ticker]);
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => String(r?.symbol || '').toUpperCase() === ticker && String(r?.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 1)
    .map((r) => ({
      kind: 'earnings',
      title: `${ticker} earnings`,
      date: String(r.date).slice(0, 10),
      estimated: true,
      source: 'Earnings calendar',
      detail: null,
      href: null,
    }));
}

async function congress(admin, ticker, sinceYmd) {
  const { data: trades, error } = await admin
    .from('congress_trades')
    .select('bioguide_id, transaction_date, disclosure_date, type, amount_min, amount_max')
    .eq('ticker', ticker)
    .gte('transaction_date', sinceYmd)
    .order('transaction_date', { ascending: false })
    .limit(3);
  if (error) throw error;
  if (!trades?.length) return [];
  const ids = [...new Set(trades.map((t) => t.bioguide_id).filter(Boolean))];
  const { data: members } = ids.length
    ? await admin
        .from('congress_members')
        .select('bioguide_id, full_name, first_name, last_name')
        .in('bioguide_id', ids)
    : { data: [] };
  const names = new Map(
    (members || []).map((m) => [
      m.bioguide_id,
      m.full_name || [m.first_name, m.last_name].filter(Boolean).join(' '),
    ]),
  );
  return trades.map((t) => {
    const side =
      t.type === 'purchase'
        ? 'bought'
        : String(t.type || '').startsWith('sale')
          ? 'sold'
          : 'traded';
    const lo = usdShort(t.amount_min);
    const hi = usdShort(t.amount_max);
    return {
      kind: 'congress_trade',
      title: `${names.get(t.bioguide_id) || 'A member of Congress'} ${side} ${ticker}`,
      date: String(t.transaction_date).slice(0, 10),
      estimated: false,
      source: 'House and Senate disclosures',
      detail:
        [
          lo && hi ? `${lo} to ${hi}` : hi || lo,
          t.disclosure_date ? `Disclosed ${String(t.disclosure_date).slice(0, 10)}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
      href: null,
    };
  });
}

async function contracts(admin, ticker, sinceYmd) {
  const { data, error } = await admin.rpc('contractor_company_card', {
    p_ticker: ticker,
    p_since: sinceYmd,
    p_limit: 3,
  });
  if (error) throw error;
  const card = Array.isArray(data) ? data[0] : data;
  const awards = Array.isArray(card?.awards) ? card.awards : [];
  return awards
    .filter((a) => a?.date)
    .slice(0, 3)
    .map((a) => ({
      kind: 'contract_award',
      title: `Contract award${a.agency ? `: ${a.agency}` : ''}`,
      date: String(a.date).slice(0, 10),
      estimated: false,
      source: 'USAspending',
      detail: [usdShort(a.amount), a.recipient].filter(Boolean).join(' · ') || null,
      href: '/datasets/government/contracts',
    }));
}

async function economic(today, untilYmd) {
  const rows = await getEconomicEvents('US');
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => {
      const d = String(r?.date || '').slice(0, 10);
      return r?.event && d >= today && d <= untilYmd && String(r.impact) === 'High';
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 3)
    .map((r) => ({
      kind: 'economic_release',
      title: String(r.event),
      date: String(r.date).slice(0, 10),
      estimated: false,
      source: 'Economic calendar',
      detail:
        r.estimate != null && Number.isFinite(Number(r.estimate)) ? `Estimate ${r.estimate}` : null,
      href: null,
    }));
}

/** Upcoming first (soonest on top), then the most recent past events. */
export function orderCatalysts(items, today, limit = 5) {
  const upcoming = items
    .filter((i) => i.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = items.filter((i) => i.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return [...upcoming, ...past].slice(0, limit);
}

/**
 * @returns {Promise<{ type, ticker, items: Array<{ kind, title, date, estimated, source, detail, href }> }>}
 *   Throws a { status: 400 } error for an unknown asset.
 */
export async function catalystsFor(admin, raw, { now = Date.now(), limit = 5 } = {}) {
  const key = parseNoteKey(raw);
  if (!key.ok) {
    const err = new Error(key.error);
    err.status = 400;
    throw err;
  }
  const { type, ticker } = key;
  const today = ymd(now);
  let found = [];
  if (type === 'stock' && STOCK_RE.test(ticker)) {
    found = (
      await Promise.all([
        settle('earnings', () => earnings(ticker, today)),
        settle('congress trades', () => congress(admin, ticker, ymd(now - 90 * DAY))),
        settle('contract awards', () => contracts(admin, ticker, ymd(now - 180 * DAY))),
      ])
    ).flat();
  } else if (type === 'bond_etf' || type === 'commodity') {
    found = await settle('economic releases', () => economic(today, ymd(now + 30 * DAY)));
  }
  return { type, ticker, items: orderCatalysts(found, today, limit) };
}
