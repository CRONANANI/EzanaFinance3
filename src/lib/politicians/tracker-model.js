/**
 * Politician Tracker model: pure functions over canonical enriched trades
 * (/api/politicians/trades). No React, no fetching, nothing estimated: every
 * figure is a count or a sum of disclosed-range midpoints.
 */

const norm = (n) =>
  String(n || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim();

export const slugify = (n) => norm(n).replace(/\s+/g, '-');

export function buildMembers(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = t.bioguideId || `${t.chamber}:${norm(t.name)}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        slug: slugify(t.name),
        name: t.name,
        chamber: t.chamber,
        party: t.party,
        state: t.state,
        district: t.district,
        bioguideId: t.bioguideId,
        photoUrl: t.photoUrl || null,
        trades: [],
      });
    }
    map.get(key).trades.push(t);
  }
  /* Slugs address the member panel (?member=). Two members can share a
     display name (and every sample-fixture member does), so a repeat gets a
     key suffix; the first keeps the plain name so old member URLs resolve. */
  const seen = new Map();
  for (const m of map.values()) {
    const n = seen.get(m.slug) || 0;
    seen.set(m.slug, n + 1);
    if (n) {
      const suffix = String(m.key)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      m.slug = `${m.slug}-${suffix || n + 1}`;
    }
  }
  return [...map.values()]
    .map((m) => {
      const counts = new Map();
      for (const t of m.trades) if (t.ticker) counts.set(t.ticker, (counts.get(t.ticker) || 0) + 1);
      const tickers = [...counts].sort((a, b) => b[1] - a[1]).map(([ticker, n]) => ({ ticker, n }));
      const trades = [...m.trades].sort((a, b) =>
        String(b.tradedAt || '').localeCompare(String(a.tradedAt || '')),
      );
      return {
        ...m,
        trades,
        count: trades.length,
        buys: trades.filter((t) => t.side === 'purchase').length,
        sells: trades.filter((t) => t.side === 'sale').length,
        volume: trades.reduce((s, t) => s + (t.amountBand?.mid || 0), 0),
        tickers,
        tickerSet: new Set(counts.keys()),
        lastTraded: trades[0]?.tradedAt || null,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function chamberStats(members) {
  const out = {};
  for (const ch of ['House', 'Senate']) {
    const ms = members.filter((m) => m.chamber === ch);
    const trades = ms.reduce((s, m) => s + m.count, 0);
    out[ch] = {
      members: ms.length,
      trades,
      buys: ms.reduce((s, m) => s + m.buys, 0),
      sells: ms.reduce((s, m) => s + m.sells, 0),
      volume: ms.reduce((s, m) => s + m.volume, 0),
      perMember: ms.length ? trades / ms.length : null,
    };
  }
  return out;
}

export function monthlyByChamber(trades, months = 12) {
  const map = new Map();
  for (const t of trades) {
    const mo = String(t.tradedAt || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mo)) continue;
    const row = map.get(mo) || { month: mo, House: 0, Senate: 0 };
    if (t.chamber === 'House' || t.chamber === 'Senate') row[t.chamber] += 1;
    map.set(mo, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-months);
}

export function monthlyForMember(member, months = 12) {
  const map = new Map();
  for (const t of member.trades) {
    const mo = String(t.tradedAt || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mo)) continue;
    const row = map.get(mo) || { month: mo, buys: 0, sells: 0 };
    if (t.side === 'purchase') row.buys += 1;
    else if (t.side === 'sale') row.sells += 1;
    map.set(mo, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-months);
}

/** Jaccard overlap of traded tickers. Two or more shared names to count. */
export function similarTraders(member, members, k = 5) {
  return members
    .filter((o) => o.key !== member.key && o.tickerSet.size)
    .map((o) => {
      const shared = [...member.tickerSet].filter((x) => o.tickerSet.has(x));
      const union = new Set([...member.tickerSet, ...o.tickerSet]).size;
      return { member: o, shared, score: union ? shared.length / union : 0 };
    })
    .filter((r) => r.shared.length >= 2)
    .sort((a, b) => b.score - a.score || b.shared.length - a.shared.length)
    .slice(0, k);
}

/** The member's traded tickers that are top federal contractors, biggest first. */
export function contractorTrades(member, byTicker) {
  if (!byTicker) return [];
  return member.tickers
    .filter(({ ticker }) => byTicker[ticker])
    .map(({ ticker, n }) => ({ ticker, n, ...byTicker[ticker] }))
    .sort((a, b) => b.total - a.total);
}

export function usdShort(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '·';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/* ── P3 Portrait gallery additions. Pure, tested in
      scripts/check-politician-tracker.mjs. ────────────────────────────── */

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
const desc = (k) => (a, b) => (b[k] || 0) - (a[k] || 0);
const descStr = (k) => (a, b) => String(b[k] || '').localeCompare(String(a[k] || ''));

export const SORT_KEYS = ['volume', 'trades', 'latest'];

/**
 * Rank members for the active sort. Rank follows the sort; pctOfFirst is the
 * ratio of this member's volume to the first-ranked member's volume as a
 * whole percent, null when the first has no volume. It is a ratio of two
 * midpoint sums, nothing more.
 */
export function rankMembers(members, sortKey = 'volume') {
  const key = SORT_KEYS.includes(sortKey) ? sortKey : 'volume';
  const order =
    key === 'trades'
      ? [desc('count'), desc('volume'), byName]
      : key === 'latest'
        ? [descStr('lastTraded'), desc('volume'), byName]
        : [desc('volume'), desc('count'), byName];
  const sorted = [...members].sort((a, b) => {
    for (const cmp of order) {
      const r = cmp(a, b);
      if (r) return r;
    }
    return 0;
  });
  const first = sorted[0]?.volume || 0;
  return sorted.map((m, i) => ({
    ...m,
    rank: i + 1,
    pctOfFirst: first > 0 ? Math.round(((m.volume || 0) / first) * 100) : null,
  }));
}

/** The date range and size of what is loaded. Null when nothing is. */
export function loadedWindow(trades) {
  let from = null;
  let to = null;
  let count = 0;
  for (const t of trades) {
    const d = String(t.tradedAt || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    count += 1;
    if (!from || d < from) from = d;
    if (!to || d > to) to = d;
  }
  return count ? { from, to, count } : null;
}

/**
 * Filter predicate for the toolbar. `chamber` is 'House' | 'Senate' | null,
 * `party` is 'D' | 'R' | 'I' | null, `side` narrows to members with at least
 * one trade of that side, `query` is a case-insensitive substring on the
 * name, state and district.
 */
export function filterMembers(
  members,
  { chamber = null, party = null, side = null, query = '' } = {},
) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  return members.filter((m) => {
    if (chamber && m.chamber !== chamber) return false;
    if (party && m.party !== party) return false;
    if (side && !m.trades.some((t) => t.side === side)) return false;
    if (q) {
      const hay = `${m.name} ${m.state || ''} ${m.district || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Most traded tickers across a set of trades; rows with no ticker are skipped. */
export function topTickers(trades, n = 5) {
  const counts = new Map();
  for (const t of trades) if (t.ticker) counts.set(t.ticker, (counts.get(t.ticker) || 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([ticker, count]) => ({ ticker, count }));
}

/** `CA-12` for a House member with a district, else the state, else null. */
export function seatLabel(m) {
  if (m.chamber === 'House' && m.state && m.district != null && m.district !== '') {
    return `${m.state}-${String(m.district).padStart(2, '0')}`;
  }
  return m.state || null;
}

/** Trades belonging to a set of members, for the rail's counts and chart. */
export function tradesOf(members) {
  return members.flatMap((m) => m.trades);
}

/* ── Server aggregates (/api/politicians/summary). ─────────────────────── */

/**
 * Members from the server's politician_rankings rows, which cover the whole
 * trailing window (the browser only loads the newest disclosures). Each row
 * keeps the aggregates from SQL; a member whose trades are loaded also keeps
 * them (the panel, ticker counts and similar traders read those). A member
 * with none loaded gets an empty `trades` list and its top tickers from SQL;
 * the page fetches its trades when the panel opens. Slugs stay unique and
 * a loaded member keeps its existing slug, so ?member= URLs resolve.
 */
export function mergeServerRankings(localMembers, rankings) {
  const byId = new Map();
  const slugs = new Set();
  for (const m of localMembers) {
    if (m.bioguideId) byId.set(m.bioguideId, m);
    slugs.add(m.slug);
  }
  const out = [];
  for (const r of rankings || []) {
    const local = r.bioguideId ? byId.get(r.bioguideId) : null;
    const agg = {
      count: r.count,
      buys: r.buys,
      sells: r.sells,
      volume: r.volume,
      lastTraded: r.lastTraded,
      photoUrl: r.photoUrl || local?.photoUrl || null,
      party: r.party || local?.party || null,
      district: r.district ?? local?.district ?? null,
    };
    if (local) {
      out.push({ ...local, ...agg });
      continue;
    }
    let slug = slugify(r.name);
    if (slugs.has(slug)) slug = `${slug}-${String(r.bioguideId || out.length).toLowerCase()}`;
    slugs.add(slug);
    const tickers = (r.topTickers || []).map((ticker) => ({ ticker, n: null }));
    out.push({
      key: r.bioguideId || `${r.chamber}:${norm(r.name)}`,
      slug,
      name: r.name,
      chamber: r.chamber,
      state: r.state,
      bioguideId: r.bioguideId,
      trades: [],
      tickers,
      tickerSet: new Set(tickers.map((t) => t.ticker)),
      ...agg,
    });
  }
  return out;
}

/** The window the server aggregates cover. */
export function serverWindow(rankings, windowDays, now = new Date()) {
  const count = (rankings || []).reduce((s, r) => s + (r.count || 0), 0);
  if (!count) return null;
  const from = new Date(now.getTime() - windowDays * 86400000).toISOString().slice(0, 10);
  const to = (rankings || []).reduce(
    (mx, r) => (r.lastTraded && r.lastTraded > mx ? r.lastTraded : mx),
    '',
  );
  return { from, to: to || now.toISOString().slice(0, 10), count };
}
