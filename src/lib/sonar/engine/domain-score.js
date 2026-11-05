/**
 * Sonar research engine: domain scores for a ping (engine v3). The intent
 * prior, entity evidence and cue hits, best first. Split from research-spec.js
 * (Nov 2026) so the research-mode classifier can score domains without
 * importing the spec builder.
 *
 * Pure. Client-safe.
 */
import { DOMAINS } from './domains';

/* Base domains per understood intent (the deterministic router's verdict). */
const INTENT_DOMAINS = {
  company: { company: 1, company_financials: 0.5, analyst_views: 0.4 },
  ticker_lookup: { company: 1, market_performance: 0.6, analyst_views: 0.5 },
  fund: { company: 0.7, institutional: 1 },
  politician: { politician: 1, congress_trading: 0.9 },
  country: { country: 1, macro: 0.6 },
  country_rank: { country: 1, macro: 0.8 },
  industry_layout: { industry: 1 },
  industry_country: { industry: 1, country: 0.5 },
  sector_screen: { sector: 1 },
  ranking: { market_performance: 0.5 },
  comparison: { company: 0.6, market_performance: 0.6 },
  policy: { geopolitics: 0.6, lobbying: 0.4 },
  theme: { news: 0.5 },
  commodity: { commodity: 1 },
  event: { news: 0.8 },
  open_question: { news: 0.5, editorial: 0.3 },
};

/**
 * Score every domain for a ping: intent prior, entity evidence, cue hits.
 * @returns {Array<{ id: string, score: number, why: string[] }>} best first, score > 0
 */
export function scoreDomains(text, understood = {}) {
  const t = String(text || '');
  const scores = new Map();
  const add = (id, s, why) => {
    const cur = scores.get(id) || { id, score: 0, why: [] };
    cur.score = Math.min(1, Math.max(cur.score, s) + (cur.score && s ? 0.1 : 0));
    cur.why.push(why);
    scores.set(id, cur);
  };
  for (const [id, s] of Object.entries(INTENT_DOMAINS[understood.intent] || {})) {
    add(id, s, `intent:${understood.intent}`);
  }
  const kinds = new Set((understood.entities || []).map((e) => e.kind));
  if (kinds.has('ticker')) add('company', 0.9, 'entity:ticker');
  if (kinds.has('person_politician')) add('politician', 1, 'entity:politician');
  if (kinds.has('industry') || kinds.has('sector')) add('industry', 0.7, 'entity:industry');
  if (kinds.has('country')) add('country', 0.5, 'entity:country');
  if (kinds.has('policy')) add('geopolitics', 0.6, 'entity:policy');
  for (const [id, d] of Object.entries(DOMAINS)) {
    if (d.cues.some((re) => re.test(t))) add(id, 0.75, `cue:${id}`);
  }
  /* A country named with a tension word, about companies or markets, is a
     geopolitical exposure question first, not a country profile. */
  const nCountries = (understood.entities || []).filter((e) => e.kind === 'country').length;
  if (nCountries && DOMAINS.geopolitics.cues[0].test(t)) {
    add('geopolitics', nCountries >= 2 ? 1 : 0.9, 'countries+tension');
    if (
      /\b(compan(?:y|ies)|stocks?|shares|firms|manufacturers?|exposed|exposure|vulnerable|investors?)\b/i.test(
        t,
      )
    ) {
      const c = scores.get('country');
      if (c) c.score = Math.min(c.score, 0.6);
    }
  }
  return [...scores.values()].filter((d) => d.score > 0).sort((a, b) => b.score - a.score);
}
