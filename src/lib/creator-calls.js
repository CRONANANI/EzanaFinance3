/**
 * Creator calls (prediction challenges) — shared status/direction config and
 * track-record math used by the API and the profile/community UI.
 */

export const CALL_STATUS = {
  open: { key: 'open', label: 'Open', color: '#38bdf8', soft: 'rgba(56,189,248,0.14)' },
  hit: { key: 'hit', label: 'Hit', color: '#10b981', soft: 'rgba(16,185,129,0.14)' },
  missed: { key: 'missed', label: 'Missed', color: '#ef4444', soft: 'rgba(239,68,68,0.14)' },
  void: { key: 'void', label: 'Void', color: '#9ca3af', soft: 'rgba(156,163,175,0.14)' },
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
  bullish: { key: 'bullish', label: 'Bullish', icon: 'bi-arrow-up-right', color: '#10b981' },
  bearish: { key: 'bearish', label: 'Bearish', icon: 'bi-arrow-down-right', color: '#ef4444' },
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
