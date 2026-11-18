/**
 * Sonar adaptive research: financial explainer (Nov 18, 2026). Family 08.
 *
 * A definitional question ("What is the difference between nominal and real interest
 * rates?") is answered from a reviewed, versioned glossary entry (methodology-glossary.js),
 * not from a model and not with invented numbers. It rides on the entry's scenario (C04 for
 * rates, C01 for FX conventions) so routing, quotas, saving and streaming stay the same; the
 * router sets plan.explainer and the scenario's executor hands the plan here.
 *
 * A question that names a country or a company is not an explainer: it goes to the research
 * scenario that reads that country's or company's figures. The explainer's follow-ups do
 * exactly that hand-off.
 *
 * Pure.
 */
import { countryOf } from './country-ref';
import { glossaryEntryFor, GLOSSARY_BY_ID, GLOSSARY_VERSION } from './methodology-glossary';

/** { entry } when the question is definitional and an entry covers it; else null. */
export function explainerIntent(text, { hasCompany = false } = {}) {
  if (hasCompany) return null;
  if (countryOf(text)) return null; // a named country wants its figures
  const entry = glossaryEntryFor(text);
  return entry ? { entry: entry.id, scenario: entry.scenario } : null;
}

/** The typed sections for one glossary entry. */
export function buildExplainer(entryId) {
  const e = GLOSSARY_BY_ID[entryId];
  if (!e) return null;
  const built = {
    lead: {
      kicker: 'Financial explainer',
      headline: e.headline,
      text: e.text,
      asOf: `Methodology entry ${e.version}, reviewed ${e.reviewed.at}`,
    },
    ex_definitions: { title: 'Definitions', note: 'Plain-language research', items: e.definitions },
    ex_equations: { title: 'Equations', note: 'No numerical example without real observations', items: e.equations },
    ex_measures: { title: 'Choosing the right measure', items: e.measures },
    ex_diagram: { title: 'Interpretation diagram', nodes: e.diagram.nodes, caption: e.diagram.caption },
    ex_method: { title: 'Research methodology', items: e.method },
    ex_sources: { title: 'Sources to verify', items: e.verify },
    limitations: {
      items: [
        'A conceptual explanation from Ezana’s reviewed methodology library. It contains no market data or forecast.',
        'Ask about a named country or company to see its own dated figures.',
      ],
    },
    followups: { placeholder: 'Ask about a country, a company or another concept', related: e.followups.slice(0, 3) },
    _order: ['lead', 'ex_definitions', 'ex_equations', 'ex_measures', 'ex_diagram', 'ex_method', 'ex_sources', 'limitations', 'followups'],
  };
  return {
    built,
    sources: [],
    thread: { subject: null, headline: e.headline, summary: e.text },
    audit: { glossary: GLOSSARY_VERSION, entry: e.id, version: e.version },
  };
}

/** The executor strategy: null lets the scenario answer the usual way. */
export async function runExplainer(plan) {
  return plan.explainer ? buildExplainer(plan.explainer.entry) : null;
}
