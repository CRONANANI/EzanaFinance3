'use client';

/**
 * SonarAdaptiveReport (Nov 16, 2026): the page for an adaptive research
 * report (src/lib/sonar/adaptive). A report is an ordered list of typed
 * sections chosen for the question; this component draws them in that order
 * with one renderer per type. It decides nothing: which sections exist and
 * which comes first was settled by the layout planner from the evidence.
 *
 * Same shell and visual language as the exemplary brief (the sxb- styles):
 * the question and Ping, an anchor row built from the sections present, flat
 * sections on hairlines, sources, a follow-up field. Different questions get
 * different sections, not a different design.
 *
 * report       the validated report from /api/sonar/landing-query
 * onPing(q)    a new question from the top field
 * onFollowUp(q, extra, thread)  a follow-up, with the thread it is asked in
 * onDeep()     deep research on this question (optional)
 */
import { useEffect, useId, useRef, useState } from 'react';
import { followUpContext } from '@/lib/sonar/workspace';
import { SonarResearchControls } from '../SonarResearchControls';
import SonarExemplaryChart, { dayLabel } from '../exemplary/SonarExemplaryChart';
import SonarTechnicalChart from './SonarTechnicalChart';
import '../exemplary/sonar-exemplary-brief.css';
import './sonar-adaptive.css';

const pad2 = (n) => String(n).padStart(2, '0');

const ANCHOR_LABELS = {
  verified_event_status: 'Status',
  ohlcv_technical: 'Chart',
  metric_table: 'Readings',
  forecast_market: 'Markets',
  candidate_table: 'Candidates',
  news_timeline: 'Reporting',
  scenario_matrix: 'Scenarios',
  price_comparison: 'Market context',
  watchpoints: 'Monitor',
  sources: 'Sources',
};

const CLASS_LABELS = {
  official: 'Official',
  reported: 'Reported',
  other: 'Other source',
  computed: 'Computed',
  dataset: 'Dataset',
};

function Cites({ ids, sources }) {
  const list = (ids || []).map((id) => sources.find((s) => s.id === id)).filter(Boolean);
  if (!list.length) return null;
  return (
    <span className="sxb-cites">
      {' ['}
      {list.map((src, i) => (
        <span key={src.id}>
          {i ? ', ' : ''}
          {src.url ? (
            <a href={src.url} target="_blank" rel="noopener noreferrer" title={src.title}>
              {src.id}
            </a>
          ) : (
            <a href="#sar-sources" title={src.title}>
              {src.id}
            </a>
          )}
        </span>
      ))}
      {']'}
    </span>
  );
}

/* ── one renderer per section type ── */

