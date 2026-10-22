/**
 * Committee Assignments page model: PURE calculation, no React, no fetch,
 * no formatting beyond the two shared honesty strings. Components render,
 * this file calculates. Design: docs/design/committees-handoff (06-DATA.md
 * section 3 is the contract). Tested by scripts/check-committees-page.mjs.
 *
 * Self-contained on purpose: node --test loads it directly, so it imports
 * nothing (the sector-note string is asserted against committee-sectors.js
 * in the test).
 */

/* ── shared honesty strings ──────────────────────────────────────────── */

/** The editorial sector note, one string for every surface that shows it. */
export function mappingNote() {
  return "Sector links are Ezana's reading of each committee's published jurisdiction.";
}

/** The disclosure-pattern footnote pinned on Cards 7, 8 and 10. */
export const TRADE_FOOTNOTE =
  'A trade in an overseen sector is a disclosure pattern, not evidence of wrongdoing.';

/** The matrix label and footnote (Card 8). */
export const HOLDINGS_LABEL = 'Holdings inferred from disclosures';
export const HOLDINGS_FOOTNOTE =
  'Open positions are inferred from disclosures (bought and not fully sold). A holding on an overseeing committee is a fact pattern, not a finding.';

/* ── seats ───────────────────────────────────────────────────────────── */

const nonNeg = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/**
 * Majority/minority split: counts as flex weights plus percent labels.
 * Null-safe; zero seats on either side stays an honest zero.
 */
export function seatSplit(majority, minority) {
  const maj = nonNeg(majority);
  const min = nonNeg(minority);
  const total = maj + min;
  const majorityPct = total ? Math.round((maj / total) * 100) : 0;
  return {
    majority: maj,
    minority: min,
    total,
    majorityPct,
    minorityPct: total ? 100 - majorityPct : 0,
  };
}

/** Atlas tile size class by seat count: lg at 55+, md at 35+, else sm. */
export function atlasSizeClass(seats) {
  const n = nonNeg(seats);
  if (n >= 55) return 'lg';
  if (n >= 35) return 'md';
  return 'sm';
}

/**
 * Seats-per-member histogram: buckets 1..9 and 10+, summing to the member
 * count. A listed member holds at least one seat, so counts clamp to 1.
 */
export function seatHistogram(members) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: i < 9 ? String(i + 1) : '10+',
    count: 0,
  }));
  for (const m of Array.isArray(members) ? members : []) {
    const seats = Math.max(1, nonNeg(m?.seatCount));
    buckets[Math.min(seats, 10) - 1].count += 1;
  }
  return buckets;
}

/** Top n members by seat count, ties broken by name. */
export function mostSeated(members, n = 5) {
  return (Array.isArray(members) ? members.slice() : [])
    .sort(
      (a, b) =>
        nonNeg(b?.seatCount) - nonNeg(a?.seatCount) ||
        String(a?.name || '').localeCompare(String(b?.name || '')),
    )
    .slice(0, Math.max(1, n));
}

/* ── oversight map ───────────────────────────────────────────────────── */

/**
 * Bipartite committee-to-sector graph from the committee list the index
 * route returns (each committee carries `sectors: [{ key, label }]`).
 * @returns {{ committees, sectors, links }} committees keep their input
 * order; sectors are ordered by committee count desc then label; links are
 * one row per (committee, sector) pair.
 */
export function oversightLinks(committees) {
  const list = (Array.isArray(committees) ? committees : []).filter(
    (c) => Array.isArray(c?.sectors) && c.sectors.length,
  );
  const sectorBy = new Map();
  const links = [];
  for (const c of list) {
    for (const s of c.sectors) {
      if (!s?.key) continue;
      if (!sectorBy.has(s.key))
        sectorBy.set(s.key, { key: s.key, label: s.label || s.key, committees: 0 });
      sectorBy.get(s.key).committees += 1;
      links.push({ committee: c.thomasId, sector: s.key });
    }
  }
  return {
    committees: list.map((c) => ({
      thomasId: c.thomasId,
      shortName: c.shortName || c.name || c.thomasId,
      chamber: c.chamber || null,
      sectorKeys: c.sectors.map((s) => s.key),
    })),
    sectors: [...sectorBy.values()].sort(
      (a, b) => b.committees - a.committees || a.label.localeCompare(b.label),
    ),
    links,
  };
}

