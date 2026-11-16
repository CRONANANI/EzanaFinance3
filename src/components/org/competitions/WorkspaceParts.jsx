'use client';

/**
 * Presentational pieces of one event's workspace, shared by the live
 * sub-pages and the sample workspace so both read the same: entry rules,
 * the deliverables checklist, the readiness checklist, a result with its
 * criterion breakdown, and anonymous feedback. No data access here.
 */
import Link from 'next/link';
import {
  NA,
  hostTools,
  SIDE_RULE,
  TICKER_RULE,
  admissionLabel,
  deliverableChecklist,
  fmtDate,
  fmtRank,
  fmtScore,
  fmtWindow,
} from '@/lib/org-competitions-model';

export function KeyValues({ rows }) {
  return (
    <dl className="pcx-kv">
      {rows.map(([label, value, mono]) => (
        <div key={label} className="pcx-kv__row">
          <dt>{label}</dt>
          <dd
            className={`${mono ? 'tcc-mono' : ''}${value == null || value === NA ? ' tcc-na' : ''}`}
          >
            {value ?? NA}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The host's entry rules, read only. */
export function EntryRules({ config, rulesUrl = null }) {
  const c = config || {};
  const kinds = deliverableChecklist(c, []).map((d) => d.label);
  return (
    <KeyValues
      rows={[
        ['Admission', admissionLabel(c.admission_mode)],
        ['Registration window', fmtWindow(c.registration_opens_at, c.registration_closes_at), true],
        ['Teams', c.max_teams ? `Up to ${c.max_teams}` : 'No limit set'],
        ['Teams per council', c.max_teams_per_org ?? 1, true],
        ['Ticker rule', TICKER_RULE[c.ticker_assignment] || NA],
        ['Side rule', SIDE_RULE[c.side_constraint] || NA],
        ['Deliverables', kinds.length ? kinds.join(', ') : 'None required'],
        ['Deliverables due', fmtDate(c.deliverable_due_at), true],
        ['Eligibility', c.eligibility_note || NA],
        ...(rulesUrl
          ? [
              [
                'Rules',
                <a
                  key="r"
                  className="tcc-link"
                  href={rulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the rules <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>,
              ],
            ]
          : []),
      ]}
    />
  );
}

/** Each required deliverable, handed in or not, with its due date. */
export function DeliverableList({ config, submittedKinds }) {
  const items = deliverableChecklist(config, submittedKinds);
  if (!items.length) return <p className="tcc-state">The host has not set deliverables.</p>;
  return (
    <ul className="pcx-checklist">
      {items.map((d) => (
        <li key={d.kind} className={d.done ? 'is-met' : ''}>
          <i className={`bi ${d.done ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" />
          <span className="pcx-checklist__label">
            {d.label}
            <span className="tcc-sr">{d.done ? ', handed in' : ', not handed in'}</span>
          </span>
          <span className={`tcc-mono pcx-checklist__due${d.due ? '' : ' tcc-na'}`}>
            {d.due ? `Due ${fmtDate(d.due)}` : NA}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The host's readiness checklist. */
export function ReadinessList({ readiness }) {
  return (
    <ul className="pcx-checklist">
      {readiness.items.map((it) => (
        <li key={it.key} className={it.met ? 'is-met' : ''}>
          <i className={`bi ${it.met ? 'bi-check-circle' : 'bi-circle'}`} aria-hidden="true" />
          <span className="pcx-checklist__label">
            {it.label}
            <span className="tcc-sr">{it.met ? ', done' : ', not done'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A team's result: its rank (no field size for an entrant, which cannot see
 * other teams), its weighted score of 100 and the criterion breakdown.
 */
export function ResultSummary({ result, breakdown = [], field = null }) {
  return (
    <div className="pcx-result">
      <div className="pcx-result__rank">
        <span className="pcx-result__label">Rank</span>
        <span className="tcc-mono pcx-result__value">{fmtRank(result?.rank, field)}</span>
      </div>
      <span className="tcc-vrule" aria-hidden="true" />
      <div className="pcx-result__crit">
        <span className="pcx-result__label">
          Weighted score <span className="tcc-mono">{fmtScore(result?.weighted_total)}</span> of{' '}
          <span className="tcc-mono">100</span>
          {result?.judge_count ? (
            <>
              {' '}
              from <span className="tcc-mono">{result.judge_count}</span>{' '}
              {result.judge_count === 1 ? 'judge' : 'judges'}
            </>
          ) : null}
        </span>
        <dl className="pcx-crit">
          {breakdown.map((c) => (
            <div key={c.id || c.label}>
              <dt>{c.label}</dt>
              <dd className={`tcc-mono${c.avg == null ? ' tcc-na' : ''}`}>
                {c.avg == null ? NA : `${fmtScore(Math.round(c.avg * 10) / 10)}/${c.max_score}`}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Feedback as quotes. `label` shows only when the caller is the host. */
export function FeedbackList({ items = [] }) {
  if (!items.length) return <p className="tcc-state">No written feedback was submitted.</p>;
  return (
    <ul className="pcx-quotes">
      {items.map((f, i) => (
        <li key={i}>
          <q>{f.comment}</q>
          {f.label && <span className="pcx-quotes__by">{f.label}</span>}
        </li>
      ))}
    </ul>
  );
}

/** The host tools as text links (Structure, Invitations, Rubric, Join requests, Scoreboard). */
export function HostToolsNav({ slug, active }) {
  return (
    <nav className="pcx-subtabs" aria-label="Host tools">
      {hostTools(slug).map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`tcc-toggle${active === t.key ? ' is-on' : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
