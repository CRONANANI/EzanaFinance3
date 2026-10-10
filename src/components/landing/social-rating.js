/**
 * Social investing rating panel: the tier bands and the pure tier maths.
 *
 * Import-free, so scripts/check-social-rating.mjs can test it directly.
 *
 * The bands are the platform's real ELO tiers (lib/elo.js ELO_TIERS, cap
 * ELO_CAP). They are copied here, not imported, because lib/elo.js pulls in the
 * server Supabase client and this file ships to the browser. The check script
 * fails if the two ever disagree, so the landing demo can never show a ladder
 * the product does not use.
 */

export const LADDER_TIERS = [
  { id: 'novice', name: 'Novice', min: 0 },
  { id: 'apprentice', name: 'Apprentice', min: 1000 },
  { id: 'strategist', name: 'Strategist', min: 2500 },
  { id: 'tactician', name: 'Tactician', min: 5000 },
  { id: 'master', name: 'Master', min: 7000 },
  { id: 'grandmaster', name: 'Grandmaster', min: 8500 },
];

/**
 * Where a rating sits on the ladder. Everything the panel shows comes from
 * here; nothing is stored or typed in.
 *   current  the last tier whose min <= rating
 *   next     the tier after it, or null at the top
 *   pct      progress from current.min to next.min, 0 to 100, rounded
 *   toGo     next.min - rating, or 0 at the top
 */
export function deriveTierState(rating, tiers = LADDER_TIERS) {
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  const r = Number.isFinite(rating) ? rating : 0;
  let currentIndex = 0;
  sorted.forEach((t, i) => {
    if (t.min <= r) currentIndex = i;
  });
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1] ?? null;
  const pct = next
    ? Math.round(Math.min(100, Math.max(0, ((r - current.min) / (next.min - current.min)) * 100)))
    : 100;
  const toGo = next ? Math.max(0, next.min - r) : 0;
  return { sorted, current, next, pct, toGo, currentIndex };
}

/** 'locked' | 'next' | 'current' | 'completed' for a tier at index i. */
export function tierRowState(i, currentIndex) {
  if (i === currentIndex) return 'current';
  if (i === currentIndex + 1) return 'next';
  return i < currentIndex ? 'completed' : 'locked';
}