function EventStatus({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">Where things stand</h2>
        <p className="sxb-section-note">Checked {dayLabel(s.checkedAt)}</p>
      </div>
      <p className={`sar-status sar-status--${s.status}`}>
        <i
          className={`bi ${s.status === 'event_verified' || s.status === 'event_superseded' ? 'bi-check-lg' : 'bi-question-lg'}`}
          aria-hidden="true"
        />
        {s.statusLabel}
      </p>
      <p className="sar-prose">
        {s.summary}
        <Cites ids={s.cites} sources={sources} />
      </p>
      {s.facts?.length ? (
        <dl className="sar-facts">
          {s.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}

function Markets({ s }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">Venue-implied prices, not forecasts</p>
      </div>
      <div className="sxb-table-scroll">
        <table className="sxb-table sar-markets">
          <thead>
            <tr>
              <th scope="col">Contract</th>
              <th scope="col">Yes</th>
              <th scope="col">No</th>
              <th scope="col">Volume</th>
              <th scope="col">Closes</th>
              <th scope="col">Indexed</th>
            </tr>
          </thead>
          <tbody>
            {s.markets.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  <a href={m.url} target="_blank" rel="noopener noreferrer">
                    {m.question}
                  </a>
                  <span className="sxb-table-role">{m.venue}</span>
                  {m.lowLiquidity ? <span className="sar-flag">Thinly traded</span> : null}
                </th>
                <td className="sar-num">{m.yesPrice.toFixed(2)}</td>
                <td className="sar-num">{m.noPrice.toFixed(2)}</td>
                <td className="sar-num">
                  {m.volume == null
                    ? 'N/A'
                    : `${Math.round(m.volume).toLocaleString('en-US')} ${m.volumeUnit}`}
                </td>
                <td className="sar-num">{m.endDate ? dayLabel(m.endDate) : 'N/A'}</td>
                <td className="sar-num">
                  {m.freshness === 'stale' ? 'Stale, ' : 'Latest indexed, '}
                  {dayLabel(m.indexedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sxb-footnote">{s.note}</p>
    </>
  );
}

function Candidates({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">{s.note}</p>
      </div>
      {s.rows.length ? (
        <div className="sxb-table-scroll">
          <table className="sxb-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Current role</th>
                <th scope="col">Why named</th>
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td>{r.role}</td>
                  <td>
                    {r.reason}
                    <Cites ids={r.cites} sources={sources} />
                    {r.caveat ? <span className="sar-caveat"> {r.caveat}</span> : null}
                  </td>
                  <td className={r.basis === 'board_confirmed' ? 'sxb-table-confirmed' : undefined}>
                    {r.basisLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sar-empty">{s.emptyText}</p>
      )}
    </>
  );
}

function Timeline({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        {s.note ? <p className="sxb-section-note">{s.note}</p> : null}
      </div>
      <div className="sar-timeline">
        {s.items.map((e) => (
          <div key={`${e.date}-${e.title}`} className="sxb-event">
            <time dateTime={e.date || undefined}>{e.date ? dayLabel(e.date) : 'Undated'}</time>
            <div>
              <h3>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.title}
                  </a>
                ) : (
                  e.title
                )}
              </h3>
              <p>
                {e.text ? `${e.text} ` : ''}
                <span className="sar-src">
                  {CLASS_LABELS[e.sourceClass] || 'Source'} &middot; {e.publisher}
                  {e.corroboration > 1 ? ` and ${e.corroboration - 1} more` : ''}
                </span>
                <Cites ids={e.cites} sources={sources} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Scenarios({ s }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">{s.label}</p>
      </div>
      <div className="sxb-findings sar-scenarios">
        {s.rows.map((r, i) => (
          <article key={r.title} className="sxb-finding">
            <p className="sxb-finding-count">Scenario {pad2(i + 1)}</p>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function Metrics({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">
          As of {dayLabel(s.asOf)}
          <Cites ids={s.cites} sources={sources} />
        </p>
      </div>
      <div className="sxb-table-scroll">
        <table className="sxb-table sar-metrics">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Value</th>
              <th scope="col">Reading</th>
              <th scope="col">How it is computed</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td className="sar-num">{r.value}</td>
                <td>{r.note}</td>
                <td className="sar-method">{r.method || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ListBlock({ title, items }) {
  return (
    <>
      <h2 className="sxb-mid-title">{title}</h2>
      <ol className="sxb-watch">
        {items.map((w, i) => (
          <li key={w}>
            <span aria-hidden="true">{pad2(i + 1)}</span>
            {w}
          </li>
        ))}
      </ol>
    </>
  );
}

function Sources({ sources }) {
  return (
    <>
      <h2 className="sxb-mid-title">Evidence and sources</h2>
      <ul className="sxb-sources">
        {sources.map((src) => (
          <li key={src.id}>
            <span className="sxb-source-id">{src.id}</span>
            <div>
              <p className="sxb-source-title">{src.title}</p>
              <p className="sxb-source-detail">
                {[
                  CLASS_LABELS[src.sourceClass],
                  src.publisher,
                  src.detail,
                  src.date ? dayLabel(src.date) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {src.url ? (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${src.title} in a new tab`}
              >
                Open
                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function SonarAdaptiveReport({ report, onPing, onFollowUp, onDeep = null }) {
  const { sections, sources } = report;
  const lead = sections.find((s) => s.type === 'lead');
  const follow = sections.find((s) => s.type === 'followups');
  const body = sections.filter((s) => s.type !== 'lead' && s.type !== 'followups');
  const anchors = body.filter(
    (s) => ANCHOR_LABELS[s.type] && (s.type !== 'sources' || sources.length),
  );
  const [question, setQuestion] = useState(report.resolvedQuestion || report.question);
  const [followUp, setFollowUp] = useState('');
  const [active, setActive] = useState('overview');
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const qId = useId();
  const fId = useId();

  useEffect(() => {
    document.body.classList.add('sonar-exemplary-active');
    return () => document.body.classList.remove('sonar-exemplary-active');
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting);
        if (seen.length) setActive(seen[0].target.dataset.anchor);
      },
      { rootMargin: '-120px 0px -65% 0px' },
    );
    root.querySelectorAll('[data-anchor]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const ask = (text) => {
    const q = String(text || '')
      .trim()
      .slice(0, 600);
    if (!q) return;
    const t = report.thread || {};
    const context = followUpContext({
      question: t.question || report.resolvedQuestion,
      headline: t.headline || lead?.headline,
      summary: t.summary || lead?.text,
      subject: t.subject || null,
      ticker: t.ticker || null,
    });
    onFollowUp?.(
      q,
      { followUp: { context } },
      { ...context, person: t.person || null, event: t.event || null },
    );
  };

  const render = (s) => {
    switch (s.type) {
      case 'verified_event_status':
        return <EventStatus s={s} sources={sources} />;
      case 'forecast_market':
        return <Markets s={s} />;
      case 'candidate_table':
        return <Candidates s={s} sources={sources} />;
      case 'news_timeline':
        return <Timeline s={s} sources={sources} />;
      case 'scenario_matrix':
        return <Scenarios s={s} />;
      case 'ohlcv_technical':
        return <SonarTechnicalChart section={s} />;
      case 'metric_table':
        return <Metrics s={s} sources={sources} />;
      case 'price_comparison':
        return <SonarExemplaryChart chart={s.chart} />;
      case 'watchpoints':
        return <ListBlock title={s.title} items={s.items} />;
      case 'limitations':
        return (
          <>
            <h2 className="sxb-mid-title">Limits of this answer</h2>
            <ul className="sar-limits">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </>
        );
      case 'sources':
        return sources.length ? <Sources sources={sources} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="sxb sar" ref={rootRef} data-scenario={report.scenario?.key}>
      <form
        className="sxb-question"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = question.trim().slice(0, 600);
          if (q) onPing?.(q);
        }}
      >
        <div className="sxb-query">
          <i className="bi bi-search" aria-hidden="true" />
          <label htmlFor={qId} className="sxb-sr">
            Your question
          </label>
          <input
            id={qId}
            ref={inputRef}
            type="text"
            name="q"
            autoComplete="off"
            maxLength={600}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="button"
            className="sxb-query-edit"
            onClick={() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
          >
            Edit
          </button>
        </div>
        <button type="submit" className="sxb-ping" disabled={!question.trim()}>
          Ping
          <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </button>
      </form>

      {follow ? (
        <div className="sxb-related sxb-related--top">
          <span>Follow-ups</span>
          {follow.related.map((q) => (
            <button key={q} type="button" className="sxb-related-q" onClick={() => ask(q)}>
              {q}
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      <nav className="sxb-tabs" aria-label="Sections of this answer">
        <a
          href="#sar-overview"
          aria-current={active === 'overview' ? 'true' : undefined}
          onClick={() => setActive('overview')}
        >
          Overview
        </a>
        {anchors.map((s) => (
          <a
            key={s.type}
            href={`#sar-${s.type}`}
            aria-current={active === s.type ? 'true' : undefined}
            onClick={() => setActive(s.type)}
          >
            {ANCHOR_LABELS[s.type]}
          </a>
        ))}
      </nav>

      {/* The answer template's top zone: the lead on the left, Research Controls on the right. */}
      <div className="sxb-top">
        <div className="sxb-top-main">
          <header className="sxb-hero" id="sar-overview" data-anchor="overview">
            <h1>{lead.headline}</h1>
            <p className="sxb-deck">
              {lead.text}
              <Cites ids={lead.cites} sources={sources} />
            </p>
            <p className="sxb-provenance">
              <span>
                <i className="sxb-dot" aria-hidden="true" />
                {report.scenario.label}
              </span>
              <span>Research as of {dayLabel(report.asOf)}</span>
              {lead.computed ? <span>Figures computed from daily prices</span> : null}
              {report.degraded?.includes('live_research') ? (
                <span>Verification did not complete</span>
              ) : null}
              {sources.length ? (
                <a href="#sar-sources" className="sxb-provenance-sources">
                  {sources.length} {sources.length === 1 ? 'source' : 'sources'} cited
                </a>
              ) : null}
            </p>
          </header>
        </div>
        <aside className="sxb-rail" aria-label="Research controls">
          <SonarResearchControls variant="flat" />
        </aside>
      </div>

      {body.map((s) => {
        const content = render(s);
        if (!content) return null;
        return (
          <section
            key={s.type}
            className={`sxb-block sar-block sar-block--${s.type}${s.secondary ? ' sar-block--secondary' : ''}`}
            id={`sar-${s.type}`}
            data-anchor={ANCHOR_LABELS[s.type] ? s.type : undefined}
          >
            {content}
          </section>
        );
      })}

      {follow ? (
        <section className="sxb-block" aria-labelledby="sar-continue-h">
          <h2 className="sxb-mid-title" id="sar-continue-h">
            Continue your research
          </h2>
          <form
            className="sxb-followup"
            onSubmit={(e) => {
              e.preventDefault();
              ask(followUp);
            }}
          >
            <label htmlFor={fId} className="sxb-sr">
              Ask a follow-up
            </label>
            <input
              id={fId}
              type="text"
              autoComplete="off"
              maxLength={600}
              value={followUp}
              placeholder={follow.placeholder}
              onChange={(e) => setFollowUp(e.target.value)}
            />
            <button type="submit" className="sxb-ask" disabled={!followUp.trim()}>
              Ask
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
          </form>
        </section>
      ) : null}

      <footer className="sxb-foot">
        <span>Ezana Sonar &middot; Evidence-led financial research</span>
        <span>
          {onDeep ? (
            <>
              <button type="button" className="sxb-foot-deep" onClick={onDeep}>
                Run deep research on this question
              </button>{' '}
              &middot;{' '}
            </>
          ) : null}
          Findings only, not investment advice
        </span>
      </footer>
    </div>
  );
}
