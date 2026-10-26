import { Suspense } from 'react';
import { timed } from '@/lib/perf/timed';
import { getEmpireScoresForExplorer } from '@/lib/empire-public-store';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { HUB_EXAMPLE_PROMPTS, HUB_LINKAGES } from '@/lib/datasets/hub-config';
import { dimensionHasQueryableData } from '@/lib/ezanaql/catalog';
import { HUB_SEEDS } from '@/lib/ezanaql/seeds';
import { HubQueryProvider, HubBar } from '@/components/datasets/hub/HubClient';
import { DatasetCard, CardSkeleton, LinkageCard, LinkageSkeleton } from '../[hub]/HubCards';
import EmpireRankingsClient from './EmpireRankingsClient';
import { PAGE_PATH } from './empire-rankings-model';
import '../[hub]/hub.css';
import './empire-rankings.css';

/**
 * Global Empire Rankings: the Global Empire Lighthouse dimension's page.
 * Ezana's own composite of Dalio-style power dimensions, built ONLY from the
 * live, sourced dimensions in country_dimension_scores_mat (World Bank today;
 * placeholder dimensions are listed as pending, never scored). Replaces the
 * in-app /empire-ranking page (redirected) and the generic lighthouse hub,
 * whose dataset cards, cross-dataset cards and EzanaQL bar it keeps below the
 * rankings.
 */
export const revalidate = 3600;

export const metadata = {
  title: 'Global Empire Rankings | Ezana',
  description:
    "Ezana's Global Empire Rankings: countries ranked across live, sourced power dimensions (economic output, growth, debt, trade, education, innovation and more), with every dimension's full table.",
};

const LIGHTHOUSE = DATASET_TAXONOMY.find((d) => d.id === 'lighthouse');

/* What the old hub gave readers, kept: every other dataset in the dimension,
   the EzanaQL bar scoped to it, and its cross-dataset cards. Server
   components (each card streams on its own boundary), handed to the client
   page as a slot. */
function LighthouseDatasets() {
  const items = (LIGHTHOUSE?.items || []).filter((it) => it.href !== PAGE_PATH);
  const linkages = HUB_LINKAGES.lighthouse || [];
  const open = dimensionHasQueryableData('lighthouse');
  return (
    <div className="gerx-hub" style={{ '--hub-accent': LIGHTHOUSE?.color }}>
      <section className="hub-section" aria-labelledby="gerx-datasets">
        <h2 className="mkt-section-title" id="gerx-datasets">
          Datasets in the Global Empire Lighthouse
        </h2>
        <div className="hub-grid">
          {items.map((item) => (
            <Suspense key={item.label} fallback={<CardSkeleton label={item.label} />}>
              <DatasetCard item={item} />
            </Suspense>
          ))}
        </div>
      </section>

      <section className="hub-section" aria-label="EzanaQL">
        {open ? (
          <HubBar
            dimension="lighthouse"
            seedQuery={HUB_SEEDS.lighthouse || ''}
            examplePrompts={HUB_EXAMPLE_PROMPTS.lighthouse || []}
          />
        ) : (
          <p className="hub-closed">
            <i className="bi bi-terminal" aria-hidden="true" /> EzanaQL queries open when this
            dimension&apos;s first dataset goes live.
          </p>
        )}
      </section>

      {linkages.length ? (
        <section className="hub-section hub-links" aria-label="Across the lighthouse datasets">
          {linkages.map((card) => (
            <Suspense key={card.id} fallback={<LinkageSkeleton card={card} />}>
              <LinkageCard card={card} dimension="lighthouse" />
            </Suspense>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default async function GlobalEmpireRankingsPage() {
  const empire = await timed(
    '/datasets/global-empire-lighthouse',
    getEmpireScoresForExplorer,
    'getEmpireScoresForExplorer',
  )();
  return (
    <HubQueryProvider>
      <EmpireRankingsClient empire={empire} datasets={<LighthouseDatasets />} />
    </HubQueryProvider>
  );
}
