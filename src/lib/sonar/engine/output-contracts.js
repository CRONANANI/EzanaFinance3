/**
 * Sonar role budgets and output contracts (Nov 28 2026, from the model benchmark).
 *
 * The benchmark found nearly every model call ending at its token cap: specialists,
 * reviewers, the quick writer and the deep memo writer, for every model (the memo writer
 * still did at 10,500 tokens). The prompts asked for more than the caps allowed, so a
 * larger cap only produced a longer cut. Each role now has:
 *
 *   targetWords   what the prompt asks for, in words of JSON string content. One word of
 *                 content costs about 1.6 output tokens once keys, markers and quotes are
 *                 counted, so every target sits at or under 60% of its cap.
 *   capTokens     the guard. Reaching it is recorded as "truncated", never as success.
 *   hopMs         the most one call of the role may take (provider hop limit).
 *
 * Time budgets, deep run (280 s budget, 300 s function cap):
 *   phase 1 + retrieval   about 5-15 s
 *   specialists           a 70 s window, each call up to 55 s, all in parallel; a call that
 *                         fails or times out is reported missing and the others are kept
 *   writer                protected: specialists may only start while 200 s remain
 *   red team              up to 45 s, runs only with 25 s+ left
 *   director final pass   up to 40 s
 *   methodology audit     up to 40 s
 * No role retries a timeout. The only retry is the provider's one-time model fallback on a
 * 400, which is recorded (and disabled with SONAR_MODEL_STRICT=1).
 */

export const ROLE_BUDGETS = {
  quick: {},
  standard: { specialistsWindowMs: 14_000, specialistHopMs: 13_000 },
  deep: {
    specialistsWindowMs: 70_000,
    specialistHopMs: 55_000,
    redTeamHopMs: 45_000,
    resolveHopMs: 40_000,
    auditHopMs: 40_000,
  },
};

/**
 * Thinking and effort per role (requestShape in model-routing.js turns these into the
 * request fields each model accepts). Structured, bounded roles run without up-front
 * thinking at low effort; the deep writer may think, with output room reserved for it.
 */
export const ROLE_THINKING = {
  quick_writer: { think: 'off', effort: 'low' },
  standard_writer: { think: 'off', effort: 'medium' },
  deep_writer: { think: 'adaptive', effort: 'medium', reserveTokens: 6000 },
  specialist: { think: 'off', effort: 'low' },
  reviewer: { think: 'off', effort: 'low' },
};

/** The writer's role key for a depth. */
export function writerRole(depth) {
  return depth === 'quick' ? 'quick_writer' : depth === 'deep' ? 'deep_writer' : 'standard_writer';
}

/** Token caps and the target each prompt asks for. */
export const OUTPUT_CONTRACTS = {
  quick_writer: { capTokens: 1500, targetWords: 350 },
  standard_writer: { capTokens: 2900, targetWords: 850 },
  deep_writer: { capTokens: 3100, targetWords: 1000 },
  memo_writer: { capTokens: 6000, targetWords: 1900 },
  positioning_writer: { capTokens: 8000, targetWords: 2500 },
  standard_specialist: { capTokens: 700, targetWords: 240 },
  deep_specialist: { capTokens: 1600, targetWords: 550 },
  red_team: { capTokens: 900, targetWords: 300 },
  resolve: { capTokens: 900, targetWords: 300 },
  auditor: { capTokens: 800, targetWords: 260 },
};

/* ── Writer contracts ───────────────────────────────────────────────────────────── */

const QUICK_WRITER = `Length budget (quick answer): the whole JSON stays under about 350 words. Answer the question directly in executiveConclusion (at most 50 words). At most three key findings, each explanation at most 40 words; comparison, implication and caveat are null unless essential (then one line of at most 15 words). No analysis items. Summary at most 50 words. Two takeaways of at most 15 words. Write executiveConclusion and keyFindings first, in the order of the schema.`;

const STANDARD_WRITER = `Length budget: the whole JSON stays under about 850 words. executiveConclusion: the direct answer, at most 60 words. At most four key findings (the essential insights, most decision-useful first), each explanation at most 50 words; comparison, implication and caveat each at most 20 words or null. At most two analysis items of at most 60 words. Summary at most 80 words. Three takeaways of at most 20 words. Limitations: at most three, each at most 20 words, naming what the evidence cannot establish. Write executiveConclusion and keyFindings first, in the order of the schema. If space runs short, shorten later fields, never drop the answer or the caveats.`;

const DEEP_WRITER = `Length budget (deep report): the whole JSON stays under about 1,000 words. executiveConclusion: the prioritized answer, at most 80 words. At most five key findings, most material first, each explanation at most 70 words; comparison, implication and caveat each at most 25 words or null. At most three analysis items (the synthesis across findings: how they connect and what follows), each at most 90 words. Summary at most 90 words. Three takeaways of at most 20 words. Limitations: at most four, each at most 20 words. Write executiveConclusion and keyFindings first. If space runs short, shorten later fields first.`;

