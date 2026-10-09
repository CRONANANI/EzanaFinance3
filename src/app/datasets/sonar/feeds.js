/**
 * The four live feeds behind the ticker and the Arrivals rail: congressional
 * trades, contract awards, prediction-market odds and lobbying filings. The
 * same routes the old overview ticker read.
 *
 * Never faked: a source that returns nothing (no key, an outage, an empty
 * day) is left out and named in `omitted`; nothing stands in for it.
 */
import { interleaveArrivals, plain, compactUsd, MIDDOT } from './derive';

export const PER_SOURCE = 4;

async function getJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Polymarket outcomePrices are implied probabilities in [0, 1], best first. */
export function marketOutcomes(m) {
  const names = parseList(m?.outcomes);
  const prices = parseList(m?.outcomePrices);
  const out = [];
  for (let i = 0; i < Math.max(names.length, prices.length); i++) {
    const prob = Number(prices[i]);
    if (!Number.isFinite(prob)) continue;
    out.push({ name: names[i] || (i === 0 ? 'Yes' : 'No'), prob });
  }
  return out.sort((a, b) => b.prob - a.prob);
}

/* A display date ("Oct 3, 2026") or ISO date, as YYYY-MM-DD; null if neither. */
function isoDay(v) {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

const realText = (v) => {
  const s = plain(v).replace(/^[,\s]+|[,\s]+$/g, '');
  return s && s !== MIDDOT ? s : null;
};

function congressItems(json) {
  const rows = Array.isArray(json?.trades) ? json.trades : [];
  return rows
    .filter((t) => t?.name && t?.symbol)
    .map((t, i) => {
      const range = realText(String(t.amount || '').replace(/^[+-]/, ''));
      const verb = t.positive ? 'bought' : 'sold';
      return {
        id: `congress-${i}-${t.symbol}`,
        kind: 'CONGRESS',
        headline: `${t.name} ${verb} ${t.symbol}`,
        sourceLine: [range && !/^(Buy|Sell)$/.test(range) ? range : null, 'Politician Tracker']
          .filter(Boolean)
          .join(' · '),
        href: '/datasets/politician-tracker',
        at: isoDay(t.disclosureDate),
        ticker: {
          lead: 'CONGRESS',
          main: `${t.name} · ${t.symbol}`,
          value: `${t.positive ? 'Buy' : 'Sell'}${range && !/^(Buy|Sell)$/.test(range) ? `, ${range}` : ''}`,
        },
      };
    });
}

function contractItems(json) {
  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return rows
    .filter((r) => realText(r?.recipient))
    .map((r, i) => {
      const agency = realText(r.agency);
      const amount = realText(r.amount);
      return {
        id: `contract-${r.id || i}`,
        kind: 'CONTRACT',
        headline: `${realText(r.recipient)}${amount ? ` won ${amount}` : ''}`,
        sourceLine: [agency, 'Government Contracts'].filter(Boolean).join(' · '),
        href: '/datasets/government/contracts',
        at: isoDay(r.date),
        ticker: {
          lead: 'CONTRACT',
          main: [realText(r.recipient), agency].filter(Boolean).join(' · '),
          value: amount,
        },
      };
    });
}

function oddsItems(json) {
  const rows = Array.isArray(json) ? json : Array.isArray(json?.markets) ? json.markets : [];
  const out = [];
  for (const m of rows) {
    const outs = marketOutcomes(m);
    const q = realText(m?.question);
    if (!q || !outs.length || !m?.slug) continue;
    const top = outs[0];
    const cents = Math.round(top.prob * 100);
    out.push({
      id: `odds-${m.slug}`,
      kind: 'ODDS',
      headline: `${q} ${top.name} ${cents}¢`,
      sourceLine: 'Polymarket · opens the odds card',
      odds: {
        slug: m.slug,
        question: q,
        outcome: top.name,
        prob: top.prob,
        endDate: m.endDate || null,
      },
      at: null,
      ticker: { lead: 'ODDS', main: `${q.slice(0, 48)} · ${top.name}`, value: `${cents}¢` },
    });
  }
  return out;
}

function lobbyingItems(json) {
  const rows = Array.isArray(json) ? json : parseList(json?.data);
  return rows
    .filter((r) => realText(r?.Client || r?.client))
    .map((r, i) => {
      const client = realText(r.Client || r.client);
      const amount = compactUsd(r.Amount ?? r.amount);
      const tick = realText(r.Ticker || r.ticker);
      return {
        id: `lobbying-${i}-${client}`,
        kind: 'LOBBYING',
        headline: `${client} filed a lobbying report`,
        sourceLine: [amount, 'Lobbying Activity'].filter(Boolean).join(' · '),
        href: '/datasets/government/lobbying',
        at: isoDay(r.Date || r.date),
        ticker: {
          lead: 'LOBBYING',
          main: `${client}${tick ? ` · ${tick}` : ''}`,
          value: amount,
        },
      };
    });
}

/** { items, omitted }: interleaved, at most PER_SOURCE from each source. */
export async function loadArrivals() {
  const [congress, contracts, odds, lobbying] = await Promise.all([
    getJson('/api/fmp/congress-latest'),
    getJson('/api/usaspending/contract-awards?limit=8'),
    getJson('/api/polymarket/markets?limit=12&active=true'),
    getJson('/api/quiver/lobbying'),
  ]);
  const sources = [
    { name: 'Congress trading', items: congressItems(congress) },
    { name: 'Government contracts', items: contractItems(contracts) },
    { name: 'Prediction markets', items: oddsItems(odds) },
    { name: 'Lobbying activity', items: lobbyingItems(lobbying) },
  ];
  const failed = [congress, contracts, odds, lobbying].every((x) => x == null);
  return { ...interleaveArrivals(sources, PER_SOURCE), failed };
}
