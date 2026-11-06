/**
 * Sonar time estimates and the deep research usage line, as people read
 * them (Nov 2026). Client-safe and pure: no imports, so the landing band
 * and the deep research card can load it without the classifier.
 *
 * The server (POST /api/sonar/estimate, lib/sonar/estimate.js) assembles the
 * usage numbers from the same ledger and entitlements the reservation uses;
 * deepState() turns them into the card's state and line on both sides, so
 * the card never disagrees with what a run would be charged.
 *
 * Unit-tested in scripts/check-sonar-estimate.mjs.
 */

/** The planned stages of an answer, in order (the progress panel). */
export const ANSWER_STAGES = [
  'Understanding your question',
  'Reading Ezana datasets',
  'Reading macro data',
  'Writing the brief',
];

export const RESETS_AT = 'midnight UTC';

/**
 * "about 10 to 20 seconds", "about 2 to 3 minutes". Seconds of 10 and more
 * round outwards to the nearest five; 90 seconds and more read in minutes
 * (the same rule as research-mode-core estimateLabel).
 */
export function durationLabel(minSec, maxSec) {
  const lo0 = Math.max(1, Math.round(Number(minSec) || 0));
  const hi0 = Math.max(lo0 + 1, Math.round(Number(maxSec) || 0));
  if (hi0 >= 90) {
    const lo = Math.max(1, Math.round(lo0 / 60));
    const hi = Math.max(lo + 1, Math.ceil(hi0 / 60));
    return `about ${lo} to ${hi} minutes`;
  }
  const lo = lo0 >= 10 ? Math.floor(lo0 / 5) * 5 : lo0;
  const hiR = hi0 >= 10 ? Math.ceil(hi0 / 5) * 5 : hi0;
  const hi = Math.max(lo + 1, hiR);
  return `about ${lo} to ${hi} seconds`;
}

/**
 * The stage an answer in progress shows after `elapsedSec`. The stages
 * advance on a schedule proportional to the estimate (stage i starts at
 * i/n of 95% of the expected time, the midpoint of min and max) and the last
 * one holds until the response lands: only phase 'ready' reports every stage
 * done. Never claims completion early.
 * @returns {{ index: number, done: number, label: string, complete: boolean }}
 */
export function answerStage(
  elapsedSec,
  estimate,
  { phase = 'sweeping', stages = ANSWER_STAGES } = {},
) {
  const n = stages.length;
  if (phase === 'ready') return { index: n - 1, done: n, label: 'Brief ready', complete: true };
  const min = Number(estimate?.minSec) || 10;
  const max = Number(estimate?.maxSec) || 20;
  const expected = Math.max(4, (min + max) / 2);
  const t = Math.max(0, Number(elapsedSec) || 0);
  let index = 0;
  for (let i = 0; i < n; i += 1) {
    if (t >= expected * 0.95 * (i / n)) index = i;
  }
  return { index, done: index, label: stages[index], complete: false };
}

const plural = (n, one, many) => (n === 1 ? one : many);

/**
 * The deep research card's state from the estimate's usage numbers.
 * `pingsSpent` is what the visitor has spent since the estimate was read
 * (1 once a standard answer has landed and been charged). The checks run in
 * the order the reservation runs them (reserve_sonar_ping_deep and
 * reserve_sonar_ping_org_deep), so a refusal here is the refusal the run
 * would get.
 *
 * @param {{ deep?: object }|null} estimate  the /api/sonar/estimate response
 * @returns {null | { available: boolean, blocked: null|'signup'|'quota'|'deep_quota'|'org_pool'|'org_allocation'|'disabled', line: string }}
 */
export function deepState(estimate, { pingsSpent = 0 } = {}) {
  const deep = estimate?.deep;
  if (!deep) return null;
  if (deep.blocked === 'disabled') return { available: false, blocked: 'disabled', line: '' };
  const u = deep.usage || {};
  const spent = Math.max(0, Number(pingsSpent) || 0);
  const left = (v) => (v == null ? null : Math.max(0, Number(v) - spent));
  const reset = `They reset at ${u.resetsAt || RESETS_AT}.`;

  if (u.guestNeedsAccount) {
    return {
      available: true,
      blocked: 'signup',
      line: 'Create a free account to run deep research.',
    };
  }
  const researchLeft = left(u.researchPingsLeftToday);
  if (u.isGuest) {
    if (researchLeft === 0) {
      return {
        available: false,
        blocked: 'quota',
        line: 'You have used your free pings. Create a free account to keep going.',
      };
    }
    return { available: true, blocked: null, line: 'Uses 1 of your free pings.' };
  }

  const org = u.orgPool;
  if (org) {
    if (researchLeft === 0) {
      return { available: false, blocked: 'quota', line: `You’ve used today’s pings. ${reset}` };
    }
    const when = org.resetsOn ? ` They reset on ${org.resetsOn}.` : '';
    if (org.total != null && org.used != null && org.used >= org.total) {
      return {
        available: false,
        blocked: 'org_pool',
        line: `Your fund has used this month’s ${org.total} deep research runs.${when}`,
      };
    }
    const a = org.allocation;
    if (a && a.total != null && a.used != null && a.used >= a.total) {
      return {
        available: false,
        blocked: 'org_allocation',
        line: `You’ve used your ${a.total} deep research ${plural(a.total, 'run', 'runs')} this month.${when}`,
      };
    }
    return {
      available: true,
      blocked: null,
      line: `Uses 1 ping and 1 of your fund’s ${org.total} deep research runs this month.`,
    };
  }

  const perDay = Number(u.deepRunsPerDay) || 0;
  const used = u.deepRunsUsedToday;
  if (perDay <= 0 || (used != null && used >= perDay)) {
    return {
      available: false,
      blocked: 'deep_quota',
      line: `You’ve used today’s deep research runs. ${reset}`,
    };
  }
  if (researchLeft === 0) {
    return { available: false, blocked: 'quota', line: `You’ve used today’s pings. ${reset}` };
  }
  return {
    available: true,
    blocked: null,
    line: `Uses 1 ping and 1 of your ${perDay} deep research ${plural(perDay, 'run', 'runs')} today. Resets at ${u.resetsAt || RESETS_AT}.`,
  };
}
