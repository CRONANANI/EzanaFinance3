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

/* One line per card, so every headline stays short (30 characters or so). */
const SAMPLE_COPY = {
  capitol: [
    { headline: 'A member buys defence stock', meta: 'sample' },
    { headline: 'Three senators buy a chipmaker', meta: 'sample' },
    { headline: 'A chair sells before a hearing', meta: 'sample' },
  ],
  titans: [
    { headline: 'A fund crosses 5% in a bank', meta: 'sample' },
    { headline: 'An activist asks for two seats', meta: 'sample' },
    { headline: 'Insiders buy after earnings', meta: 'sample' },
  ],
  eyes: [
    { headline: 'An industrial park lights up', meta: 'sample' },
    { headline: 'Port congestion eases', meta: 'sample' },
    { headline: 'Battery patents pile up', meta: 'sample' },
  ],
  whispers: [
    { headline: 'Delivery app downloads jump', meta: 'sample' },
    { headline: 'A retailer hires for logistics', meta: 'sample' },
    { headline: 'Reviews sour on a new device', meta: 'sample' },
  ],
  hive: [
    { headline: 'Odds move 12 points on rates', meta: 'sample' },
    { headline: 'Shutdown odds rise for October', meta: 'sample' },
    { headline: 'A merger market sees a spike', meta: 'sample' },
  ],
  lighthouse: [
    { headline: 'A central bank cuts alone', meta: 'sample' },
    { headline: 'A new sanctions designation', meta: 'sample' },
    { headline: 'Risk rises in three economies', meta: 'sample' },
  ],
  regulatory: [
    { headline: 'Stablecoin rule up for comment', meta: 'sample' },
    { headline: 'Broker settles over disclosures', meta: 'sample' },
    { headline: 'A bill gains a fourth cosponsor', meta: 'sample' },
  ],
};

/* The dimension's name as the one-line cards show it. */
const SHORT_NAME = {
  capitol: 'Capitol',
  titans: 'Titans',
  eyes: 'Eyes Above',
  whispers: 'Whispers',
  hive: 'The Hive',
  lighthouse: 'Lighthouse',
  regulatory: 'Regulatory',
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
      dimension: SHORT_NAME[d.id] || d.label,
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
