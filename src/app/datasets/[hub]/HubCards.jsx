import Link from 'next/link';
import { cache } from 'react';
import { getDatasetSummary, getLinkage, SUMMARY_LABELS } from '@/lib/datasets/hub-data';
import { PLANNED_SOURCE } from '@/lib/datasets/hub-config';
import { COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';
import { RowActions } from '@/components/datasets/hub/HubClient';
import { fmt, isMono } from './hub-format';

/* One read per dataset per request, shared by the stat strip and the cards. */
export const summaryFor = cache((label) =>
  SUMMARY_LABELS.includes(label) ? getDatasetSummary(label) : Promise.resolve(null),
);

const DASH = '–';

function Value({ kind, value }) {
  const text = fmt(kind, value);
  return <span className={isMono(kind) ? 'hub-mono' : undefined}>{text ?? DASH}</span>;
}

/* ── stat strip ───────────────────────────────────────────────────────── */

export async function HubStats({ dimension }) {
  const items = dimension.items;
  const live = items.filter((it) => it.live);
  /* Fund Holdings Data and SEC EDGAR read the same filings; count them once. */
  const labels = [
    ...new Set(live.map((it) => (it.label === 'Fund Holdings Data' ? 'SEC EDGAR' : it.label))),
  ];
  const sums = await Promise.all(labels.map((l) => summaryFor(l)));
  const records = sums.reduce((s, x) => s + (x?.records || 0), 0);
  /* Never report a date after today as the latest data. */
  const today = new Date().toISOString().slice(0, 10);
  const latest = sums.reduce(
    (m, x) => (x?.freshest && x.freshest <= today && x.freshest > (m || '') ? x.freshest : m),
    null,
  );
  return (
    <dl className="hub-stats">
      <div className="hub-stat">
        <dt>Live datasets</dt>
        <dd className="hub-mono">
          {live.length} of {items.length}
        </dd>
      </div>
      <div className="hub-stat">
        <dt>Records</dt>
        <dd className="hub-mono">{records ? fmt('int', records) : DASH}</dd>
      </div>
      <div className="hub-stat">
        <dt>Latest data</dt>
        <dd className="hub-mono">{latest ? fmt('date', latest) : DASH}</dd>
      </div>
    </dl>
  );
}

export function HubStatsSkeleton() {
  return (
    <dl className="hub-stats" aria-busy="true">
      {['Live datasets', 'Records', 'Latest data'].map((l) => (
        <div className="hub-stat" key={l}>
          <dt>{l}</dt>
          <dd>
            <span className="hub-skel hub-skel--short" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ── dataset summary cards ────────────────────────────────────────────── */

function CardHead({ item, tag }) {
  return (
    <div className="hub-card-head">
      <h3 className="hub-card-title">{item.label}</h3>
      {tag ? <span className={`hub-tag hub-tag--${tag.toLowerCase()}`}>{tag}</span> : null}
    </div>
  );
}

export async function DatasetCard({ item }) {
  const s = await summaryFor(item.label);
  const hasData = s && !s.empty && !s.error;

  if (!item.live && !hasData) {
    return (
      <article className="hub-card hub-card--soon">
        <CardHead item={item} tag="Soon" />
        <p className="hub-card-desc">{item.description}</p>
        <p className="hub-card-src">
          <span>Planned source</span> {PLANNED_SOURCE[item.label] || item.source}
        </p>
      </article>
    );
  }

  return (
    <article className="hub-card">
      <CardHead item={item} tag={!item.live && hasData ? 'Preview' : null} />
      <p className="hub-card-desc">{item.description}</p>
      {s?.error ? (
        <p className="hub-empty">These figures could not be loaded just now.</p>
      ) : !hasData ? (
        <p className="hub-empty">
          No records yet. {s?.fills || 'Fills as the ingest for this dataset runs.'}
        </p>
      ) : (
        <dl className="hub-nums">
          {s.numbers.map((x) => (
            <div key={x.label} className="hub-num">
              <dt>{x.label}</dt>
              <dd>
                <Value kind={x.kind} value={x.value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {hasData && s.note ? <p className="hub-card-note">{s.note}</p> : null}
      <div className="hub-card-foot">
        <span className="hub-card-fresh">
          {hasData && s.freshest ? (
            <>
              Freshest <span className="hub-mono">{fmt('date', s.freshest)}</span>
            </>
          ) : null}
        </span>
        <Link href={item.href} className="hub-open">
          Open dataset <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
      <p className="hub-card-src">
        <span>Source</span> {item.source}
      </p>
    </article>
  );
}

export function CardSkeleton({ label }) {
  return (
    <article className="hub-card" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="hub-card-head">
        <h3 className="hub-card-title">{label}</h3>
      </div>
      <span className="hub-skel" />
      <span className="hub-skel" />
      <span className="hub-skel hub-skel--short" />
    </article>
  );
}

/* ── linkage cards ────────────────────────────────────────────────────── */

export async function LinkageCard({ card }) {
  const { rows, error } = await getLinkage(card.id);
  /* A preview of a dataset that is not live shows only when it has rows. */
  if (card.preview && !rows.length && !error) return null;
  return (
    <section className="hub-card hub-link" aria-labelledby={`hub-${card.id}`}>
      <div className="hub-card-head">
        <h3 className="hub-card-title" id={`hub-${card.id}`}>
          {card.title}
        </h3>
        {card.preview ? <span className="hub-tag hub-tag--preview">Preview</span> : null}
      </div>
      <p className="hub-card-desc">{card.why}</p>
      {card.noteKey === 'committee' ? (
        <p className="hub-card-note">{COMMITTEE_SECTOR_NOTE}</p>
      ) : null}
      {card.coverage ? <p className="hub-card-note">{card.coverage}</p> : null}
      {error ? (
        <p className="hub-empty">This signal could not be loaded just now.</p>
      ) : !rows.length ? (
        <p className="hub-empty">{card.empty}</p>
      ) : (
        <ol className="hub-rows">
          {rows.map((r) => (
            <li key={r.key} className="hub-row">
              <div className="hub-row-main">
                <p className="hub-row-title">
                  {r.href ? (
                    r.external ? (
                      <a href={r.href} target="_blank" rel="noopener noreferrer">
                        {r.title}
                      </a>
                    ) : (
                      <Link href={r.href}>{r.title}</Link>
                    )
                  ) : (
                    r.title
                  )}
                  {r.party ? <span className="hub-party">{r.party}</span> : null}
                </p>
                <dl className="hub-row-cells">
                  {r.cells.map((c) => (
                    <div key={c.label} className="hub-cell">
                      <dt>{c.label}</dt>
                      <dd>
                        <Value kind={c.kind} value={c.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <RowActions ticker={r.ticker || null} query={r.query || null} label={r.title} />
            </li>
          ))}
        </ol>
      )}
      <p className="hub-card-src">
        <span>{card.window}</span> {card.sources}
      </p>
    </section>
  );
}

export function LinkageSkeleton({ card }) {
  return (
    <section className="hub-card hub-link" aria-busy="true">
      <div className="hub-card-head">
        <h3 className="hub-card-title">{card.title}</h3>
      </div>
      <p className="hub-card-desc">{card.why}</p>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="hub-skel" />
      ))}
    </section>
  );
}
