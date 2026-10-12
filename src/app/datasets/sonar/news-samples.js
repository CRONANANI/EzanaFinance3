/**
 * Illustrative notifications for the floating cards around the orbital map.
 *
 * Only the copy lives here. The dimension's name, icon and colour are read
 * from DATASET_TAXONOMY (the one source of truth for the seven dimensions),
 * so a renamed or recoloured dimension updates the cards too. Every line is
 * an example of the kind of signal a dimension surfaces: no real ticker,
 * company, member or filing is presented as a live reading.
 */
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';

const SAMPLE_COPY = {
  capitol: [
    { headline: 'A House member discloses a purchase in a defence contractor', meta: 'sample' },
    { headline: 'Three senators file trades in the same chip maker this week', meta: 'sample' },
    { headline: 'A committee chair reports a sale ahead of a hearing', meta: 'sample' },
  ],
  titans: [
    { headline: 'A hedge fund opens a new position above 5% in a regional bank', meta: 'sample' },
    { headline: 'An activist files a 13D and asks for two board seats', meta: 'sample' },
    { headline: 'Insider buying clusters at a mid cap after earnings', meta: 'sample' },
  ],
  eyes: [
    { headline: 'Night lights brighten around a new industrial park', meta: 'sample' },
    { headline: 'Port congestion eases at a major container terminal', meta: 'sample' },
    { headline: 'A patent family grows in solid state battery chemistry', meta: 'sample' },
  ],
  consumer: [
    { headline: 'App downloads for a delivery service jump week on week', meta: 'sample' },
    { headline: 'Job postings at a retailer tilt toward logistics roles', meta: 'sample' },
    { headline: 'Review sentiment turns on a consumer hardware launch', meta: 'sample' },
  ],
  hive: [
    { headline: 'A prediction market moves twelve points on a rate decision', meta: 'sample' },
    { headline: 'Crowd forecasters raise the odds of a shutdown by October', meta: 'sample' },
    { headline: 'Volume spikes on a market about a merger closing', meta: 'sample' },
  ],
  lighthouse: [
    { headline: 'A central bank cuts while its neighbours hold', meta: 'sample' },
    { headline: 'A new designation lands on a sanctions list', meta: 'sample' },
    { headline: 'Geopolitical risk ticks up across three economies', meta: 'sample' },
  ],
  regulatory: [
    { headline: 'A proposed rule opens for comment on stablecoin reserves', meta: 'sample' },
    { headline: 'A regulator settles with a broker over disclosures', meta: 'sample' },
    { headline: 'A bill picks up a fourth cosponsor in committee', meta: 'sample' },
  ],
};

/**
 * The items the ticker cycles through, in taxonomy order, interleaved so
 * consecutive cards come from different dimensions: every dimension's first
 * line, then every dimension's second line, and so on.
 */
export function buildNewsItems(taxonomy = DATASET_TAXONOMY) {
  const perDim = taxonomy.map((d) => {
    const lines = SAMPLE_COPY[d.id] || [];
    return lines.map((l) => ({
      dimensionId: d.id,
      dimension: d.label,
      icon: d.biIcon,
      color: d.color,
      headline: l.headline,
      meta: l.meta,
    }));
  });
  const depth = Math.max(0, ...perDim.map((l) => l.length));
  const out = [];
  for (let i = 0; i < depth; i += 1) {
    for (const lines of perDim) if (lines[i]) out.push(lines[i]);
  }
  return out;
}

/* Exported for the dataset tests: every dimension must have at least two
   sample lines, keyed by a real taxonomy id. */
export const NEWS_SAMPLE_COPY = SAMPLE_COPY;
