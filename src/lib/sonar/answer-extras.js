// src/lib/sonar/answer-extras.js
// Sonar research workspace (Nov 13 2026): the Desk Summary's fields, written in the same
// model call that already writes the answer and validated here before they reach a client.
//
//   headline    one sentence, at most 30 words, states the finding with any uncertainty
//   summary     one to three short paragraphs
//   takeaways   three to five findings that add to the summary (fewer than two: none)
//   related     zero to four follow-on research questions
//
// A quick ping's brief is prose, so the writer appends a short marked block after it
// (DESK_MARK) that splitDeskTrailer() removes; a research report is JSON and carries the
// fields directly. Pure: no I/O; tested in scripts/check-sonar-workspace.mjs.

export const DESK_MARK = '<<<DESK>>>';
export const HEADLINE_MAX_WORDS = 30;
export const RELATED_MIN_CHARS = 12;
export const RELATED_MAX_CHARS = 120;
export const RELATED_MAX = 4;
export const TAKEAWAYS_MIN = 2;
export const TAKEAWAYS_MAX = 5;
export const SUMMARY_MAX_PARAS = 3;
/* Output the trailer adds to a quick ping's writer call. */
export const DESK_TRAILER_TOKENS = 320;

const tidy = (v) =>
  typeof v === 'string'
    ? v
        .replace(/\s*[—]\s*/g, ', ')
        .replace(/[ \t]+/g, ' ')
        .trim()
    : '';

/* Lowercase words only, for comparing two questions ignoring case and punctuation. */
export const questionKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const words = (s) => s.split(/\s+/).filter(Boolean).length;

/** One sentence of at most 30 words, or null. */
export function cleanHeadline(v) {
  const s = tidy(v)
    .replace(/\s+/g, ' ')
    .replace(/^headline\s*:\s*/i, '');
  if (!s || words(s) > HEADLINE_MAX_WORDS) return null;
  return s;
}

/** One to three paragraphs joined by a blank line, or null. Accepts a string or a list. */
export function cleanSummary(v) {
  const paras = (Array.isArray(v) ? v : String(v || '').split(/\n\s*\n/))
    .map((p) => tidy(String(p || '')).replace(/\s+/g, ' '))
    .filter(Boolean)
    .slice(0, SUMMARY_MAX_PARAS);
  return paras.length ? paras.join('\n\n') : null;
}

/** Up to five distinct findings; fewer than two is no list. */
export function cleanTakeaways(v) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(v) ? v : []) {
    const s = tidy(typeof raw === 'string' ? raw : '')
      .replace(/\s+/g, ' ')
      .replace(/^[-*•]\s*/, '');
    if (s.length < 8 || s.length > 320) continue;
    const k = questionKey(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length === TAKEAWAYS_MAX) break;
  }
  return out.length >= TAKEAWAYS_MIN ? out : [];
}

/**
 * Up to four related questions: strings of 12 to 120 characters, deduplicated, none equal to
 * the question asked ignoring case and punctuation.
 */
export function cleanRelated(v, question = '') {
  const asked = questionKey(question);
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(v) ? v : []) {
    if (typeof raw !== 'string') continue;
    const s = tidy(raw)
      .replace(/\s+/g, ' ')
      .replace(/^[-*•\d.)\s]+/, '')
      .replace(/^["']|["']$/g, '');
    if (s.length < RELATED_MIN_CHARS || s.length > RELATED_MAX_CHARS) continue;
    const k = questionKey(s);
    if (!k || k === asked || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length === RELATED_MAX) break;
  }
  return out;
}

/** All four fields validated together. Missing fields come back null or empty. */
export function answerExtras(
  { headline, summary, takeaways, related } = {},
  { question = '' } = {},
) {
  return {
    headline: cleanHeadline(headline),
    summary: cleanSummary(summary),
    takeaways: cleanTakeaways(takeaways),
    related: cleanRelated(related, question),
  };
}

/**
 * The writer instruction for a quick ping's trailer. `company`: the brief already writes its
 * own headline and takeaways (COMPANY_ADDENDUM), so the trailer carries related questions only.
 */
export function deskTrailerRules({ company = false } = {}) {
  const related = `Related: up to four follow-on research questions, one per line, each exploring a different analytical dimension of the same subject (for example drivers, peers or history, risks, what would change the reading). Specific enough to research, 12 to 120 characters, never restating the visitor's question, and never presupposing an event the brief did not verify: if the visitor's question assumed something unverified, ask conditionally or about what is verifiable.`;
  const lines = company
    ? [related]
    : [
        `Headline: one sentence, at most 30 words, stating the finding including any uncertainty. A yes or no question keeps its one-word lead ("Yes." or "No.").`,
        `Takeaway: three to five lines, each a finding the brief's paragraphs do not already say (a driver, a quantified finding the sources support, a risk, a decision factor). A point that needed evidence the sources lack is left out or labelled as a hypothesis.`,
        related,
      ];
  return `
After the brief, on a new line, write ${DESK_MARK} and then these lines, each starting with its label, with no other text after them:
${lines.map((l) => `- ${l}`).join('\n')}
The brief's paragraph rules apply to the brief only; the lines after ${DESK_MARK} are never shown inside it.`;
}

/**
 * Split a quick ping's model text into the brief and its trailer.
 * -> { body, headline, takeaways: string[], related: string[] } (raw: validate with answerExtras)
 */
export function splitDeskTrailer(text) {
  const s = typeof text === 'string' ? text : '';
  const at = s.indexOf(DESK_MARK);
  if (at < 0) return { body: s || null, headline: null, takeaways: [], related: [] };
  const body = s.slice(0, at).trim() || null;
  let headline = null;
  const takeaways = [];
  const related = [];
  for (const line of s.slice(at + DESK_MARK.length).split('\n')) {
    const m = /^\s*[-*]?\s*(headline|takeaways?|related)\s*:\s*(.+)$/i.exec(line);
    if (!m) continue;
    const label = m[1].toLowerCase();
    const value = m[2].trim();
    if (label === 'headline') headline = headline || value;
    else if (label.startsWith('takeaway')) takeaways.push(value);
    else related.push(value);
  }
  return { body, headline, takeaways, related };
}

/** A brief's first paragraphs as the summary (up to three). */
export const summaryFromBody = (body) => cleanSummary(body);
