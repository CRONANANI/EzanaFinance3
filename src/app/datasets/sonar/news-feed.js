/**
 * Real notifications for the floating cards around the orbital map.
 *
 * Two live feeds for now, both Capitol Watch datasets: the newest STOCK Act
 * disclosures (Politician Tracker) and the newest federal contract awards
 * (Government Contracts). This module is a pure mapper: it takes the rows
 * readOrbitalFeed() returned and turns them into one-line cards. The
 * dimension's colour still comes from DATASET_TAXONOMY. Nothing is invented:
 * a row missing the fields a headline needs is dropped, and with no rows the
 * rails simply stay empty. More dimensions are added by adding a feed here.
 */
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';

const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;
const VERB = { purchase: 'buys', sale: 'sells', exchange: 'exchanges' };
const HONORIFIC = { House: 'Rep.', Senate: 'Sen.' };

/* Card date, e.g. "Oct 9". UTC so the server and client agree. */
function shortDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function lastName(full) {
  const parts = String(full || '')
    .replace(/,.*$/, '')
    .trim()
    .split(/\s+/)
    .filter((p) => !SUFFIX.test(p));
  return parts.length ? parts[parts.length - 1] : null;
}

/* $1.2B, $340M, $85K. */
function compactUsd(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  const fmt = (x) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10);
  if (v >= 1e9) return `$${fmt(v / 1e9)}B`;
  if (v >= 1e6) return `$${fmt(v / 1e6)}M`;
  if (v >= 1e3) return `$${fmt(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

/* The disclosed range, compact: "$1M - $5M", "$50K +". */
function bandShort(band) {
  if (!band) return null;
  const lo = compactUsd(band.min);
  const hi = compactUsd(band.max);
  if (lo && hi && lo !== hi) return `${lo} - ${hi}`;
  if (lo && !hi) return `${lo} +`;
  return hi || lo || null;
}

const SMALL = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'on', 'a', 'an']);
const ENTITY_TAIL =
  /[,.]?\s+(incorporated|inc|corporation|corp|company|co|llc|l\.l\.c|ltd|lp|plc|holdings|group)\.?$/i;

/* "LOCKHEED MARTIN CORPORATION" -> "Lockheed Martin". */
function recipientName(raw) {
  let s = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3 && ENTITY_TAIL.test(s); i += 1) s = s.replace(ENTITY_TAIL, '');
  if (!s) return null;
  return s
    .split(' ')
    .map((w, i) => {
      const lower = w.toLowerCase();
      /* The feed is ALL CAPS, so only short tokens read as acronyms: BAE, IBM, AT&T. */
      if (/^[A-Z0-9&.]{2,4}$/.test(w) && (w.length <= 3 || /[&.\d]/.test(w)) && !SMALL.has(lower)) {
        return w;
      }
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/* "Department of Defense" -> "Defense"; "Department of the Navy" -> "Navy". */
function agencyName(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  return s.replace(/^(u\.?s\.?\s+)?department of (the )?/i, '').trim() || s;
}

function tradeCards(trades, base) {
  const seen = new Set();
  const out = [];
  for (const t of trades || []) {
    const name = lastName(t.name);
    const verb = VERB[t.side];
    if (!name || !verb || !t.ticker) continue;
    const key = `${t.bioguideId}:${t.ticker}:${t.side}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const who = HONORIFIC[t.chamber] ? `${HONORIFIC[t.chamber]} ${name}` : name;
    out.push({
      ...base,
      key: `t:${t.id}`,
      headline: `${who} ${verb} ${t.ticker}`,
      meta: bandShort(t.amountBand) || shortDate(t.filedAt || t.tradedAt),
    });
  }
  return out;
}

function awardCards(awards, base) {
  const out = [];
  for (const a of awards || []) {
    const who = recipientName(a.parent || a.recipient);
    const amt = compactUsd(a.amount);
    if (!who || !amt) continue;
    const agency = agencyName(a.agency);
    out.push({
      ...base,
      key: `c:${a.id}`,
      headline: `${who} wins ${amt}`,
      meta: agency || shortDate(a.date),
    });
  }
  return out;
}

/**
 * The items the ticker cycles through, alternating feeds so consecutive
 * cards differ: a trade, an award, a trade, and so on.
 * @param {{ trades?: object[], awards?: object[] }} feed
 */
export function buildNewsItems(feed = {}, taxonomy = DATASET_TAXONOMY) {
  const capitol = taxonomy.find((d) => d.id === 'capitol');
  /* A card shows its dimension's icon only; the name is kept for screen
     readers. Both feeds today belong to Capitol Watch. */
  const base = {
    dimensionId: 'capitol',
    dimension: capitol?.label || 'Capitol Watch',
    icon: capitol?.biIcon || 'bi-bank',
    color: capitol?.color || 'var(--emerald)',
  };
  const a = tradeCards(feed.trades, base);
  const b = awardCards(feed.awards, base);
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}
