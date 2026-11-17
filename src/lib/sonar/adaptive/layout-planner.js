/**
 * Sonar adaptive research: the layout planner (Nov 2026).
 *
 * The research produces whatever sections the evidence supports. This module
 * decides which of them appear and in what order, from the scenario's layout
 * (profiles.js). Nothing here writes content.
 *
 * Rules:
 *   - the order is the scenario's, so two questions about the same company
 *     lead with different things
 *   - a section with no evidence behind it is left out: there are no empty
 *     chart slots and no hollow widgets
 *   - an absence the reader should know about is stated once, in limitations
 *     (no matching prediction market; no price data), not as an empty card
 *   - sources, limitations and follow-ups close every report
 *
 * Pure. No I/O.
 */
import { SCENARIO_BY_ID } from './profiles';

const ABSENCE_NOTES = {
  forecast_market:
    'No directly matching active prediction contract was found, so no market-implied prices are shown.',
  ohlcv_technical: 'Daily price bars were not available, so no chart or indicator is shown.',
  price_comparison: 'No listed security was identified, so no price comparison is shown.',
};

/**
 * @param {object} plan  the ResearchPlan
 * @param {Record<string, object|null>} built  section type -> section, or null when the research
 *        could not support it
 * @returns {{ sections: object[], omitted: { type: string, reason: string }[] }}
 */
export function selectComponents(plan, built) {
  const profile = SCENARIO_BY_ID[plan.primaryScenario];
  /* An executor may order its own sections for the question asked (geo-economic.js leads a
     gold question with gold). Otherwise the scenario's layout decides. */
  const own = Array.isArray(built._order)
    ? ['lead', ...built._order.filter((t) => t !== 'lead')]
    : null;
  const order = own || (profile ? profile.layout : ['lead', 'sources', 'limitations', 'followups']);
  const sections = [];
  const omitted = [];
  const notes = [];
  for (const type of order) {
    if (type === 'limitations') continue; // placed last-but-one, after the absences are known
    const section = built[type];
    if (section) sections.push({ type, ...section });
    else if (type !== 'followups' && type !== 'sources') {
      omitted.push({ type, reason: 'no supporting evidence' });
      if (ABSENCE_NOTES[type] && wasExpected(plan, type)) notes.push(ABSENCE_NOTES[type]);
    }
  }
  const base = built.limitations?.items || [];
  const items = [...base, ...notes.filter((n) => !base.includes(n))];
  if (items.length) {
    const at = sections.findIndex((s) => s.type === 'followups');
    const block = { type: 'limitations', items };
    if (at === -1) sections.push(block);
    else sections.splice(at, 0, block);
  }
  return { sections, omitted };
}

/* An absence is worth a sentence only where the reader would look for the thing. */
function wasExpected(plan, type) {
  if (type === 'forecast_market') return plan.optionalEvidence.includes('prediction_markets');
  if (type === 'ohlcv_technical') return plan.requiredEvidence.includes('market_prices_ohlcv');
  if (type === 'price_comparison') return plan.primaryScenario === 'A05';
  return false;
}
