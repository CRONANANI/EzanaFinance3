/**
 * Deep research mode (Nov 2026).
 *
 * A ping is answered in about five seconds. Some questions cannot be: "What
 * are the biggest risks to NVIDIA's growth over the next three years?
 * Analyze its financial performance, institutional ownership, government
 * contracts, industry exposure, and competitive landscape." That is an
 * analyst's assignment, several datasets and a written assessment, and a
 * five-second budget turns it into a list of snippets.
 *
 * deepResearchSignal() recognises those questions before any spend. Sonar
 * then asks the visitor whether to run deep research; on yes it shows an
 * estimate and streams the research engine's progress (about one to three
 * minutes); on no it answers the quick way.
 *
 * Pure and client-safe. Unit-tested in scripts/check-sonar-deep.mjs.
 */

import { classifyResearchMode, DEEP_ANGLES, estimateLabel } from '@/lib/sonar/research-mode';

export { DEEP_ANGLES, estimateLabel };

/**
 * Whether a ping is a deep research assignment, and why. Since Nov 2026 a
 * thin wrapper over the research-mode classifier (research-mode.js): deep
 * means mode 'deep' with a clear classification. Kept for existing callers.
 * @param {string} query
 * @param {object} [understood]  understandQuery() output, when the caller has it
 * @returns {{ deep: boolean, score: number, reasons: string[], angles: Array<{id: string, label: string}>,
 *   estimate: { minSec: number, maxSec: number, label: string } }}
 */
export function deepResearchSignal(query, understood = null) {
  const c = classifyResearchMode(query, { understood, coverage: false });
  const deep = c.mode === 'deep' && c.confidence === 'clear';
  return {
    deep,
    score: c.score,
    reasons: deep ? c.reasons : [],
    angles: c.angles,
    estimate: deep ? c.estimate : estimateFor(c.angles),
  };
}

/**
 * The old angle-count estimate, for callers without a plan. The classifier
 * estimates from planned work (research-mode.js estimateFromPlan).
 */
export function estimateFor(angles = []) {
  const n = Math.max(1, angles.length);
  const minSec = Math.round(Math.min(150, 45 + 8 * n));
  const maxSec = Math.round(Math.min(240, 90 + 15 * n));
  return { minSec, maxSec, label: estimateLabel(minSec, maxSec) };
}

/** Deep research is on unless SONAR_DEEP_RESEARCH=false (server only). */
export function deepResearchEnabled(env = typeof process !== 'undefined' ? process.env : {}) {
  return String(env?.SONAR_DEEP_RESEARCH ?? 'true').toLowerCase() !== 'false';
}

/** Deep research needs a free account (Nov 2026, research modes): guests run
    it only when SONAR_DEEP_GUESTS=true. */
export function deepResearchForGuests(env = typeof process !== 'undefined' ? process.env : {}) {
  return String(env?.SONAR_DEEP_GUESTS ?? 'false').toLowerCase() === 'true';
}

/** Standard research runs automatically unless SONAR_STANDARD_RESEARCH=false. */
export function standardResearchEnabled(env = typeof process !== 'undefined' ? process.env : {}) {
  return String(env?.SONAR_STANDARD_RESEARCH ?? 'true').toLowerCase() !== 'false';
}

export default deepResearchSignal;
