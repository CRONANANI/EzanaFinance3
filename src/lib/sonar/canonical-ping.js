/**
 * One question, one answer (Nov 2026).
 *
 * "semiconductor industry in Taiwan" and "Give me a breakdown of the
 * semiconductor industry in Taiwan" ask the same thing. The understanding
 * layer already agrees on the subject (industry:semiconductors, country:TW,
 * display "Semiconductor industry in Taiwan"), but the request words used to
 * leak into two places: the intent label (a "breakdown" is industry_layout,
 * the bare phrase industry_country) and the synthesis prompt ("The visitor
 * asked: ..."), so the two phrasings got two different briefs.
 *
 * canonicalPing reduces a ping to what it actually asks:
 *   - the intent FAMILY (the two industry intents are one family),
 *   - the resolved entities (kind:id, sorted),
 *   - the residual: the content words left once the request framing
 *     ("give me a breakdown of", "tell me about", "overview of") and the
 *     entities' own words are removed.
 *
 * Two pings with the same key are the same question. When the residual is
 * empty the ping is framing plus entities, so the synthesis is told the
 * understood title instead of the raw words, and the shared result cache
 * (landing-pipeline.js) serves both phrasings the same answer. A real
 * question ("which Taiwan chip makers are most exposed to China") keeps its
 * words in the residual, so it never collapses into the plain layout.
 *
 * Pure and deterministic; no I/O.
 */

/* Words that frame a request without changing what is asked. Question words
   that change the question (who, which, why, when, where) are NOT here. */
const FRAMING = new Set(
  `a an the of in on for about to and or with at by from into
   me my us our we you your i its their this that these those there here it
   please can could would will should may might must shall
   give show tell explain describe summarize summarise summary overview breakdown break down
   layout landscape map mapping picture rundown primer anatomy outline profile snapshot
   look looks like what whats is are was were be been being has have had does do did how
   want need see get know learn understand find
   industry industries sector sectors market markets ecosystem structure space
   deep dive quick brief briefing report analysis analyze analyse info information
   detail details overall general key main major big picture
   some all any more most current currently today now latest recent`
    .split(/\s+/)
    .filter(Boolean),
);

/* The two industry intents answer through the same pipeline branch. */
const FAMILY = {
  industry_layout: 'industry',
  industry_country: 'industry',
};

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9$]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/* Light stemming so "semiconductors" and "semiconductor", "chips" and "chip"
   are one word. Enough for matching residuals; not a linguistic stemmer. */
function stem(t) {
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

/**
 * { key, family, entities, residual, framingOnly, asked } for an understood
 * ping. `asked` is what the synthesis is told the visitor asked: the
 * understood title when the ping is framing only, the raw words otherwise.
 */
export function canonicalPing(understood, rawQuery) {
  const u = understood || {};
  const ents = Array.isArray(u.entities) ? u.entities : [];
  const family = FAMILY[u.intent] || u.intent || 'open_question';
  const entityKeys = [...new Set(ents.map((e) => `${e.kind}:${e.id}`))].sort();

  const covered = new Set();
  for (const e of ents) {
    for (const t of tokens(`${e.surface || ''} ${e.label || ''} ${e.noun || ''}`)) {
      covered.add(stem(t));
    }
  }
  /* The understood title is the entities in words ("Semiconductor industry
     in Taiwan"), so its words are covered too. Only when there ARE entities:
     with none, the title is just the raw words, and covering them would make
     every entity-free ping ("Lockheed Martin", "copper") the same key. */
  if (entityKeys.length) for (const t of tokens(u.display)) covered.add(stem(t));

  const source = u.corrected || rawQuery || '';
  const residual = [
    ...new Set(
      tokens(source)
        .filter((t) => !FRAMING.has(t))
        .map(stem)
        .filter((t) => !FRAMING.has(t) && !covered.has(t)),
    ),
  ].sort();

  const framingOnly = residual.length === 0 && entityKeys.length > 0;
  /* Nothing at all left (an empty or all-framing ping) is never a shared key. */
  if (!entityKeys.length && !residual.length) residual.push(`raw:${tokens(source).join('-')}`);
  return {
    key: `${family}|${entityKeys.join(',')}|${residual.join(' ')}`,
    family,
    entities: entityKeys,
    residual,
    framingOnly,
    asked: framingOnly && u.display ? u.display : String(rawQuery || ''),
  };
}

export default canonicalPing;
