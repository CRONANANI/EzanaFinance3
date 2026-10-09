/**
 * Politician pings for the Sonar landing band.
 *
 * When a ping names a member of Congress ("Nancy Pelosi", "Tuberville"), the
 * band's right-hand stack switches from the company layout (price chart, news)
 * to the member layout:
 *
 *   chart card   the member's estimated portfolio value over time
 *   people card  other members whose traded tickers overlap most, with faces
 *
 * ESTIMATES, not holdings. STOCK Act filings disclose amount RANGES, never
 * share counts or prices. The series walks the member's trades in date order
 * with the same open-position rule the politician_portfolio RPC uses: a
 * purchase adds its range midpoint, a partial sale removes its midpoint, a full
 * sale closes the position. The month-end total of open positions is the
 * point. No market prices are applied, and the card says so.
 */
import { resolveHeadshot } from '@/lib/politicians/headshots';

const CHAMBER_LABEL = { house: 'House', senate: 'Senate' };

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* Suffixes and initials carry no identity for matching: "Gilbert Ray
   Cisneros, Jr." is matched by "Gil Cisneros" through the last name. */
const tokensOf = (s) =>
  norm(s)
    .split(' ')
    .filter((t) => t.length > 1 && !/^(jr|sr|ii|iii|iv)$/.test(t));

/* A bare ticker ("LMT", "AAPL") is never a politician. */
const looksLikeTicker = (q) => /^\$?[A-Z]{1,5}(\.[A-Z])?$/.test(String(q).trim());

/**
 * Resolve a ping to a member of Congress, or null.
 *
 * Rules, strictest first:
 *   1. the query equals the member's full name (normalized), or
 *   2. the query has 2+ tokens and every one is in the member's name, or
 *   3. the query is ONE token equal to the last name of exactly one sitting
 *      member who has disclosed trades.
 * Rule 3 is the one that could collide with a company ("Ford"), which is why
 * it is limited to sitting members with trades and requires uniqueness.
 */
export async function resolvePolitician(query, admin) {
  const q = String(query || '').trim();
  if (!admin || !q || looksLikeTicker(q)) return null;
  const qTokens = tokensOf(q);
  if (!qTokens.length || qTokens.length > 4) return null;
  const last = qTokens[qTokens.length - 1].replace(/[%,()]/g, '');

  try {
    const { data, error } = await admin
      .from('congress_members')
      .select('bioguide_id, full_name, first_name, last_name, party, chamber, state, in_office')
      .ilike('last_name', `%${last}%`)
      .limit(25);
    if (error || !data?.length) return null;

    const qNorm = qTokens.join(' ');
    const scored = data
      .map((m) => {
        const nameTokens = tokensOf(m.full_name);
        const lastTokens = tokensOf(m.last_name);
        let score = 0;
        if (nameTokens.join(' ') === qNorm) score = 3;
        else if (qTokens.length >= 2 && qTokens.every((t) => nameTokens.includes(t))) score = 2;
        else if (
          /* Last name exact plus a first name that is the filed one or a
             short form of it: "Gil Cisneros" for "Gilbert Ray Cisneros, Jr." */
          qTokens.length >= 2 &&
          lastTokens.length &&
          lastTokens.every((t) => qTokens.includes(t)) &&
          qTokens.some(
            (t) =>
              !lastTokens.includes(t) &&
              nameTokens.some((n) => n === t || (t.length >= 3 && n.startsWith(t))),
          )
        )
          score = 2;
        else if (qTokens.length === 1 && lastTokens.join(' ') === qTokens[0]) score = 1;
        return { m, score };
      })
      .filter((x) => x.score > 0);
    if (!scored.length) return null;

    const ids = scored.map((x) => x.m.bioguide_id);
    const { data: traded } = await admin
      .from('congress_trades')
      .select('bioguide_id')
      .in('bioguide_id', ids)
      .limit(1000);
    const hasTrades = new Set((traded || []).map((r) => r.bioguide_id));

    const best = Math.max(...scored.map((x) => x.score));
    let pool = scored.filter((x) => x.score === best);
    if (best === 1) {
      pool = pool.filter((x) => x.m.in_office && hasTrades.has(x.m.bioguide_id));
      if (pool.length !== 1) return null;
    }
    pool.sort(
      (a, b) =>
        Number(hasTrades.has(b.m.bioguide_id)) - Number(hasTrades.has(a.m.bioguide_id)) ||
        Number(Boolean(b.m.in_office)) - Number(Boolean(a.m.in_office)),
    );
    const m = pool[0].m;
    return {
      bioguideId: m.bioguide_id,
      name: m.full_name,
      lastName: m.last_name,
      party: m.party || null,
      chamber: m.chamber || null,
      chamberLabel: CHAMBER_LABEL[m.chamber] || null,
      state: m.state || null,
      inOffice: Boolean(m.in_office),
      hasTrades: hasTrades.has(m.bioguide_id),
    };
  } catch (e) {
    console.error('[sonar-politician] resolve failed:', e?.message);
    return null;
  }
}

const monthKey = (d) => String(d || '').slice(0, 7);

function nextMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/* Share classes of one company count once, matching the RPC. */
const SHARE_CLASS = { GOOG: 'GOOGL', 'BRK.A': 'BRK.B', FOX: 'FOXA', NWS: 'NWSA', UA: 'UAA' };
const positionKey = (t) => {
  const tk = t.ticker ? String(t.ticker).toUpperCase() : null;
  if (tk) return SHARE_CLASS[tk] || tk;
  return `asset:${norm(t.asset_name || '?')}`;
};

