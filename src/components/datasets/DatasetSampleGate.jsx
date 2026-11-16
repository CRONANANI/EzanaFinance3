'use client';

import Link from 'next/link';
import { SkeletonRegion, Skeleton, SkeletonTable } from '@/components/ds';
import { useDatasetSampleViewer } from './sample-viewer';
import './dataset-preview.css';

/**
 * Honest empty state for a dataset page whose source is not connected yet.
 * Everyone who is not a master admin or demo account sees this instead of
 * sample rows, so an invented figure is never presented as a real record.
 */
export function DatasetNotConnected({ name, dimension, compact = false }) {
  const body = (
    <section className="dsp-empty" aria-labelledby="dsp-empty-title">
      <h2 id="dsp-empty-title" className="dsp-empty-line">
        <i className="bi bi-plug" aria-hidden="true" />
        This dataset&apos;s source is not connected yet.
      </h2>
      <Link href="/datasets" className="dsp-link">
        Back to datasets
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </section>
  );
  if (compact) return body;
  return (
    <div className="dsp-page">
      <DatasetIdentity name={name} dimension={dimension} />
      {body}
    </div>
  );
}

/** The compact identity row every dataset page carries: eyebrow and name. */
export function DatasetIdentity({ name, dimension, meta = null, sample = false }) {
  return (
    <header className="dsp-identity">
      <div className="dsp-identity-text">
        <p className="dsp-eyebrow">{dimension ? `Datasets · ${dimension}` : 'Datasets'}</p>
        <h1 className="dsp-title">{name}</h1>
      </div>
      <div className="dsp-identity-meta">
        {sample ? <SampleContentLabel /> : null}
        {meta}
      </div>
    </header>
  );
}

/** Small grey label shown whenever sample content is on screen. */
export function SampleContentLabel() {
  return (
    <span className="dsp-sample" title="Shown to admin and demo accounts only. Not real records.">
      <i className="bi bi-eye" aria-hidden="true" />
      Sample content
    </span>
  );
}

function GateSkeleton() {
  return (
    <SkeletonRegion label="Loading dataset" className="dsp-page">
      <Skeleton width={240} height={24} />
      <div className="dsp-skel-gap">
        <SkeletonTable rows={8} cols={5} />
      </div>
    </SkeletonRegion>
  );
}

/**
 * Shows `children` when the page has real data (isSample false). When the page
 * only has sample content, shows it to admin and demo accounts and `fallback`
 * (the honest empty state) to everyone else.
 */
export function DatasetSampleGate({ isSample = true, fallback, children }) {
  const viewer = useDatasetSampleViewer(isSample);
  if (!isSample) return children;
  if (viewer === 'loading') return <GateSkeleton />;
  if (viewer === true) return children;
  return fallback;
}
