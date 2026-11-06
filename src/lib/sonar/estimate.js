/**
 * Sonar time and usage estimates (Nov 2026): what POST /api/sonar/estimate
 * answers before a ping runs. No model call, no reservation, no charge.
 *
 *   mode    what will run for this question: 'quick' or 'standard'
 *   answer  how long that answer takes
 *   deep    the deep research option: whether the classifier recommends
 *           it and why, how long it takes, and what it would use
 *
 * Times are the p50 and p90 of duration_ms for the same mode over the last
 * 7 days once there are 30 or more ledger samples; until then they come
 * from the plan (estimateFromPlan, and a small fallback for the landing
 * answer). Usage numbers are read by lib/sonar/estimate-server.js from the
 * same ledger and entitlements the reservation uses (quota.js,
 * entitlements.js, the org pool), and turned into the card's line by
 * deepState() (estimate-copy.js), which the browser runs too.
 *
 * Pure: no network, no database. Unit-tested in
 * scripts/check-sonar-estimate.mjs.
 */
import { estimateFromPlan, modeMeta, goDeeperFor } from '@/lib/sonar/research-mode-core';
import { durationLabel, deepState, RESETS_AT } from '@/lib/sonar/estimate-copy';
import { SONAR_QUERY_MAX } from '@/lib/sonar/limits';

export * from '@/lib/sonar/estimate-copy';

/** Samples needed before observed durations replace the plan. */
export const ESTIMATE_MIN_SAMPLES = 30;
/** How far back observed durations are read. */
export const ESTIMATE_WINDOW_DAYS = 7;

/** The landing answer before there are samples (about 10 to 20 s standard). */
export const ANSWER_FALLBACK = {
  quick: { minSec: 3, maxSec: 8 },
  standard: { minSec: 10, maxSec: 20 },
};

const env0 = () => (typeof process !== 'undefined' ? process.env : {});

/** A member's daily landing-ping cap (SONAR_MEMBER_DAILY_CAP, 25 by default). */
export function memberDailyPingCap(env = env0()) {
  return Math.max(1, Number(env?.SONAR_MEMBER_DAILY_CAP) || 25);
}

/** A guest's per-IP-hash daily cap behind the cookie (SONAR_GUEST_IP_DAILY_CAP). */
export function guestIpDailyCap(guestLimit = 5, env = env0()) {
  return Math.max(guestLimit, Number(env?.SONAR_GUEST_IP_DAILY_CAP) || 20);
}

