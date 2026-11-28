/**
 * Sonar 6.4: sentence-level claim verification (Nov 28 2026). Pure: no I/O.
 *
 * The 6.3 validator checked that every number in a claim appears in a cited source. A live
 * Palantir report passed it while saying "the award-value-to-revenue indicator is 31.3%":
 * 31.3% was in the evidence, but as a growth rate. It also said "the company does not
 * disclose" a figure the company does disclose, because the evidence said Ezana could not
 * retrieve it. Lowering confidence is not enough for either; the sentence must not be shown.
 *
 * Three sentence checks, each removing only the sentence that fails:
 *   mislabeled number      a percentage whose label kind (growth, share of revenue, margin,
 *                          yield, rate, inflation) shares nothing with the label every
 *                          matching source gives that number
 *   unverified negative    "does not disclose / report / break out", "has no ...": a claim
 *                          about the world, which needs a source saying the same about the
 *                          world; a statement about Ezana's coverage ("could not retrieve",
 *                          "not available here") never supports it
 *   contradiction          the same label stated with two different values in one report,
 *                          when only one of them matches a source with that label
 *
 * repairClaim returns the claim with the failing sentences removed and what was removed,
 * so the validator can keep the rest (action 'rewritten') or remove the claim if nothing
 * meaningful is left.
 */

import { numbersOf } from './evidence';