/* ── matrix ──────────────────────────────────────────────────────────── */

/** Heat opacity for a matrix cell: 0.04 for zero, else 0.1 to 0.85 linear. */
export function heatScale(count, max) {
  const n = nonNeg(count);
  const m = nonNeg(max);
  if (!n || !m) return 0.04;
  return Math.min(0.85, 0.1 + (n / m) * 0.75);
}

/* ── trades ──────────────────────────────────────────────────────────── */

/** Normalise a disclosure row's side: buy, sell, or other. */
export function tradeSide(type) {
  const s = String(type || '').toLowerCase();
  if (s.startsWith('p') || s === 'buy') return 'buy';
  if (s.startsWith('s') || s === 'sell') return 'sell';
  return 'other';
}

/**
 * Card 7 summary over a window of rows. A row without a sector is an
 * unmapped ticker: counted quietly, never guessed into the mapped totals.
 * @returns {{ trades, buys, sells, members, unmapped }}
 */
export function tradeSummary(rows) {
  const out = { trades: 0, buys: 0, sells: 0, members: 0, unmapped: 0 };
  const people = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r) continue;
    if (!r.sector) {
      out.unmapped += 1;
      continue;
    }
    out.trades += 1;
    const side = tradeSide(r.side || r.type);
    if (side === 'buy') out.buys += 1;
    else if (side === 'sell') out.sells += 1;
    if (r.bioguideId) people.add(r.bioguideId);
  }
  out.members = people.size;
  return out;
}

/* Disclosure range buckets (PTR brackets) by their minimum, to dot size. */
const RANGE_STOPS = [
  1001, 15001, 50001, 100001, 250001, 500001, 1000001, 5000001, 25000001, 50000001,
];

/**
 * Lookup-timeline dot diameter from the disclosure range bucket: 5 to 14px.
 * Takes the bracket's minimum dollar figure; an unknown or missing range
 * gets the minimum size, never a guess.
 */
export function rangeDotSize(amountMin) {
  const n = Number(amountMin);
  if (!Number.isFinite(n) || n <= 0) return 5;
  let idx = -1;
  for (let i = 0; i < RANGE_STOPS.length; i += 1) if (n >= RANGE_STOPS[i]) idx = i;
  return idx < 0 ? 5 : 5 + idx;
}

const toMs = (v) => {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  return new Date(`${String(v).slice(0, 10)}T00:00:00Z`).getTime();
};

/**
 * X positions (0..1) for the 24-month trade timeline. Dates outside the
 * window clamp to its edges so a filer typo never breaks the layout.
 */
export function timelineLayout(trades, from, to) {
  const a = toMs(from);
  const b = toMs(to);
  const span = b - a;
  return (Array.isArray(trades) ? trades : []).map((t) => {
    const ms = toMs(t?.transaction_date ?? t?.date);
    const clamped = Number.isFinite(ms) ? Math.min(Math.max(ms, a), b) : a;
    return { ...t, x: span > 0 ? (clamped - a) / span : 0 };
  });
}

/* ── hearings ────────────────────────────────────────────────────────── */

/**
 * Card 9 gate: the populated layout is reachable only when rows actually
 * carry a date AND a committee. Today's 118 dateless rows keep this false.
 */
export function hearingsAvailable(rows) {
  if (!Array.isArray(rows)) return false;
  return rows.some((r) => {
    const date = r?.date || r?.event_date || r?.meeting_date;
    const committee = r?.committee || r?.committee_thomas_id || r?.committee_name;
    return Boolean(date && String(date).trim() && committee && String(committee).trim());
  });
}
