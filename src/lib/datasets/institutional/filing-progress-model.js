/**
 * The canonical 13F filing-progress definition, pure (no imports beyond the
 * pure quarter helpers), unit tested in scripts/check-filing-progress.mjs.
 *
 *   period    the most recent quarter-end (its window is open, or closed
 *             since its deadline)
 *   filed     distinct filer CIKs with an original 13F-HR for `period`, plus
 *             CIKs whose only filing for it is an amendment; 13F-NT excluded
 *   expected  distinct filer CIKs with an original 13F-HR for the PRIOR
 *             period: the best available estimate of how many will file
 *   pct       filed / expected (the bar caps at 100%; the raw value stays)
 *   pacingPct the prior period's filers by the same day offset / expected;
 *             null when the prior period's records start after that offset,
 *             because then "last quarter at this point" is unknowable
 *   deadline  nominal day 45 and the effective next-business-day deadline
 */
import { filingDeadline, dayOffset } from '@/lib/sec/quarters';

const DAY = 86400000;
const isNT = (form) => /NT/i.test(String(form || ''));
const isAmendment = (form) => /\/A$/i.test(String(form || '').trim());
const dateOnly = (v) => String(v || '').slice(0, 10);

/** Distinct CIKs counted as having filed (originals, plus amendment-only CIKs). */
export function filedCiks(rows) {
  const originals = new Set();
  const amended = new Set();
  for (const r of rows || []) {
    if (!r?.cik || isNT(r.form_type)) continue;
    if (isAmendment(r.form_type)) amended.add(r.cik);
    else originals.add(r.cik);
  }
  for (const cik of amended) originals.add(cik);
  return originals;
}

/** Distinct CIKs with an ORIGINAL 13F-HR, each with its first filing date. */
export function originalFirstFiled(rows) {
  const first = new Map();
  for (const r of rows || []) {
    if (!r?.cik || isNT(r.form_type) || isAmendment(r.form_type)) continue;
    const d = dateOnly(r.filed_at);
    if (!d) continue;
    if (!first.has(r.cik) || d < first.get(r.cik)) first.set(r.cik, d);
  }
  return first;
}

export function computeFilingProgress({
  period,
  prior,
  now = new Date(),
  curRows = [],
  priorRows = [],
  counts = null, // { filed, expected, priorFiledByOffset, priorCoverageStart } from SQL
  lastIngestedAt = null,
}) {
  const today = dateOnly(now instanceof Date ? now.toISOString() : now);
  const offset = dayOffset(period, today);
  const { nominal, effective } = filingDeadline(period);

  let filed;
  let expected;
  let priorFiledByOffset;
  let priorCoverageStart;
  if (counts) {
    ({ filed, expected, priorFiledByOffset, priorCoverageStart } = counts);
  } else {
    filed = filedCiks(curRows).size;
    const firsts = originalFirstFiled(priorRows);
    expected = firsts.size;
    const cutoff = new Date(Date.parse(`${prior}T00:00:00Z`) + offset * DAY)
      .toISOString()
      .slice(0, 10);
    priorFiledByOffset = [...firsts.values()].filter((d) => d <= cutoff).length;
    priorCoverageStart = [...firsts.values()].sort()[0] || null;
  }

  const priorCutoff = new Date(Date.parse(`${prior}T00:00:00Z`) + offset * DAY)
    .toISOString()
    .slice(0, 10);
  /* Records for the prior period that begin AFTER the same day offset mean
     the ingest was not running yet then: pacing is unknowable, not zero. */
  const pacingKnown = Boolean(expected) && priorCoverageStart && priorCoverageStart <= priorCutoff;

  const pct = expected ? filed / expected : null;
  const pacingPct = pacingKnown ? priorFiledByOffset / expected : null;
  const daysLeft = Math.max(
    0,
    Math.round((Date.parse(`${effective}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY),
  );
  const closed = today > effective;
  const ingestAgeHours = lastIngestedAt
    ? (Date.parse(now instanceof Date ? now.toISOString() : now) - Date.parse(lastIngestedAt)) /
      3600000
    : null;

  return {
    period,
    prior,
    deadline: effective,
    deadlineNominal: nominal,
    daysLeft,
    dayOffset: offset,
    closed,
    filed,
    expected,
    pct,
    barPct: pct == null ? 0 : Math.min(1, pct),
    pacingPct,
    pacing:
      pct == null || pacingPct == null
        ? null
        : pct >= pacingPct * 1.05
          ? 'ahead'
          : pct >= pacingPct * 0.95
            ? 'on_pace'
            : 'behind',
    priorCoverageStart: priorCoverageStart || null,
    lastIngestedAt,
    stale: !closed && ingestAgeHours != null && ingestAgeHours > 24,
  };
}