const CLASSES = [
  [
    'growth',
    /\b(?:growth|grew|grow(?:ing|s|n)?|rose|rise[sn]?|rising|fell|fall(?:s|ing|en)?|increase[sd]?|decrease[sd]?|declin\w+|up|down|change[sd]?|vs\.?|versus|compared|year[- ](?:on|over)[- ]year|y\/y|yoy|higher|lower|cagr|jump\w*|surg\w+)\b|\(\s*[+-]\s*$/i,
  ],
  [
    'share',
    /\b(?:ratio|share|of (?:total |filed |annual |segment )?revenue|to (?:filed |annual )?revenue|percent of|proportion|portion|indicator|exposure|accounts? for|makes? up|made up)\b/i,
  ],
  ['margin', /\bmargins?\b/i],
  ['yield', /\byields?\b/i],
  ['rate', /\b(?:policy|interest|real|benchmark|bank) rates?\b/i],
  ['inflation', /\binflation\b|\bcpi\b|\bconsumer prices?\b/i],
];

/** The label kinds named around a number (its own sentence only). */
function classesAround(sentence, index, length) {
  const before = sentence.slice(Math.max(0, index - 80), index);
  const after = sentence.slice(index + length, index + length + 28);
  const out = new Set();
  for (const [id, re] of CLASSES) if (re.test(before) || re.test(after)) out.add(id);
  return out;
}

function sentencesOf(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z"“(\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Percentages in a text with the label kinds around each. */
export function labeledPercents(text) {
  const out = [];
  for (const s of sentencesOf(text)) {
    let from = 0;
    for (const n of numbersOf(s)) {
      if (!n.pct) continue;
      const at = s.indexOf(n.text, from);
      if (at < 0) continue;
      from = at + n.text.length;
      out.push({
        value: n.value,
        text: n.text,
        classes: classesAround(s, at, n.text.length),
        sentence: s,
      });
    }
  }
  return out;
}

const close = (a, b) => Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.005);

/**
 * Percent texts in `sentence` whose label kind disagrees with every source that states
 * the number. A number no source labels, or a claim with no label kind, is not judged here.
 * @param {string} sentence
 * @param {string[]} sources source texts (evidence titles and text, metric "label: value")
 */
export function mislabeledNumbers(sentence, sources = []) {
  const srcPct = sources.flatMap((t) => labeledPercents(t));
  const bad = [];
  for (const n of labeledPercents(sentence)) {
    if (!n.classes.size) continue;
    const matches = srcPct.filter((x) => close(x.value, n.value) && x.classes.size);
    if (!matches.length) continue;
    const agrees = matches.some((m) => [...n.classes].some((c) => m.classes.has(c)));
    if (!agrees) bad.push(n.text);
  }
  return bad;
}

/* A claim that a company or authority does not disclose, report or have something. */
const WORLD_NEG_RE =
  /\b(?:does not|doesn['’]t|did not|didn['’]t|has not|hasn['’]t|have not|haven['’]t|never)\s+(?:publicly\s+)?(?:disclose[sd]?|report(?:ed|s)?|break[s]? out|provide[sd]?|publish(?:ed|es)?|file[sd]?|reveal(?:ed|s)?)\b|\bnot (?:publicly )?disclosed\b|\b(?:no|without) (?:public )?(?:disclosure|breakdown)\b/i;
/* A statement about what Ezana could or could not read. */
const COVERAGE_RE =
  /\b(?:ezana|this research|here|our data|the data(?:set)?s?|could not (?:retrieve|fetch|read|find)|not (?:available|retrieved) (?:here|in this research|in ezana)|not in (?:ezana['’]s|the filed) data|is not available here)\b/i;

const WORDS = (s) =>
  new Set(
    String(s || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 5),
  );

/** Whether a world-negative sentence is stated by a source (not by a coverage note). */
export function unverifiedNegative(sentence, sources = []) {
  if (!WORLD_NEG_RE.test(sentence)) return false;
  const own = WORDS(sentence);
  return !sources
    .flatMap((t) => sentencesOf(t))
    .some(
      (s) => WORLD_NEG_RE.test(s) && !COVERAGE_RE.test(s) && [...own].some((w) => WORDS(s).has(w)),
    );
}

const FIELDS = ['title', 'explanation', 'text', 'comparison', 'implication', 'caveat'];

/**
 * Remove the sentences of a claim that fail a sentence check.
 * @param {object} claim
 * @param {{ sources: string[], supported: (n: object) => boolean }} ctx
 *   sources: cited source texts; supported: whether a parsed number is backed by a source
 * @returns {{ claim: object, removed: Array<{field,sentence,problem}>, titleFailed: boolean }}
 */
export function repairClaim(claim, { sources = [], supported = () => true } = {}) {
  const removed = [];
  const out = { ...claim };
  let titleFailed = false;
  for (const f of FIELDS) {
    if (typeof claim[f] !== 'string' || !claim[f].trim()) continue;
    const kept = [];
    for (const s of sentencesOf(claim[f])) {
      const clean = s.replace(/\[S\d+\]/g, '');
      const nums = numbersOf(clean).filter((n) => !/^[-+]?\d$/.test(n.text));
      const unsupported = nums.filter((n) => !supported(n));
      const mis = mislabeledNumbers(clean, sources);
      const neg = unverifiedNegative(clean, sources);
      const problem = mis.length
        ? `mislabeled_number:${mis.join('|')}`
        : neg
          ? 'unverified_negative'
          : unsupported.length
            ? `unsupported_numbers:${unsupported.map((n) => n.text).join('|')}`
            : null;
      if (problem) {
        removed.push({ field: f, sentence: s, problem });
        if (f === 'title') titleFailed = true;
      } else kept.push(s);
    }
    out[f] = kept.join(' ');
  }
  return { claim: out, removed, titleFailed };
}

/**
 * Contradictions across a report: the same label kind and subject word stated with two
 * values, where one value matches a source carrying that label and the other does not.
 * @param {Array<{ id, text }>} claims
 * @param {string[]} sources
 * @returns {Array<{ id, text }>} the claims holding the unsupported side
 */
export function contradictions(claims = [], sources = []) {
  const srcPct = sources.flatMap((t) => labeledPercents(t));
  const stated = claims.flatMap((c) => labeledPercents(c.text).map((n) => ({ ...n, id: c.id })));
  const out = [];
  for (const a of stated) {
    for (const b of stated) {
      if (a === b || close(a.value, b.value)) continue;
      const shared = [...a.classes].filter((k) => b.classes.has(k));
      if (!shared.length) continue;
      const aOk = srcPct.some(
        (x) => close(x.value, a.value) && shared.some((k) => x.classes.has(k)),
      );
      const bOk = srcPct.some(
        (x) => close(x.value, b.value) && shared.some((k) => x.classes.has(k)),
      );
      if (aOk && !bOk && !out.some((o) => o.id === b.id && o.text === b.text))
        out.push({ id: b.id, text: b.text });
    }
  }
  return out;
}
