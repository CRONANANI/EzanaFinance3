/**
 * Range measurement for the home comparison chart.
 *
 * Every line on that chart is a percent change from the same anchor (the
 * left edge of the selected range). To compare a window the user dragged
 * inside the range, each line is rebased to the window's first point:
 *
 *   window return = (1 + end / 100) / (1 + start / 100) - 1
 *
 * A plain subtraction (end - start) would be wrong: it reports percentage
 * points of the original anchor, not the return over the window.
 *
 * Pure: no React, no DOM, so it is covered by scripts/check-home-range-measure.mjs.
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Return over a window, in percent, from two percent-from-anchor readings. */
export function windowReturn(startPct, endPct) {
  if (!isNum(startPct) || !isNum(endPct)) return null;
  const base = 1 + startPct / 100;
  /* A line that lost everything has no base to measure from. */
  if (base <= 0) return null;
  return ((1 + endPct / 100) / base - 1) * 100;
}

/**
 * Measure every visible line over the rows between two indices (inclusive,
 * in either order).
 *
 * rows    chart rows, each with `at` and one percent reading per series key
 * series  [{ key, label, color }], in display order. The first is the lead:
 *         the line the others are compared with.
 *
 * A line can be missing at an edge (an index has no reading for that row).
 * It is then measured from its first reading inside the window to its last,
 * and needs two different rows to count; otherwise its return is null and
 * the UI says so instead of showing a made-up number.
 */
export function measureWindow(rows, indexA, indexB, series) {
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(series)) return null;
  if (!Number.isInteger(indexA) || !Number.isInteger(indexB)) return null;
  const startIndex = Math.max(0, Math.min(indexA, indexB));
  const endIndex = Math.min(rows.length - 1, Math.max(indexA, indexB));
  if (endIndex <= startIndex) return null;

  const measured = series.map((s) => {
    let first = -1;
    let last = -1;
    for (let i = startIndex; i <= endIndex; i += 1) {
      if (isNum(rows[i]?.[s.key])) {
        if (first < 0) first = i;
        last = i;
      }
    }
    const pct =
      first >= 0 && last > first ? windowReturn(rows[first][s.key], rows[last][s.key]) : null;
    return { key: s.key, label: s.label, color: s.color, pct };
  });

  const lead = measured[0] ?? null;
  return {
    startIndex,
    endIndex,
    from: rows[startIndex].at,
    to: rows[endIndex].at,
    lead,
    series: measured.map((m, i) => ({
      ...m,
      /* Percentage points ahead of (or behind) the lead over the same window. */
      vsLead: i > 0 && isNum(m.pct) && isNum(lead?.pct) ? m.pct - lead.pct : null,
    })),
  };
}

/** "+4.21%", "-0.30%", or "n/a" when there is nothing to report. */
export function formatSignedPct(value, digits = 2) {
  if (!isNum(value)) return 'n/a';
  const rounded = Number(value.toFixed(digits));
  /* Avoid "-0.00%". */
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return `${safe >= 0 ? '+' : ''}${safe.toFixed(digits)}%`;
}

/** "+1.20 pts", for the gap between two returns. */
export function formatPoints(value, digits = 2) {
  if (!isNum(value)) return '';
  const rounded = Number(value.toFixed(digits));
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return `${safe >= 0 ? '+' : ''}${safe.toFixed(digits)} pts`;
}
