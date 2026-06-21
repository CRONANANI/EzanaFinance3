/**
 * Creator calls (prediction challenges) — shared status/direction config and
 * track-record math used by the API and the profile/community UI.
 */

export const CALL_STATUS = {
  open: { key: 'open', label: 'Open', color: 'var(--info)', soft: 'var(--info-bg)' },
  hit: { key: 'hit', label: 'Hit', color: 'var(--positive)', soft: 'var(--positive-bg)' },
  missed: { key: 'missed', label: 'Missed', color: 'var(--negative)', soft: 'var(--negative-bg)' },
  void: { key: 'void', label: 'Void', color: 'var(--text-muted)', soft: 'var(--bg-tertiary)' },
};

export const CALL_STATUS_LIST = [
  CALL_STATUS.open,
  CALL_STATUS.hit,
  CALL_STATUS.missed,
  CALL_STATUS.void,
];

// Statuses a creator/admin may resolve an open call into.
export const RESOLVABLE_STATUSES = ['hit', 'missed', 'void'];

export const DIRECTIONS = {
  bullish: {
    key: 'bullish',
    label: 'Bullish',
    icon: 'bi-arrow-up-right',
    color: 'var(--positive)',
  },
  bearish: {
    key: 'bearish',
    label: 'Bearish',
    icon: 'bi-arrow-down-right',
    color: 'var(--negative)',
  },
};

export function getCallStatus(key) {
  return CALL_STATUS[key] || CALL_STATUS.open;
}

export function getDirection(key) {
  return DIRECTIONS[key] || DIRECTIONS.bullish;
}

/** Roll a list of calls into a track record summary. */
export function computeTrackRecord(calls = []) {
  const r = { total: calls.length, open: 0, hit: 0, missed: 0, void: 0 };
  for (const c of calls) {
    if (r[c.status] != null) r[c.status] += 1;
  }
  r.resolved = r.hit + r.missed;
  r.hitRate = r.resolved > 0 ? Math.round((r.hit / r.resolved) * 100) : null;
  return r;
}