/** The writer's length contract for a run's depth (non-memo reports). */
export function writerContract(depth) {
  if (depth === 'quick') return QUICK_WRITER;
  if (depth === 'deep') return DEEP_WRITER;
  return STANDARD_WRITER;
}

/** The memo writer's length contract (appended to the memo input). */
export function memoContract(memoKind) {
  const words = memoKind === 'positioning' ? '2,500' : '1,900';
  return `Length budget: the whole JSON stays under about ${words} words; this budget overrides any count above. executiveConclusion at most 80 words: the prioritized answer. Most material items first: at most five risks (or sections), each with an assessment of at most 60 words, at most three evidence items of at most 35 words, an implication of at most 40 words and at most two watch items of at most 15 words. Scenarios: three, each with at most two assumptions of at most 15 words and an outcome of at most 35 words. Chain: three or four links, each mechanism at most 20 words. dataGaps and limitations: at most four each; followOnResearch: at most three; each at most 20 words. Write centralQuestion, executiveConclusion and the risks first; if space runs short, shorten scenarios, chain and the lists, never the answer or the limitations.`;
}

/* ── Specialist contracts ──────────────────────────────────────────────────────── */

const STANDARD_SPECIALIST = `Length budget: the whole JSON stays under about 240 words. conclusion: at most two sentences (40 words) answering your assignment. At most four findings, each claim at most 30 words with its refs and period; findings are evidence statements, not commentary. Cite every computed metric that bears on your assignment as M:id in refs (those are the required metrics). counterevidence and dataGaps: at most two each, at most 15 words. handoffs: at most one. No other fields.`;

const DEEP_SPECIALIST = `Length budget: the whole JSON stays under about 550 words. conclusion: at most three sentences (60 words). At most six findings, most material first; each claim at most 40 words and carries refs ([S#] records or M:id metrics) and its period; a finding without a ref is labelled hypothesis. counterevidence and dataGaps: at most three each, at most 20 words. handoffs: at most two. No other fields.`;

/** The specialist's length contract for a mode. */
export function specialistContract(mode) {
  return mode === 'deep' ? DEEP_SPECIALIST : STANDARD_SPECIALIST;
}

/* ── Reviewer contracts ────────────────────────────────────────────────────────── */

export const RED_TEAM_CONTRACT = `Length budget: at most five points, the whole JSON under about 300 words. Each point is one specific factual or methodological criticism of a named claim in the draft: say which claim (quote at most 12 words in "target"), what is wrong or missing, and cite refs. At most 45 words per point. No general commentary, no restating the draft.`;

export const AUDIT_CONTRACT = `Length budget: at most six checks, the whole JSON under about 260 words. Only checks that name a specific claim, number, period or definition in the report. detail at most 30 words; limitation at most 25 words.`;

export const RESOLVE_CONTRACT = `Length budget: one resolution per point, each note at most 30 words; the whole JSON under about 300 words.`;

/* ── Outcomes ──────────────────────────────────────────────────────────────────── */

/**
 * The outcome of one model role call, kept apart so a cut reply is never counted as a
 * timeout or a provider failure, and an unparseable reply is never counted as success:
 *   ok               complete, valid structured output
 *   truncated        reached its token cap (the output may still have been repaired), or
 *                    was cut while thinking, before any text
 *   invalid_output   complete reply that did not parse or failed the contract
 *   timeout          the call ran out of time
 *   skipped_deadline not started: too little time left
 *   provider_error   the provider failed (5xx, 4xx, network, empty)
 */
export function classifyOutcome({ out = null, error = null, parsedOk = null } = {}) {
  /* "timed out" is an aborted call; "deadline" (guardHop, the chain's own check) is a call
     never started because too little time was left. */
  const fromText = (s) =>
    /max_tokens/i.test(s)
      ? 'truncated'
      : /timed out/i.test(s)
        ? 'timeout'
        : /\bdeadline\b/i.test(s)
          ? 'skipped_deadline'
          : /timeout|abort/i.test(s)
            ? 'timeout'
            : 'provider_error';
  if (error) return fromText(`${error.name || ''} ${error.message || ''}`);
  if (!out?.answer)
    return fromText(
      (out?.providerErrors || []).map((e) => `${e.type || ''} ${e.message || ''}`).join(' '),
    );
  if (out.stopReason === 'max_tokens') return 'truncated';
  if (parsedOk === false) return 'invalid_output';
  return 'ok';
}

/** Counts of outcomes for a run's telemetry. */
export function outcomeSummary(rows = []) {
  const out = {
    calls: rows.length,
    ok: 0,
    truncated: 0,
    invalid_output: 0,
    timeout: 0,
    skipped_deadline: 0,
    provider_error: 0,
    fallbacks: 0,
  };
  for (const r of rows) {
    if (out[r.outcome] != null) out[r.outcome] += 1;
    if (r.fellBackFrom) out.fallbacks += 1;
  }
  return out;
}
