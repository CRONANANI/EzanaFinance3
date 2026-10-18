/* Formatting and shared lookups for the Campaign Finance Intelligence page. */

export const PARTIES = {
  D: { code: 'D', word: 'Democratic', person: 'Democrat', cls: 'is-dem' },
  R: { code: 'R', word: 'Republican', person: 'Republican', cls: 'is-rep' },
  I: { code: 'I', word: 'Independent', person: 'Independent', cls: 'is-ind' },
};
export const partyOf = (p) =>
  PARTIES[p] || { code: '?', word: 'Unknown', person: 'Unknown', cls: 'is-unk' };

export const CHAMBERS = { H: 'House', S: 'Senate' };

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** $1.67B, $134M, $42.6M, $8.6K, $950. Null when unknown. */
export function money(v, { sign = false } = {}) {
  if (!isNum(v)) return null;
  const neg = v < 0;
  const n = Math.abs(v);
  let s;
  if (n >= 1e9) s = `$${(n / 1e9).toFixed(n >= 1e10 ? 1 : 2)}B`;
  else if (n >= 1e6) s = `$${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  else if (n >= 1e3) s = `$${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  else s = `$${Math.round(n)}`;
  if (neg) return `-${s}`;
  return sign ? `+${s}` : s;
}

export const int = (v) => (isNum(v) ? Math.round(v).toLocaleString('en-US') : null);

export function pct(part, whole, digits = 0) {
  if (!isNum(part) || !isNum(whole) || whole <= 0) return null;
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

export const share = (part, whole) =>
  isNum(part) && isNum(whole) && whole > 0 ? part / whole : null;

/** "SEN CA" or "HOUSE CA-11" (at-large seats read "AL"). */
export function seatLabel(m) {
  if (!m?.state) return null;
  if (m.chamber === 'S') return `SEN ${m.state}`;
  if (m.chamber === 'H') {
    const d = m.district;
    const dist = d === 0 || d === '0' ? 'AL' : d != null ? String(d) : null;
    return dist ? `HOUSE ${m.state}-${dist}` : `HOUSE ${m.state}`;
  }
  return m.state;
}

/** "Senate · California" style long seat, for the drawer. */
export function seatLong(m) {
  const ch = CHAMBERS[m?.chamber] || null;
  if (!ch) return m?.state || null;
  if (m.chamber === 'H' && m.district != null) {
    const d = m.district === 0 || m.district === '0' ? 'AL' : m.district;
    return `${ch} · ${m.state}-${d}`;
  }
  return `${ch} · ${m.state}`;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-30" -> "Sep 30, 2026" (UTC, so a date never slips a day). */
export function longDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Sep 30" */
export function shortDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Sync timestamp in Eastern time, "3:37 PM ET". */
export function easternTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })} ET`;
}

export const cycleLabel = (c) => `${c - 1} to ${c}`;

export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
