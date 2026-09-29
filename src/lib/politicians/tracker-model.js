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
        trades: [],
      });
    }
    map.get(key).trades.push(t);
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
