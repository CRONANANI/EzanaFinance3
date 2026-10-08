import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { HUB_SLUGS, dimensionForSlug } from '@/lib/datasets/hubs';
import { HUB_EXAMPLE_PROMPTS, HUB_LINKAGES, HUB_WILL_SHOW } from '@/lib/datasets/hub-config';
import { dimensionHasQueryableData } from '@/lib/ezanaql/catalog';
import { HUB_SEEDS } from '@/lib/ezanaql/seeds';
import { HubQueryProvider, HubBar } from '@/components/datasets/hub/HubClient';
import {
  HubStats,
  HubStatsSkeleton,
  DatasetCard,
  CardSkeleton,
  LinkageCard,
  LinkageSkeleton,
} from './HubCards';
import CapitolWatchHub from './capitol/CapitolWatchHub';
import './hub.css';

/**
 * Dimension hub: one page per dataset dimension. Summarises every dataset in
 * the dimension, carries the EzanaQL bar scoped to it, and shows the
 * cross-dataset activity a reader can act on. Each card streams on its own
 * Suspense boundary, so one slow read never holds the page. Reads are cached
 * for 15 minutes (tag `hubs`).
 */
export const revalidate = 900;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(HUB_SLUGS).map((hub) => ({ hub }));
}

function dimensionFor(params) {
  const id = dimensionForSlug(params?.hub);
  return DATASET_TAXONOMY.find((d) => d.id === id) || null;
}

export function generateMetadata({ params }) {
  const dim = dimensionFor(params);
  if (!dim) return {};
  return {
    title: `${dim.label} datasets and EzanaQL | Ezana`,
    description: `${dim.tagline}. ${dim.blurb}`,
  };
}

/* Public sources named on the page: the live datasets' plus the linkage cards'. */
function sourceLine(dim) {
  const list = [
    ...dim.items.filter((it) => it.live).map((it) => it.source),
    ...(HUB_LINKAGES[dim.id] || []).map((c) => c.sources),
  ];
  const parts = new Set();
  for (const s of list) {
    for (const p of String(s || '').split(/\s*[·,]\s*/)) if (p) parts.add(p.trim());
  }
  return [...parts].join(', ');
}

export default function HubPage({ params }) {
  const dim = dimensionFor(params);
  if (!dim) notFound();
  /* Capitol Watch has its own redesigned hub; the other six keep this template. */
  if (dim.id === 'capitol') return <CapitolWatchHub dimension={dim} />;
  const open = dimensionHasQueryableData(dim.id);
  const linkages = HUB_LINKAGES[dim.id] || [];
  const willShow = HUB_WILL_SHOW[dim.id];
  const sources = sourceLine(dim);

  return (
    <HubQueryProvider>
      <div className="hub-page" style={{ '--hub-accent': dim.color }}>
        <header className="hub-header">
          <p className="hub-eyebrow">
            <i className={`bi ${dim.biIcon}`} aria-hidden="true" /> Datasets · {dim.label}
          </p>
          <h1 className="hub-title">{dim.label}</h1>
          <p className="hub-tagline">{dim.tagline}</p>
          <p className="hub-blurb">{dim.blurb}</p>
          <Suspense fallback={<HubStatsSkeleton />}>
            <HubStats dimension={dim} />
          </Suspense>
        </header>

        <section className="hub-section" aria-label="EzanaQL">
          {open ? (
            <HubBar
              dimension={dim.id}
              seedQuery={HUB_SEEDS[dim.id] || ''}
              examplePrompts={HUB_EXAMPLE_PROMPTS[dim.id] || []}
            />
          ) : (
            <p className="hub-closed">
              <i className="bi bi-terminal" aria-hidden="true" /> EzanaQL queries open when this
              dimension&apos;s first dataset goes live.
            </p>
          )}
        </section>

        <section className="hub-section" aria-labelledby="hub-datasets">
          <h2 className="hub-h2" id="hub-datasets">
            Datasets
          </h2>
          <div className="hub-grid">
            {dim.items.map((item) => (
              <Suspense key={item.label} fallback={<CardSkeleton label={item.label} />}>
                <DatasetCard item={item} />
              </Suspense>
            ))}
          </div>
        </section>

        {linkages.length ? (
          <section className="hub-section" aria-labelledby="hub-signals">
            <h2 className="hub-h2" id="hub-signals">
              {linkages.every((c) => c.preview) ? 'Preview' : 'Signals across datasets'}
            </h2>
            <div className="hub-links">
              {linkages.map((card) => (
                <Suspense key={card.id} fallback={<LinkageSkeleton card={card} />}>
                  <LinkageCard card={card} dimension={dim.id} />
                </Suspense>
              ))}
            </div>
          </section>
        ) : null}

        {willShow ? (
          <section className="hub-section" aria-labelledby="hub-will-show">
            <article className="hub-card hub-will">
              <div className="hub-card-head">
                <h2 className="hub-card-title" id="hub-will-show">
                  What this dimension will show
                </h2>
                <span className="hub-tag hub-tag--soon">Roadmap</span>
              </div>
              <ul className="hub-will-list">
                {willShow.map((w) => (
                  <li key={w.dataset}>
                    <strong>{w.dataset}</strong>
                    <span>{w.signal}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}

        {sources ? (
          <p className="hub-sources">
            <span>Sources</span> {sources}
          </p>
        ) : null}
      </div>
    </HubQueryProvider>
  );
}
