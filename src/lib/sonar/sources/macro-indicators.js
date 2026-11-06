/**
 * Ezana Sonar — macro indicators core source (v2, Nov 2026).
 *
 * Reaches the macro and commodity series in public.macro_series_values (through the
 * macro_series_latest summary) for any question that touches a country, a macro theme, a
 * commodity or a cross-country ranking. The catalogue (src/lib/sonar/macro/catalog.js) knows
 * every family of series; the router (macro/route.js) reads the question:
 *
 *   country      "Is Turkey's lira under pressure?" -> the families the question is about,
 *                led by FX, the policy rate and inflation (not GDP), for that country
 *   theme        "How has geopolitical risk changed this year?" -> world series first
 *   commodity    "What's happening with copper prices?" -> its Pink Sheet price and range
 *   ranking      "Which countries produce the most crude oil?" -> every country, one source
 *
 * At most 12 findings, observed values only; an IMF or AMECO figure for the current year or
 * later is a projection, labelled as one. The citation carries each source's own attribution.
 * Findings only, never advice.
 */
import { getAdminClient } from '@/lib/supabase';
import { toIso3 } from '@/lib/macro-sync/formats.js';
import { routeMacro, isMacroRelevant } from '@/lib/sonar/macro/route';
import { macroBrief } from '@/lib/sonar/macro/series-store';

const SLUG = 'macro-indicators';
const MAX_FINDINGS = 12;

/**
 * The routing for a resolved ping: the question's own words, plus any ISO-2 countries the
 * ping resolver found that the macro router missed.
 */
export function routeFor(q) {
  const route = routeMacro(q?.raw || '');
  const extra = (q?.countries || []).map((c) => toIso3(c)).filter(Boolean);
  if (!route.ranking) {
    for (const iso3 of extra) if (!route.countries.includes(iso3)) route.countries.push(iso3);
  }
  return route;
}

const hasCompany = (q) =>
  (q?.tickers || []).length > 0 ||
  (q?.organizations || []).length > 0 ||
  (q?.people || []).length > 0;

/** A country, a macro theme, a commodity or a ranking. Nothing else reaches the data. */
export function isRelevant(q) {
  const route = routeFor(q);
  return isMacroRelevant(route, { hasCompany: hasCompany(q), text: q?.raw || '' });
}

/** Evidence item -> Sonar finding (the shape the retriever and sweeps consume). */
export function itemToFinding(item, i = 0) {
  const recency = item.meta?.period ? Math.max(0, 1 - i / MAX_FINDINGS) : 0.5;
  return {
    sourceSlug: SLUG,
    title: item.title,
    summary: item.text,
    date: item.date || null,
    relevance: Number((0.6 + 0.35 * recency).toFixed(3)),
    citation: item.citation,
    meta: { ...item.meta, iso3: item.meta?.iso3 || null, seriesKey: item.meta?.series_key || null },
  };
}

/** @type {import('./types').SonarSourceAdapter} */
const macroIndicators = {
  slug: SLUG,
  label: 'Macro indicators',
  dimension: 'Lighthouse',
  minTier: 'free',
  timeoutMs: 4000,
  isRelevant,
  async search(q, ctx = {}) {
    if (!isRelevant(q)) return [];
    const db = ctx.db || getAdminClient();
    const route = routeFor(q);
    const limit = Math.min(ctx.limit || MAX_FINDINGS, MAX_FINDINGS);
    try {
      const items = await macroBrief(db, route, {
        limit,
        maxCountries: ctx.maxCountries || 2,
        /* The fast profile cuts a retriever at 1.2 s; the reads stay under it. */
        timeoutMs: ctx.timeoutMs || 900,
        now: ctx.now,
      });
      return items.map(itemToFinding);
    } catch (e) {
      console.warn('[sonar/macro-indicators]', e?.message || e);
      return [];
    }
  },
};

export default macroIndicators;
