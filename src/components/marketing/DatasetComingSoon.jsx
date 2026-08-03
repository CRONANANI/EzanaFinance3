'use client';

import Link from 'next/link';
import { Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import CategoryBar from '@/components/datasets/CategoryBar';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';

/**
 * Coming-soon panel for a dataset route taken offline pending completion. The
 * taxonomy still marks the item live:false (nav renders it "Soon"); the layout
 * gate routes direct-URL hits here instead of the half-built page. Honest and
 * empty — no fake preview, no blurred screenshot, no "notify me" form.
 *
 * The dataset name is resolved from the taxonomy by matching the item `href` to
 * the current pathname, so the CategoryBar highlights the right dimension too.
 */
function resolveByHref(pathname) {
  for (const dim of DATASET_TAXONOMY) {
    const item = dim.items.find((it) => it.href === pathname);
    if (item) return { dim, item };
  }
  return { dim: null, item: null };
}

export function DatasetComingSoon({ pathname }) {
  const { dim, item } = resolveByHref(pathname);
  const name = item?.label || 'This dataset';

  return (
    <>
      <CategoryBar active={dim?.id} activeItem={item?.label} />
      <div className="dsx-main">
        <div className="mkt-hero">
          <p className="mkt-eyebrow">Datasets</p>
          <h1 className="mkt-h1">
            <Clock size={22} aria-hidden style={{ marginRight: '0.5rem', verticalAlign: '-3px' }} />
            {name}
          </h1>
          <p className="mkt-lead">This dataset is being completed and isn’t published yet.</p>
        </div>

        <div className="mkt-cta-block" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/datasets" className="mkt-cta-btn">
            <ArrowLeft size={18} aria-hidden />
            Back to datasets
          </Link>
          <Link href="/datasets/government/contracts" className="mkt-cta-btn">
            Explore a live dataset
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </>
  );
}
