/**
 * Whale Score — how much a 13F position change or a 13D/13G filing represents a
 * genuine conviction bet, rather than index-like rebalancing by a giant fund.
 *
 * Pure function of fields available from sec_13f_holdings / sec_activist_positions
 * and a fund's prior-quarter holdings. No external calls, no DB access — the
 * ingest/compute cron owns all I/O and calls this. Deterministic and unit-testable
 * (see scripts/check-whale-score.mjs).
 *
 * Returns { score: 0..100, tier, factors } so the UI can explain WHY something
 * scored high, not just show a number.
 */

// ── Gate: below this, it isn't a whale move regardless of other factors. ──
export const MIN_POSITION_USD = 100_000_000; // $100M
export const MIN_ACTIVIST_PCT = 5; // 13D/13G legal threshold

/**
 * The product opinion, in one place so it can be tuned without touching logic.
 * Institutional factors sum to 100: conviction is weighted highest (it's the
 * best "is this a bet" signal) and absolute size lowest by design — that's what
 * stops the page from just listing the biggest funds every quarter.
 */
export const WEIGHTS = {
  institutional: { conviction: 40, newness: 30, concentration: 20, size: 10 },
  activist: { form13D: 45, form13G: 25, stake: 35, escalation: 20 },
};

/**
 * Newness points per change type, expressed on the newness weight's own scale
 * (max = 30). Scaled by WEIGHTS.institutional.newness so retuning the weight
 * moves them together. Exits score high (22): a giant fund fully closing a
 * $100M+ name is a signal most trackers miss because they only show buys.
 */
export const NEWNESS_POINTS = {
  new: 30,
  doubled: 26,
  exited: 22,
  added: 16,
  trimmed: 8,
  flat: 0,
};
const NEWNESS_MAX = 30;

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * @param move {
 *   kind: 'institutional' | 'activist',
 *   valueUsd, sharesNow, sharesPrior,            // institutional
 *   fundTotalUsd, fundPositionCount,             // institutional context
 *   percentOfClass, priorPercentOfClass, form,   // activist ('SC 13D'|'SC 13G')
 * }
 */
export function whaleScore(move) {
  if (move.kind === 'activist') return activistScore(move);
  return institutionalScore(move);
}

function institutionalScore(m) {
  const W = WEIGHTS.institutional;

  // Gate. For an EXIT the caller passes the PRIOR position size as valueUsd (the
  // size of the name being closed), since the current value is 0 — otherwise a
  // fund fully exiting a $100M+ position would be gated out and never surface.
  if (!m.valueUsd || m.valueUsd < MIN_POSITION_USD) {
    return { score: 0, tier: null, factors: { belowGate: true } };
  }

  // 1. Conviction: position as a share of the fund's OWN portfolio. The single
  //    best "is this a bet" signal — normalizes away fund size. 15% of a book is
  //    a whale move; the same dollars at 0.3% is rebalancing.
  const convictionPct = m.fundTotalUsd ? (m.valueUsd / m.fundTotalUsd) * 100 : 0;
  const convictionScore = clamp01(convictionPct / 10) * W.conviction; // 10%+ of book → full weight

  // 2. Newness: new position > big add > small add > trim. Diffed vs prior qtr.
  const changeType = classifyChange(m.sharesNow, m.sharesPrior);
  const newnessScore = ((NEWNESS_POINTS[changeType] ?? 0) / NEWNESS_MAX) * W.newness;

  // 3. Filer concentration: a 25-name fund making a bet means more than a
  //    3,000-name index fund. Fewer positions → higher weight.
  const concScore = m.fundPositionCount
    ? clamp01((200 - m.fundPositionCount) / 200) * W.concentration // <=200 names scales up
    : W.concentration / 2;

  // 4. Absolute size, lightly — above the gate, bigger is marginally stronger,
  //    but capped so it can't dominate. The LEAST weighted factor by design.
  const sizeScore = clamp01(Math.log10(m.valueUsd / MIN_POSITION_USD) / 2) * W.size;

  const score = Math.round(convictionScore + newnessScore + concScore + sizeScore);
  return {
    score: Math.min(score, 100),
    tier: tierFor(changeType, convictionPct),
    factors: {
      convictionPct,
      changeType,
      fundPositionCount: m.fundPositionCount,
      convictionScore,
      newnessScore,
      concScore,
      sizeScore,
    },
  };
}

function activistScore(m) {
  const W = WEIGHTS.activist;
  if (!m.percentOfClass || m.percentOfClass < MIN_ACTIVIST_PCT) {
    return { score: 0, tier: null, factors: { belowGate: true } };
  }
  // 13D (intent to influence) is a stronger signal than 13G (passive).
  const formScore = m.form === 'SC 13D' ? W.form13D : W.form13G;
  // Higher stake = stronger. 5% floor, 25%+ is dominant.
  const stakeScore = clamp01((m.percentOfClass - 5) / 20) * W.stake;
  // Escalation: stake grew since last filing.
  const escalation =
    m.priorPercentOfClass != null && m.percentOfClass > m.priorPercentOfClass ? W.escalation : 0;

  const score = Math.round(formScore + stakeScore + escalation);
  return {
    score: Math.min(score, 100),
    tier: m.form === 'SC 13D' ? 'Activist stake' : 'Quiet accumulation',
    factors: { form: m.form, percentOfClass: m.percentOfClass, escalated: escalation > 0 },
  };
}

export function classifyChange(now, prior) {
  const n = Number(now) || 0;
  const p = Number(prior) || 0;
  if (p === 0 && n > 0) return 'new';
  if (n === 0 && p > 0) return 'exited';
  if (p > 0 && n >= p * 2) return 'doubled';
  if (n > p) return 'added';
  if (n < p) return 'trimmed';
  return 'flat';
}

function tierFor(changeType, convictionPct) {
  if (changeType === 'new' && convictionPct >= 5) return 'Fresh conviction';
  if (changeType === 'doubled') return 'Doubling down';
  if (changeType === 'exited') return 'Heading for the exit';
  if (changeType === 'new') return 'New position';
  if (changeType === 'added') return 'Adding';
  if (changeType === 'trimmed') return 'Trimming';
  return 'Holding';
}
