import DatasetsOverviewClient from './DatasetsOverviewClient';

/**
 * Datasets index — "Interactive Signal Map" (direction 1a). Third page in the
 * redesigned dataset family. The old seven category chips + seven Explore cards
 * are replaced by the shared CategoryBar (none active), a live cross-dataset
 * ticker, an interactive signal-map card, and four sourced category cards.
 * This route opts out of the marketing shell / DatasetsSubnav (see layout.js).
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Datasets | Ezana',
  description:
    "Every signal, sourced and attributed — an interactive map of how Ezana's datasets move each other across congressional, government, SEC, and market data.",
};

export default function DatasetsIndexPage() {
  return <DatasetsOverviewClient />;
}
