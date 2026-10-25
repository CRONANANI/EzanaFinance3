/**
 * SQL LIKE without regular expressions (security assessment F-10).
 *
 * The old matcher compiled the user's pattern to a RegExp; a pattern such as
 * '%a%a%a%a%a%a%b' against a long string backtracks exponentially and blocks
 * the event loop for everyone on the instance (EzanaQL is open to guests).
 *
 * Here the pattern is split on '%' into literal segments ('_' matches any one
 * character). The first segment is anchored at the start, the last at the
 * end, and each middle one is matched at its leftmost position, which is
 * always correct for LIKE because '%' can absorb anything between. No
 * backtracking: the cost is O(text x pattern), and the caps below bound it.
 */

export const LIKE_MAX_PATTERN = 100;
export const LIKE_MAX_PERCENT = 4;

/** Collapse runs of '%' (a '%%' means the same as '%'). */
function collapse(p) {
  return p.replace(/%+/g, '%');
}

/** Error message when a pattern exceeds the caps, else null. */
export function likePatternProblem(pattern) {
  const p = collapse(String(pattern ?? ''));
  if (p.length > LIKE_MAX_PATTERN) {
    return `LIKE patterns are limited to ${LIKE_MAX_PATTERN} characters.`;
  }
  const percents = (p.match(/%/g) || []).length;
  if (percents > LIKE_MAX_PERCENT) {
    return `LIKE patterns may use at most ${LIKE_MAX_PERCENT} % wildcards.`;
  }
  return null;
}

function segEqualsAt(text, at, seg) {
  if (at + seg.length > text.length) return false;
  for (let k = 0; k < seg.length; k += 1) {
    const c = seg[k];
    if (c !== '_' && c !== text[at + k]) return false;
  }
  return true;
}

function findSeg(text, from, seg) {
  if (!seg.includes('_')) return text.indexOf(seg, from);
  const last = text.length - seg.length;
  for (let i = from; i <= last; i += 1) if (segEqualsAt(text, i, seg)) return i;
  return -1;
}

/**
 * Case-sensitive LIKE (callers lower-case both sides). Patterns over the caps
 * never match.
 */
export function likeMatch(text, pattern) {
  const t = String(text ?? '');
  const p = collapse(String(pattern ?? ''));
  if (likePatternProblem(p)) return false;
  const segs = p.split('%');
  if (segs.length === 1) return t.length === p.length && segEqualsAt(t, 0, p);

  const first = segs[0];
  const lastSeg = segs[segs.length - 1];
  if (first.length + lastSeg.length > t.length) return false;
  if (!segEqualsAt(t, 0, first)) return false;
  if (!segEqualsAt(t, t.length - lastSeg.length, lastSeg)) return false;

  let pos = first.length;
  const end = t.length - lastSeg.length;
  for (let s = 1; s < segs.length - 1; s += 1) {
    const seg = segs[s];
    if (!seg) continue;
    const at = findSeg(t.slice(0, end), pos, seg);
    if (at < 0) return false;
    pos = at + seg.length;
  }
  return pos <= end;
}