/** The same cleaning the ping routes apply, so ledger text matches. */
export function cleanSonarQuery(raw) {
  return (
    String(raw || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** True when a cleaned query is too long for any Sonar route. */
export function tooLong(query) {
  return String(query || '').length > SONAR_QUERY_MAX;
}

/**
 * The mode a landing ping runs and is ledgered as: 'standard' unless the
 * research-mode classifier rated the question quick. A deep question that
 * the visitor declined runs the standard answer.
 */
export function landingRunMode(classification) {
  return classification?.mode === 'quick' ? 'quick' : 'standard';
}

/** Linear-interpolated percentile of an ascending array (p in 0..1). */
export function percentile(sorted, p) {
  const a = Array.isArray(sorted) ? sorted : [];
  if (!a.length) return null;
  const idx = (a.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

/** The plan's estimate for a mode, before there are samples. */
export function fallbackEstimate(mode, classification = null) {
  if (mode === 'deep') {
    const c = classification;
    const plan =
      c?.mode === 'deep' && c?.estimate?.minSec
        ? c.estimate
        : estimateFromPlan('deep', {
            tasks: Math.max(10, c?.plannedWork?.tasks || 0),
            memo: c?.format === 'investment_memo',
          });
    return { minSec: plan.minSec, maxSec: plan.maxSec };
  }
  return { ...(ANSWER_FALLBACK[mode] || ANSWER_FALLBACK.standard) };
}

/**
 * Observed p50/p90 once there are `minSamples` durations, else the fallback.
 * @param {number[]} durationsMs
 * @param {{ minSec: number, maxSec: number }} fallback
 * @returns {{ minSec: number, maxSec: number, label: string, source: 'observed'|'plan', samples: number }}
 */
export function estimateFromSamples(
  durationsMs,
  fallback,
  { minSamples = ESTIMATE_MIN_SAMPLES } = {},
) {
  const xs = (Array.isArray(durationsMs) ? durationsMs : [])
    .map(Number)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((x, y) => x - y);
  if (xs.length >= minSamples) {
    const minSec = Math.max(1, Math.round(percentile(xs, 0.5) / 1000));
    const maxSec = Math.max(minSec + 1, Math.ceil(percentile(xs, 0.9) / 1000));
    return {
      minSec,
      maxSec,
      label: durationLabel(minSec, maxSec),
      source: 'observed',
      samples: xs.length,
    };
  }
  return {
    minSec: fallback.minSec,
    maxSec: fallback.maxSec,
    label: durationLabel(fallback.minSec, fallback.maxSec),
    source: 'plan',
    samples: xs.length,
  };
}

/** The classifier says deep (clear or borderline), or points Go deeper at it. */
export function deepRecommended(classification) {
  const c = classification;
  return Boolean(c && (c.mode === 'deep' || c.goDeeperTo === 'deep'));
}

/** Why deep research, in the classifier's own words (first line is the why). */
export function deepReasons(classification) {
  if (!deepRecommended(classification)) return [];
  const c = classification;
  if (c.reasons?.length) return c.reasons.slice(0, 3);
  return (goDeeperFor(c)?.reasons || []).slice(0, 1);
}

const nn = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)));

/**
 * The usage block from counts read off the ledger. Same rules as the
 * reservation: a guest is capped by the cookie and the per-IP-hash daily
 * count, a member's landing ping by the member cap, and a research run
 * (standard or deep) by the plan's dailyQueries; deep runs by
 * deepRunsPerDay, or by the org's pooled month for an org member.
 */
export function assembleUsage({
  isGuest = false,
  guestNeedsAccount = true,
  guestCount = 0,
  guestLimit = 5,
  guestIpUsed = null,
  guestIpCap = null,
  pingsUsedToday = null,
  memberPingCap = 25,
  dailyQueries = null,
  deepRunsUsedToday = null,
  deepRunsPerDay = 0,
  org = null,
} = {}) {
  if (isGuest) {
    const byCookie = Math.max(0, guestLimit - (nn(guestCount) ?? 0));
    const byIp =
      guestIpCap != null && guestIpUsed != null ? Math.max(0, guestIpCap - guestIpUsed) : byCookie;
    const left = Math.min(byCookie, byIp);
    return {
      pings: 1,
      isGuest: true,
      deepRunsUsedToday: 0,
      deepRunsPerDay: 0,
      pingsLeftToday: left,
      researchPingsLeftToday: left,
      orgPool: null,
      guestNeedsAccount: Boolean(guestNeedsAccount),
      resetsAt: RESETS_AT,
    };
  }
  const used = nn(pingsUsedToday);
  return {
    pings: 1,
    isGuest: false,
    deepRunsUsedToday: nn(deepRunsUsedToday),
    deepRunsPerDay: nn(deepRunsPerDay) ?? 0,
    pingsLeftToday: used == null ? null : Math.max(0, memberPingCap - used),
    researchPingsLeftToday:
      used == null || dailyQueries == null ? null : Math.max(0, dailyQueries - used),
    orgPool: org
      ? {
          used: nn(org.used),
          total: nn(org.total),
          period: 'month',
          resetsOn: org.resetsOn || null,
          allocation:
            org.allocation && org.allocation.total != null
              ? { used: nn(org.allocation.used), total: nn(org.allocation.total) }
              : null,
        }
      : null,
    guestNeedsAccount: false,
    resetsAt: RESETS_AT,
  };
}

/**
 * The estimate response.
 * @param {{ classification: object|null, answerDurationsMs?: number[], deepDurationsMs?: number[],
 *   usage: object, deepEnabled?: boolean }} input
 */
export function buildEstimate({
  classification = null,
  answerDurationsMs = [],
  deepDurationsMs = [],
  usage,
  deepEnabled = true,
}) {
  const mode = landingRunMode(classification);
  const answer = estimateFromSamples(answerDurationsMs, fallbackEstimate(mode, classification));
  const deepTime = estimateFromSamples(deepDurationsMs, fallbackEstimate('deep', classification));
  const recommended = deepEnabled && deepRecommended(classification);
  const deep = {
    recommended,
    /* Clear deep: the route stops at the offer dialog before any spend. */
    offered: Boolean(
      deepEnabled && classification?.mode === 'deep' && classification?.confidence === 'clear',
    ),
    reasons: recommended ? deepReasons(classification) : [],
    minSec: deepTime.minSec,
    maxSec: deepTime.maxSec,
    label: deepTime.label,
    source: deepTime.source,
    usage,
    domains: classification?.domains || [],
    format: classification?.format || 'report',
    /* What the browser echoes with its mode events (Go deeper telemetry). */
    meta: classification ? modeMeta(classification) : null,
    blocked: deepEnabled ? null : 'disabled',
  };
  const state = deepState({ deep });
  deep.available = state.available;
  deep.blocked = state.blocked;
  deep.line = state.line;
  return { mode, answer, deep };
}
