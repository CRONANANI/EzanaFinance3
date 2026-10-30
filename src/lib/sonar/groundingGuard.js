/**
 * Ezana Sonar — grounded synthesis guard (Oct 30, SpaceX IPO false negative).
 *
 * The brief for "what was the ipo value of spacex" said SpaceX had not held an
 * IPO. No source said that: the datasets returned four unrelated snippets,
 * live web did not run, and the model filled the gap from training data that
 * predates the listing. A brief may only say something did NOT happen when a
 * retrieved source says so. Two layers:
 *
 *   1. GROUNDING_RULES, appended to every brief's system prompt.
 *   2. A cheap post-check on the draft: a sentence with a negative claim
 *      ("has not", "never", "remains private") that no source supports is
 *      rejected. The caller regenerates once through its existing synthesis
 *      call; whatever still fails is removed, or replaced with NO_RECORD_LINE
 *      when there were no findings at all.
 *
 * "Supported" means a source passage itself makes a negative statement and
 * shares a subject word with the sentence. Sentences about Ezana's own
 * coverage ("Our datasets returned no record of this yet.") are not claims
 * about the world and always pass.
 */

export const NO_RECORD_LINE = 'Our datasets returned no record of this yet.';

export const GROUNDING_RULES = `
Grounding rules:
- State only facts that appear in the sources below or in a web search result you read here. Every factual sentence must rest on at least one of them.
- Your own background knowledge may be out of date. Never use it to state whether an event happened, or did not happen.
- Never say something has not happened, does not exist, never occurred, or that a company is not public or remains private, unless a source or web result explicitly says so.
- If no source answers the question, say: "${NO_RECORD_LINE}" Then report what the web results say, if web search ran.
- Findings only. No recommendations, no buy or sell language.`;

/* Claims that something did not happen or is not so. Deliberately the
   event-shaped negations, not every "not": "this is not advice" or "the award
   does not include options" are not what went wrong. */
const NEGATION_RE =
  /\b(?:has not|hasn['’]t|have not|haven['’]t|had not|hadn['’]t|did not|didn['’]t|never|no (?:record|ipo|evidence|plans? to)|has yet to|have yet to|is yet to|(?:is|was|isn['’]t|wasn['’]t) not (?:yet )?(?:public|listed|publicly traded)|(?:isn['’]t|wasn['’]t) (?:yet )?(?:public|listed|publicly traded)|remains? (?:a )?private(?:ly held)?|still private|privately held|not (?:yet )?publicly traded|not held|does not exist|doesn['’]t exist)\b/i;

/* A sentence about Ezana's own coverage, not about the world. */
const META_RE =
  /\b(?:our|ezana['’]?s?|the|these|its|this)\s+(?:proprietary\s+)?(?:datasets?|sources?|snippets?|findings?|records?|data)\b|\bweb search\b|\bsearch results?\b|\bno (?:dataset|snippet|finding|source|match)(?:es|s)?\b|\b(?:financial|investment) advice\b/i;

const STOP = new Set(
  (
    'that this with from have has had been were was will would could should into onto over under ' +
    'about after before their there these those which while where when what than then them they ' +
    'also only just even still such more most some any each very much many does did done doing ' +
    'not never none nothing held hold public private remains remain company companies yet'
  ).split(' '),
);

function tokens(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .replace(/\[s\d+\]/g, ' ')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/** Sentences, splitting only where a terminator meets whitespace and a new
    sentence: "$135.00" and "U.S." stay whole. */
export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z"“(\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function findingText(f) {
  if (typeof f === 'string') return f;
  return [f?.title, f?.summary, f?.snippet, f?.text].filter(Boolean).join('. ');
}

/**
 * Sentences in `draft` that make a negative claim no finding supports.
 * @param {string} draft
 * @param {Array<string|{title?:string,summary?:string,snippet?:string,text?:string}>} findings
 */
export function findUnsupportedNegatives(draft, findings = []) {
  const negativePassages = (findings || [])
    .flatMap((f) => splitSentences(findingText(f)))
    .filter((s) => NEGATION_RE.test(s))
    .map(tokens);
  return String(draft || '')
    .split(/\n+/)
    .flatMap(splitSentences)
    .filter((s) => {
      if (!NEGATION_RE.test(s) || META_RE.test(s)) return false;
      const own = tokens(s);
      const supported = negativePassages.some((p) => [...own].some((w) => p.has(w)));
      return !supported;
    });
}

/** Drop the given sentences, keeping the paragraph breaks. */
function removeSentences(text, bad, { noFindings }) {
  let out = String(text || '');
  let placed = out.includes(NO_RECORD_LINE);
  for (const s of bad) {
    const replacement = noFindings && !placed ? NO_RECORD_LINE : '';
    if (replacement) placed = true;
    out = out.replace(s, replacement);
  }
  out = out
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
  return out || NO_RECORD_LINE;
}

/**
 * Enforce the negative-claim rule on a synthesized brief.
 *
 * @param {string} draft
 * @param {any[]} findings  dataset findings plus any web-cited passages
 * @param {((extraInstruction: string) => Promise<string|null>)|null} regenerate
 *   the caller's existing synthesis call with one extra instruction, or null
 *   when there is no time left to regenerate
 * @returns {Promise<{ text: string, flagged: string[], regenerated: boolean, removed: string[] }>}
 */
export async function enforceGrounding(draft, findings = [], regenerate = null) {
  const flagged = findUnsupportedNegatives(draft, findings);
  if (!flagged.length) return { text: draft, flagged, regenerated: false, removed: [] };

  let text = draft;
  let regenerated = false;
  if (typeof regenerate === 'function') {
    try {
      const retry = await regenerate(
        `Your previous draft made claims that no source supports: ${flagged
          .map((s) => `"${s}"`)
          .join(
            '; ',
          )}. Rewrite the brief using only the sources and web results. Do not say whether something happened unless a source says so; if nothing answers the question, say "${NO_RECORD_LINE}"`,
      );
      if (retry) {
        text = retry;
        regenerated = true;
      }
    } catch {
      /* keep the draft and clean it below */
    }
  }

  const still = findUnsupportedNegatives(text, findings);
  if (!still.length) return { text, flagged, regenerated, removed: [] };
  return {
    text: removeSentences(text, still, { noFindings: !(findings || []).length }),
    flagged,
    regenerated,
    removed: still,
  };
}
