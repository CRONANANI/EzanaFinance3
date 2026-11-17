/**
 * Sonar adaptive research: follow-up references (Nov 2026).
 *
 * "Who will replace him?" only means something next to the answer it was
 * asked under. The page sends a small thread object with a follow-up: the
 * parent question, its headline and summary, and the subject, ticker and
 * person that answer was about. This module uses it to name what a pronoun
 * points at and to write the question out in full.
 *
 * The thread is context, never fact. What it says happened is checked again
 * by the research (the orchestrator verifies the event afresh); nothing here
 * is passed on as established.
 *
 * Pure. No I/O. The thread arrives from the browser, so every field is
 * clipped and stripped of control characters before use.
 */

const clip = (v, n) =>
  String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

/** A thread object reduced to the fields this module reads, each bounded. */
export function sanitizeThread(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const t = {
    question: clip(raw.question, 300),
    headline: clip(raw.headline, 200),
    summary: clip(raw.summary, 900),
    subject: clip(raw.subject, 120),
    ticker: clip(raw.ticker, 12).toUpperCase(),
    person: clip(raw.person, 80),
    event: clip(raw.event, 120),
  };
  if (t.ticker && !/^[A-Z][A-Z0-9.-]{0,9}$/.test(t.ticker)) t.ticker = '';
  return t.question || t.subject || t.person || t.ticker ? t : null;
}

const ROLE_WORDS =
  /\b(ceo|cfo|coo|cto|chief|chair(man|woman)?|president|founder|director|governor|minister|senator|secretary)\b/i;
const NOT_NAMES = new Set(
  `How Who What Why When Where Which Will Would Could Should Does Did Is Are Was Were Can The A An
   If In On At Of For And Or But NVIDIA Nvidia Apple Microsoft Tesla Amazon Alphabet Google Meta
   Fed OPEC Congress Senate House Brent Europe Asia China Taiwan Turkey Argentina Africa Bitcoin
   Polymarket Kalshi Sonar Ezana`.split(/\s+/),
);

/**
 * A person a sentence names, when it names one clearly: two or three
 * capitalised words next to a role or a leadership event ("Jensen Huang's
 * resignation", "replace Jensen Huang", "CEO Jensen Huang"). Null otherwise;
 * a guess is worse than no name.
 */
export function personFromText(text) {
  const s = String(text || '');
  const name = '([A-Z][a-z]+(?:\\s(?:[A-Z]\\.\\s)?[A-Z][a-z]+){1,2})';
  const patterns = [
    new RegExp(
      `${name}(?:[’']s)?\\s+(?:resignation|departure|exit|retirement|ouster|firing|successor|replacement)`,
    ),
    new RegExp(
      `(?:replace|replaces|replacing|succeed|succeeds|succeeding|after|did|has)\\s+${name}`,
    ),
    new RegExp(`(?:CEO|CFO|chair(?:man|woman)?|president|founder)\\s+${name}`),
    new RegExp(`${name},?\\s+(?:the\\s+)?(?:CEO|CFO|chair(?:man|woman)?|president|founder)`),
    new RegExp(
      `${name}\\s+(?:resign(?:s|ed)?|step(?:s|ped)?\\s+down|quit|was\\s+fired|is\\s+leaving)`,
    ),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const words = m[1].split(/\s+/);
    while (words.length && NOT_NAMES.has(words[0])) words.shift();
    if (words.length >= 2 && !words.some((w) => ROLE_WORDS.test(w))) return words.join(' ');
  }
  return null;
}

const PERSON_REF = /\b(him|he|his|her|she|hers)\b/i;
const THING_REF =
  /\b(it|its|that company|the company|this company|the stock|this stock|that stock|the shares|they|them|their|that|this)\b/i;
const PROBABILITY_REF = /\bthat (probability|market|contract|price)\b/i;

/**
 * Write a follow-up out in full.
 * @returns {{ resolvedQuestion: string, usedThread: boolean, person: string|null,
 *   subject: string|null, ticker: string|null, unresolved: string[] }}
 */
export function resolveReferences(question, rawThread) {
  const q = String(question || '').trim();
  const thread = sanitizeThread(rawThread);
  const out = {
    resolvedQuestion: q,
    usedThread: false,
    person: null,
    subject: null,
    ticker: null,
    unresolved: [],
  };
  const hasPersonRef = PERSON_REF.test(q);
  const hasThingRef = THING_REF.test(q) && !PROBABILITY_REF.test(q);
  if (!thread) {
    if (hasPersonRef) out.unresolved.push('person');
    return out;
  }
  const person =
    thread.person || personFromText(thread.question) || personFromText(thread.headline);
  let resolved = q;
  if (hasPersonRef) {
    if (person) {
      resolved = resolved
        .replace(/\b(his|her)\b(?=\s+\w)/i, `${person}’s`)
        .replace(/\b(him|he|she|hers)\b/i, person);
      out.person = person;
      out.usedThread = true;
    } else out.unresolved.push('person');
  }
  if (hasThingRef && thread.subject && !new RegExp(`\\b${thread.subject}\\b`, 'i').test(resolved)) {
    resolved = resolved
      .replace(/\b(that|this|the) (company|stock)\b/i, thread.subject)
      .replace(/\bthe shares\b/i, `${thread.subject} shares`);
    out.usedThread = true;
  }
  /* A follow-up is about the parent's subject unless it names another one. */
  if (thread.subject) out.subject = thread.subject;
  if (thread.ticker) out.ticker = thread.ticker;
  const namesSubject =
    new RegExp(thread.subject || '\\u0000', 'i').test(resolved) ||
    (thread.ticker && new RegExp(`\\b${thread.ticker}\\b`).test(resolved));
  if (out.person && thread.subject && !namesSubject) {
    resolved = resolved.replace(/\?*$/, '') + ` at ${thread.subject}?`;
  }
  if (!out.person && person) out.person = person;
  out.resolvedQuestion = resolved;
  if (out.subject || out.person) out.usedThread = true;
  return out;
}
