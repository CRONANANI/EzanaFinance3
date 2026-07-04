'use client';

import PersonalizationRadar from '@/components/landing/PersonalizationRadar';
import { DIMENSION_SOURCE_DETAILS } from '@/lib/datasets/taxonomy';

/**
 * Landing "Data & Resources" section — the orbital 7-dimension radar. The
 * dimension names, ids, and per-source lists now come from the shared
 * DATASET_TAXONOMY (src/lib/datasets/taxonomy.js) so the orbital card, the
 * top-nav Datasets menu, the in-page CategoryBar, and the signal map can never
 * drift. This component keeps only its own layout/copy.
 */
export function ResourcesSection() {
  const sourceDetails = DIMENSION_SOURCE_DETAILS;

  return (
    <section className="resources-section" id="resources">
      <div className="resources-container">
        <div className="resources-header">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--emerald-text)] mb-3">
            Data &amp; Resources
          </div>
          <h2 style={{ color: 'var(--emerald)' }}>Seven dimensions, weighted to you.</h2>
          <p
            className="max-w-[600px] mx-auto px-6 text-sm leading-relaxed mt-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Ezana never stops studying your activity, risk tolerance and interests &mdash;
            continuously retuning how much each domain weighs. The further a dimension drifts from
            the core, the more it shapes the news in your dashboard right now.
          </p>
        </div>

        <div className="w-full max-w-[1100px] mx-auto mt-1">
          <PersonalizationRadar sourceDetails={sourceDetails} />
        </div>
      </div>
    </section>
  );
}