/**
 * Month-end estimated open portfolio, oldest first.
 * @returns {{ months: string[], values: number[] }}
 */
export function portfolioSeries(trades, { months = 36, now = new Date() } = {}) {
  const sorted = [...trades]
    .filter((t) => t?.transaction_date)
    .sort((a, b) => String(a.transaction_date).localeCompare(String(b.transaction_date)));
  if (!sorted.length) return { months: [], values: [] };

  const open = new Map();
  const total = () => {
    let s = 0;
    for (const v of open.values()) s += v;
    return s;
  };

  const endKey = monthKey(now.toISOString());
  const outMonths = [];
  const outValues = [];
  let i = 0;
  let key = monthKey(sorted[0].transaction_date);
  /* Walk every month from the first trade to now, so a quiet stretch reads
     as a flat line rather than being skipped. */
  while (key <= endKey) {
    while (i < sorted.length && monthKey(sorted[i].transaction_date) === key) {
      const t = sorted[i];
      const k = positionKey(t);
      const mid = Number(t.amount_mid) || 0;
      if (t.type === 'purchase') open.set(k, (open.get(k) || 0) + mid);
      else if (t.type === 'sale_partial' && open.has(k))
        open.set(k, Math.max(open.get(k) - mid, 1001));
      else if (t.type === 'sale') open.delete(k);
      i += 1;
    }
    outMonths.push(key);
    outValues.push(Math.round(total()));
    key = nextMonth(key);
  }
  return { months: outMonths.slice(-months), values: outValues.slice(-months) };
}

/**
 * The member dossier. Every leg is fail-soft; the card renders what came back.
 */
export async function buildPoliticianDossier(member, admin) {
  const out = {
    kind: 'politician',
    ticker: null,
    name: member.name,
    bioguideId: member.bioguideId,
    party: member.party,
    chamber: member.chamberLabel,
    state: member.state,
    headshot: resolveHeadshot({ name: member.name, bioguideId: member.bioguideId })?.src || null,
    series: null,
    seriesLabel: null,
    stats: null,
    topHoldings: [],
    similar: [],
    /* The company layout's fields, empty, so any consumer that has not
       learned about kind still renders without throwing. */
    fundamentals: null,
    spark: null,
    news: [],
    echo: [],
    matches: null,
  };
  if (!admin) return out;

  const [tradesRes, portfolioRes, similarRes] = await Promise.all([
    admin
      .from('congress_trades')
      .select('type, transaction_date, amount_mid, ticker, asset_name')
      .eq('bioguide_id', member.bioguideId)
      .order('transaction_date', { ascending: true })
      .limit(5000)
      .then(
        (r) => r,
        () => ({ data: null }),
      ),
    admin.rpc('politician_portfolio', { p_bioguide: member.bioguideId, p_limit: 3 }).then(
      (r) => r,
      () => ({ data: null }),
    ),
    admin.rpc('politician_similar', { p_bioguide: member.bioguideId, p_limit: 4 }).then(
      (r) => r,
      () => ({ data: null }),
    ),
  ]);

  const trades = Array.isArray(tradesRes?.data) ? tradesRes.data : [];
  const { months, values } = portfolioSeries(trades);
  if (values.length >= 2) {
    out.series = values;
    out.seriesMonths = months;
    const firstYear = months[0].slice(0, 4);
    out.seriesLabel = months.length >= 36 ? '3Y' : `SINCE ${firstYear}`;
  }

  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = trades.filter((t) => String(t.transaction_date) >= yearAgo);
  const lastTrade = trades.length ? trades[trades.length - 1].transaction_date : null;
  const portfolio = portfolioRes?.data || null;
  out.stats = {
    estValue:
      portfolio && Number(portfolio.total) > 0
        ? Number(portfolio.total)
        : values.length
          ? values[values.length - 1]
          : null,
    openPositions: portfolio ? Number(portfolio.positions) || 0 : null,
    trades12m: recent.length,
    lastTrade,
  };
  out.topHoldings = Array.isArray(portfolio?.holdings)
    ? portfolio.holdings.slice(0, 3).map((h) => h.ticker)
    : [];

  out.similar = (Array.isArray(similarRes?.data) ? similarRes.data : []).map((s) => ({
    bioguideId: s.bioguideId,
    name: s.name,
    party: s.party || null,
    chamber: CHAMBER_LABEL[s.chamber] || null,
    state: s.state || null,
    shared: Array.isArray(s.shared) ? s.shared : [],
    sharedCount: Number(s.shared_count) || 0,
    headshot: resolveHeadshot({ name: s.name, bioguideId: s.bioguideId })?.src || null,
  }));

  /* The Sourced matches card: this member's latest disclosed trades in the
     CONGRESS row. The other rows render dry, which is the truth. */
  const latest = [...trades].reverse().slice(0, 3);
  out.matches = {
    echo: null,
    contracts: null,
    congress: latest.length
      ? latest.map((t) => ({
          member: t.ticker ? String(t.ticker).toUpperCase() : String(t.asset_name || 'Asset'),
          type: String(t.type || '').replace('_', ' '),
          date: t.transaction_date || null,
        }))
      : null,
    sec: null,
    thirteenF: null,
    lobbying: null,
    markets: null,
  };

  return out;
}
