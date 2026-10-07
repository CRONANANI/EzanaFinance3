import Link from 'next/link';
import { cache } from 'react';
import { getDatasetSummary, getLinkage, SUMMARY_LABELS } from '@/lib/datasets/hub-data';
import { PLANNED_SOURCE } from '@/lib/datasets/hub-config';
import { COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';
import { RowActions } from '@/components/datasets/hub/HubClient';
import AwardTradeChart from '@/components/datasets/hub/AwardTradeChart';
import QuickStepBadge from '@/components/datasets/hub/QuickStepBadge';
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

/* Compact: one line of cards across the top of the hub. The description
   rides in the title tooltip; the sources are listed at the foot of the page. */
export async function DatasetCard({ item }) {
  const s = await summaryFor(item.label);
  const hasData = s && !s.empty && !s.error;
  const soon = !item.live && !hasData;
  const lead = hasData ? s.numbers?.[0] : null;
  const second = hasData ? s.numbers?.[1] : null;

  return (
    <article className={`hub-card hub-ds${soon ? ' hub-card--soon' : ''}`} title={item.description}>
      <div className="hub-ds-head">
        <h3 className="hub-ds-title">{item.label}</h3>
        {soon ? (
          <span className="hub-tag hub-tag--soon">Soon</span>
        ) : !item.live && hasData ? (
          <span className="hub-tag hub-tag--preview">Preview</span>
        ) : null}
      </div>
      {soon ? (
        <p className="hub-ds-sub">{PLANNED_SOURCE[item.label] || item.source}</p>
      ) : s?.error ? (
        <p className="hub-ds-sub">Figures unavailable just now</p>
      ) : !hasData ? (
        <p className="hub-ds-sub">No records yet</p>
      ) : (
        <p className="hub-ds-num">
          <span className="hub-ds-value">
            <Value kind={lead.kind} value={lead.value} />
          </span>
          <span className="hub-ds-label">{lead.label}</span>
          {second ? (
            <span className="hub-ds-second">
              <Value kind={second.kind} value={second.value} /> {second.label.toLowerCase()}
            </span>
          ) : null}
        </p>
      )}
      {!soon ? (
        <div className="hub-ds-foot">
          <span className="hub-ds-fresh">
            {hasData && s.freshest ? (
              <span className="hub-mono">{fmt('date', s.freshest)}</span>
            ) : null}
          </span>
          <Link href={item.href} className="hub-open" aria-label={`Open ${item.label}`}>
            Open <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function CardSkeleton({ label }) {
  return (
    <article className="hub-card hub-ds" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="hub-ds-head">
        <h3 className="hub-ds-title">{label}</h3>
      </div>
      <span className="hub-skel" />
      <span className="hub-skel hub-skel--short" />
    </article>
  );
}

/* ── linkage cards ────────────────────────────────────────────────────── */

const pctText = (share) => `${(share * 100).toFixed(1)}%`;
const CHAMBER = { senate: 'Senate', house: 'House', joint: 'Joint' };

/* Every committee with a member holding the row's ticker, highest share
   first. The top share is the row's confidence score. Five show; the rest
   open on request. */
function CommitteeConfidence({ ticker, committees }) {
  if (!committees?.length) {
    return (
      <p className="hub-conf-none">
        No committee member currently shows an open position in{' '}
        <span className="hub-mono">{ticker}</span>.
      </p>
    );
  }
  const item = (c) => {
    const names = c.names.length
      ? c.names.join(', ') + (c.holders > c.names.length ? ' and others' : '')
      : '';
    return (
      <li key={c.id} className="hub-conf-item" title={names ? `Holding: ${names}` : undefined}>
        <span className="hub-conf-name">
          {c.name}
          <span className="hub-conf-chamber">{CHAMBER[c.chamber] || 'House'}</span>
        </span>
        <span className="hub-conf-bar" aria-hidden="true">
          <span style={{ '--w': `${Math.min(100, c.share * 100)}%` }} />
        </span>
        <span className="hub-conf-num hub-mono">
          {pctText(c.share)}
          <span className="hub-conf-of">
            {c.holders}/{c.seats}
          </span>
        </span>
      </li>
    );
  };
  const top = committees[0];
  return (
    <div className="hub-conf">
      <p className="hub-conf-head">
        <span className="hub-conf-score hub-mono">{pctText(top.share)}</span>
        <span>
          confidence: {top.holders} of {top.seats} {top.name} members hold{' '}
          <span className="hub-mono">{ticker}</span>
          {committees.length > 1 ? `, across ${committees.length} committees` : ''}
        </span>
      </p>
      <ul className="hub-conf-list" aria-label={`Committees whose members hold ${ticker}`}>
        {committees.slice(0, 5).map(item)}
      </ul>
      {committees.length > 5 ? (
        <details className="hub-conf-more">
          <summary>{committees.length - 5} more committees</summary>
          <ul className="hub-conf-list">{committees.slice(5).map(item)}</ul>
        </details>
      ) : null}
    </div>
  );
}

/* Companies whose stock tends to move after their awards (leaders card). */
function AwardCompanies({ companies }) {
  if (!companies?.length) return null;
  return (
    <div className="hub-cos">
      <h4 className="hub-cos-title">Companies after their awards</h4>
      <ol className="hub-cos-list">
        {companies.map((c) => (
          <li key={c.ticker} className="hub-cos-item">
            <span className="hub-cos-tk hub-mono">{c.ticker}</span>
            <span className="hub-cos-meta">
              <Value kind="int" value={c.awardDates} /> award dates ·{' '}
              <Value kind="usd" value={c.awardValue} />
            </span>
            <span
              className={`hub-cos-move hub-mono ${(c.avgMovePct ?? 0) >= 0 ? 'is-up' : 'is-down'}`}
            >
              {fmt('signed-pct', c.avgMovePct) ?? DASH}
            </span>
            {c.badge ? <QuickStepBadge kind="company" compact /> : null}
          </li>
        ))}
      </ol>
      <p className="hub-card-note">
        Average stock move in the 30 days after each award date, and how often it rose.
      </p>
    </div>
  );
}

export async function LinkageCard({ card, dimension = null }) {
  const { rows, error, extra } = await getLinkage(card.id);
  /* A preview of a dataset that is not live shows only when it has rows. */
  if (card.preview && !rows.length && !error) return null;
  return (
    <section
      className={`hub-card hub-link${card.wide ? ' hub-link--wide' : ''}`}
      aria-labelledby={`hub-${card.id}`}
    >
      <div className="hub-card-head">
        <h3 className="hub-card-title" id={`hub-${card.id}`}>
          {card.title}
        </h3>
        {card.preview ? <span className="hub-tag hub-tag--preview">Preview</span> : null}
        {card.badges ? <QuickStepBadge kind="actor" earned={false} /> : null}
      </div>
      <p className="hub-card-desc">{card.why}</p>
      {card.noteKey === 'committee' ? (
        <p className="hub-card-note">{COMMITTEE_SECTOR_NOTE}</p>
      ) : null}
      {card.coverage ? <p className="hub-card-note">{card.coverage}</p> : null}
      {error ? (
        <p className="hub-empty">
          This signal could not be loaded just now. It refreshes on its own; reload the page in a
          minute to try again.
        </p>
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
                  {r.tag ? <span className="hub-who">{r.tag}</span> : null}
                  {r.badge ? <QuickStepBadge kind="actor" compact /> : null}
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
                {r.committees ? (
                  <CommitteeConfidence ticker={r.ticker} committees={r.committees} />
                ) : null}
                {r.chart ? <AwardTradeChart {...r.chart} /> : null}
              </div>
              <RowActions
                ticker={r.ticker || null}
                query={r.query || null}
                label={r.title}
                dimension={dimension}
                shareUrl={r.href && !r.external ? r.href : null}
              />
            </li>
          ))}
        </ol>
      )}
      {!error && extra?.companies ? <AwardCompanies companies={extra.companies} /> : null}
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
