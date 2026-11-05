/**
 * Sonar research engine: challenge mode (Sonar for organizations, Nov 2026).
 *
 * Anyone who can read an org research report can ask Sonar to challenge
 * its conclusion: the same research runs again with the conclusion as the
 * thing to test, and the assessment says whether it holds, is weakened, is
 * refuted or cannot be tested from the records, with what survives and
 * what does not. Every claim goes through the same validator as any other
 * finding. The conclusion to test comes from the saved report (server
 * side), never from the request body.
 *
 * Pure apart from nothing; unit-tested in scripts/check-org-sonar.mjs.
 */
import { validateClaim } from './findings';
import { unsupportedFigures } from './investment-memo';

export const CHALLENGE_VERDICTS = ['holds', 'weakened', 'refuted', 'unclear'];
export const CHALLENGE_PROMPT_SUFFIX = 'challenge-v1';

/** What the synthesis system prompt gains in challenge mode. */
export function challengeAddendum(claim) {
  const c = String(claim || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900);
  return `

Challenge mode. The fund's team concluded: "${c}"
Test that conclusion; do not restate it. Build the strongest evidence-based case against it from the records, say which parts survive and which do not, and add one more field to the JSON object:
"challenge": { "verdict": "holds" | "weakened" | "refuted" | "unclear", "text": string, "classification": "analytical_interpretation", "evidence": [markers], "metrics": [metric ids], "survives": [string], "doesNotSurvive": [string] }
holds: the records do not undermine it. weakened: parts of it are contradicted or unsupported. refuted: the records contradict its core. unclear: the records cannot test it. The executive conclusion is the challenge's own conclusion. Challenge the claim, never the person who made it.`;
}

/** The validated challenge, or an 'unclear' one when the model gave none. */
export function validateChallenge(raw, { marked = [], metrics = [], claim = '' } = {}) {
  const byMarker = new Map(marked.map((e) => [e.marker, e]));
  const metricsById = new Map(metrics.map((m) => [m.id, m]));
  const allowed = [
    ...marked.flatMap((e) => e.numbers || []),
    ...metrics.map((m) => ({ value: m.value, ratio: m.unit === 'ratio' })),
  ];
  const lines = (v) =>
    (Array.isArray(v) ? v : [])
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .filter((x) => !unsupportedFigures(x, allowed).length)
      .slice(0, 5);
  const verdict = CHALLENGE_VERDICTS.includes(raw?.verdict) ? raw.verdict : 'unclear';
  let assessment = null;
  if (raw?.text) {
    const c = { ...raw, classification: 'analytical_interpretation' };
    const v = validateClaim(c, { byMarker, metricsById });
    if (v.action !== 'removed') {
      assessment = {
        text: String(raw.text),
        classification: v.classification,
        evidenceIds: v.evidenceIds,
        markers: (raw.evidence || [])
          .map((m) => String(m).replace(/[[\]]/g, ''))
          .filter((m) => byMarker.has(m)),
        validation: { action: v.action, problems: v.problems },
      };
    }
  }
  return {
    claim: String(claim || '').slice(0, 900),
    verdict: assessment ? verdict : 'unclear',
    assessment,
    survives: lines(raw?.survives),
    doesNotSurvive: lines(raw?.doesNotSurvive),
  };
}
