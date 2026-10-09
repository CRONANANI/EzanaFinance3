/**
 * The selected dimension, expanded: roll-ups, every dataset with its figures,
 * source type and link, and roadmap rows that show no figures at all.
 *
 * A server component. Figures come from figuresFor (each dataset's own
 * summary, cached 15 minutes) and stream in on this panel's own Suspense
 * boundary; a failed read is a middle dot and a note, never a number.
 */
import Link from 'next/link';
import { SOURCE_TYPE_META } from '@/lib/datasets/taxonomy';
import { figuresFor } from './data';
import { MIDDOT, compactCount, int, rollup, shortDay } from './derive';

const TYPE_LABEL = { gov: 'Gov', public: 'Public', licensed: 'Licensed', none: 'Commercial' };

function TypeTag({ type }) {
  const t = SOURCE_TYPE_META[type] ? type : 'none';
  return (
    <span className={`dso-type dso-type--${t}`} title={SOURCE_TYPE_META[t]?.label}>
      {TYPE_LABEL[t]}
    </span>
  );
}

function Head({ dim, figures }) {
  const { records, freshest } = figures || {};
  return (
    <div className="dso-detail-head">
      <span className="dso-detail-ic" aria-hidden="true">
        <i className={`bi ${dim.icon}`} />
      </span>
      <div className="dso-detail-id">
        <h2 className="dso-detail-name" id={`dso-detail-${dim.id}`}>
          {dim.label}
          <span className="dso-detail-tag" aria-hidden="true">
            Selected on the sonar
          </span>
        </h2>
        <p className="dso-detail-blurb">{dim.blurb}</p>
      </div>
      <dl className="dso-rollups">
        <div>
          <dt>Datasets</dt>
          <dd className="dso-mono">
            {dim.liveCount} of {dim.total} live
          </dd>
        </div>
        <div>
          <dt>Records</dt>
          <dd className="dso-mono">
            {figures === undefined ? (
              <span className="dso-skel dso-skel--num" />
            ) : dim.isLive ? (
              (compactCount(records) ?? MIDDOT)
            ) : (
              MIDDOT
            )}
          </dd>
        </div>
        <div>
          <dt>Freshest</dt>
          <dd className="dso-mono">
            {figures === undefined ? (
              <span className="dso-skel dso-skel--num" />
            ) : (
              (shortDay(freshest) ?? MIDDOT)
            )}
          </dd>
        </div>
      </dl>
      <Link className="dso-btn-ink" href={dim.hubHref} data-dso-event="dsx_hub_open">
        Open hub <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Table({ dim, figures }) {
  return (
    <div className="dso-table" role="table" aria-labelledby={`dso-detail-${dim.id}`}>
      <div className="dso-tr dso-th" role="row">
        <span role="columnheader">Dataset</span>
        <span role="columnheader" className="dso-col-what">
          What is in it
        </span>
        <span role="columnheader" className="dso-col-type">
          Type
        </span>
        <span role="columnheader" className="dso-num">
          Records
        </span>
        <span role="columnheader" className="dso-num">
          Freshest
        </span>
        <span role="columnheader" className="dso-col-open">
          <span className="dso-sr">Open</span>
        </span>
      </div>

      {dim.live.map((ds) => {
        const f = figures?.[ds.label];
        const loading = figures === undefined;
        const failed = !loading && (!f || f.error);
        return (
          <div className="dso-tr" role="row" key={ds.label}>
            <span role="cell" className="dso-ds-name">
              {ds.href ? <Link href={ds.href}>{ds.label}</Link> : ds.label}
            </span>
            <span role="cell" className="dso-col-what dso-ds-desc">
              {ds.description}
            </span>
            <span role="cell" className="dso-col-type">
              <TypeTag type={ds.sourceType} />
            </span>
            <span role="cell" className="dso-num dso-mono dso-records">
              {loading ? (
                <span className="dso-skel dso-skel--num" />
              ) : failed ? (
                MIDDOT
              ) : (
                int(f.records)
              )}
            </span>
            <span role="cell" className="dso-num dso-mono dso-fresh">
              {loading ? (
                <span className="dso-skel dso-skel--num" />
              ) : failed ? (
                MIDDOT
              ) : (
                (shortDay(f.freshest) ?? MIDDOT)
              )}
            </span>
            <span role="cell" className="dso-col-open">
              {ds.href ? (
                <Link
                  className="dso-open"
                  href={ds.href}
                  aria-label={`Open ${ds.label}`}
                  data-dso-event="dsx_dataset_open"
                >
                  Open <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              ) : null}
            </span>
          </div>
        );
      })}

      {dim.road.map((ds) => (
        <div className="dso-tr is-road" role="row" key={ds.label}>
          <span role="cell" className="dso-ds-name">
            <span className="dso-road-dot" aria-hidden="true" />
            {ds.label}
          </span>
          <span role="cell" className="dso-col-what dso-ds-desc">
            On the roadmap; no figures until it is live
          </span>
          <span role="cell" className="dso-col-type">
            <TypeTag type={ds.sourceType} />
          </span>
          <span role="cell" className="dso-num dso-mono">
            {MIDDOT}
          </span>
          <span role="cell" className="dso-num dso-mono">
            {MIDDOT}
          </span>
          <span role="cell" className="dso-col-open">
            <span className="dso-soon">Soon</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Caption({ dim, failed }) {
  const sources = dim.sources.length
    ? dim.sources.join(', ')
    : 'named when the first dataset is live';
  return (
    <p className="dso-caption">
      Select any blip on the sonar to inspect its dimension here.{' '}
      {dim.isLive ? "Figures come from each dataset's own summary, cached 15 minutes. " : ''}
      {failed ? 'Some figures are unavailable just now. ' : ''}
      Sources: {sources}.
    </p>
  );
}

function Frame({ dim, children }) {
  return (
    <section
      className="dso-detail"
      style={{ '--dso-c': dim.color }}
      aria-labelledby={`dso-detail-${dim.id}`}
    >
      {children}
    </section>
  );
}

/** Streams in: figures for every live dataset in the dimension. */
export async function DetailPanel({ dim }) {
  if (!dim.isLive) {
    return (
      <Frame dim={dim}>
        <Head dim={dim} figures={{ records: null, freshest: null }} />
        <Table dim={dim} figures={{}} />
        <Caption dim={dim} failed={false} />
      </Frame>
    );
  }
  const labels = dim.live.map((d) => d.label);
  const figures = await figuresFor(labels);
  const roll = rollup(labels, figures);
  return (
    <Frame dim={dim}>
      <Head dim={dim} figures={roll} />
      <Table dim={dim} figures={figures} />
      <Caption dim={dim} failed={roll.failed} />
    </Frame>
  );
}

/** The same panel with every figure as a skeleton. */
export function DetailPanelSkeleton({ dim }) {
  return (
    <Frame dim={dim}>
      <Head dim={dim} figures={undefined} />
      <Table dim={dim} figures={undefined} />
      <Caption dim={dim} failed={false} />
    </Frame>
  );
}
