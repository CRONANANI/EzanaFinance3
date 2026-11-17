'use client';

/**
 * SonarExemplaryBrief (Nov 16, 2026): the evidence-led Sonar response page.
 * One reading canvas that scrolls once: the question, an anchor row, the lead
 * insight, three takeaways, a full-width market chart, what happened, how the
 * market may read it, where the impact could travel, the operating baseline,
 * what to monitor, the sources, and a follow-up field.
 *
 * It draws an exemplary brief (src/lib/sonar/exemplary): a hand-reviewed,
 * dated, sourced answer served for the exact question it answers. The page
 * shows only what the brief holds; the chart alone is live, drawn from real
 * daily closes (SonarExemplaryChart).
 *
 * Flat sections and hairlines; tokens only; Bootstrap Icons; always dark, like
 * every Sonar answer (the host wraps it in force-dark-theme). Styles:
 * sonar-exemplary-brief.css (sxb-).
 *
 * brief        the public brief (publicBrief())
 * onPing(q)    a new question from the top field: the host pings it
 * onFollowUp(q, extra, thread)  a follow-up: routed by the host with the thread it was asked in
 * onDeep()     deep research on this question (optional)
 */
import { useEffect, useId, useRef, useState } from 'react';
import { followUpContext } from '@/lib/sonar/workspace';
import SonarExemplaryChart, { dayLabel } from './SonarExemplaryChart';
import './sonar-exemplary-brief.css';

const ANCHORS = [
  ['overview', 'Overview'],
  ['market', 'Market reaction'],
  ['happened', 'What happened'],
  ['impact', 'Industry impact'],
  ['sources', 'Sources'],
];

const pad2 = (n) => String(n).padStart(2, '0');

function Cites({ ids, sources }) {
  if (!ids?.length) return null;
  return (
    <span className="sxb-cites">
      {' ['}
      {ids.map((id, i) => {
        const src = sources.find((s) => s.id === id);
        return (
          <span key={id}>
            {i ? ', ' : ''}
            {src ? (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${src.title}, ${dayLabel(src.date)}`}
              >
                {id}
              </a>
            ) : (
              id
            )}
          </span>
        );
      })}
      {']'}
    </span>
  );
}

export default function SonarExemplaryBrief({ brief, onPing, onFollowUp, onDeep = null }) {
  const [question, setQuestion] = useState(brief.question);
  const [followUp, setFollowUp] = useState('');
  const [active, setActive] = useState('overview');
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const qId = useId();
  const fId = useId();
  const { sources } = brief;

  /* The page's decorative backdrop is put away while the brief is read (see the CSS). */
  useEffect(() => {
    document.body.classList.add('sonar-exemplary-active');
    return () => document.body.classList.remove('sonar-exemplary-active');
  }, []);

  /* The anchor row follows the section in view. */
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

  const submitQuestion = (e) => {
    e.preventDefault();
    const q = question.trim().slice(0, 600);
    if (q) onPing?.(q);
  };

  const ask = (text) => {
    const q = String(text || '')
      .trim()
      .slice(0, 600);
    if (!q) return;
    const context = followUpContext({
      question: brief.question,
      headline: brief.headline,
      summary: brief.deck,
      subject: brief.entities?.subject || null,
      ticker: brief.entities?.tickers?.[0] || null,
    });
    /* The thread this follow-up is asked in: lets the server resolve "him" and route the
       question to the research it needs. Context only; it is verified again. */
    onFollowUp?.(
      q,
      { followUp: { context } },
      { ...context, person: brief.entities?.people?.[0] || null },
    );
  };

  return (
    <div className="sxb" ref={rootRef}>
      <form className="sxb-question" role="search" onSubmit={submitQuestion}>
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

      <nav className="sxb-tabs" aria-label="Sections of this brief">
        {ANCHORS.map(([id, label]) => (
          <a
            key={id}
            href={`#sxb-${id}`}
            aria-current={active === id ? 'true' : undefined}
            onClick={() => setActive(id)}
          >
            {label}
          </a>
        ))}
      </nav>

      <header className="sxb-hero" id="sxb-overview" data-anchor="overview">
        <h1>{brief.headline}</h1>
        <p className="sxb-deck">{brief.deck}</p>
        <p className="sxb-provenance">
          {brief.provenance.map((line, i) => (
            <span key={line}>
              {i === 0 ? <i className="sxb-dot" aria-hidden="true" /> : null}
              {line}
            </span>
          ))}
          <a href="#sxb-sources" className="sxb-provenance-sources">
            {brief.sourcesLabel}
          </a>
        </p>
      </header>

      <section className="sxb-block" aria-labelledby="sxb-takeaways-h">
        <p className="sxb-kicker" id="sxb-takeaways-h">
          Three takeaways
        </p>
        <div className="sxb-findings">
          {brief.takeaways.map((t, i) => (
            <article key={t.title} className="sxb-finding">
              <p className="sxb-finding-count">
                {pad2(i + 1)} / {t.kicker}
              </p>
              <h3>{t.title}</h3>
              <p>
                {t.text}
                {t.note ? <span className="sxb-finding-note"> {t.note}</span> : null}
                <Cites ids={t.cites} sources={sources} />
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="sxb-block" id="sxb-market" data-anchor="market">
        <SonarExemplaryChart chart={brief.chart} />
      </section>

      <section className="sxb-block sxb-two" id="sxb-happened" data-anchor="happened">
        <div className="sxb-part">
          <h2 className="sxb-mid-title">What happened</h2>
          {brief.timeline.map((e) => (
            <div key={e.date} className="sxb-event">
              <time dateTime={e.date}>{dayLabel(e.date)}</time>
              <div>
                <h3>{e.title}</h3>
                <p>
                  {e.text}
                  <Cites ids={e.cites} sources={sources} />
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="sxb-part">
          <h2 className="sxb-mid-title">How the market may interpret it</h2>
          {brief.interpretation.map((it) => (
            <div key={it.title} className="sxb-interpret">
              <span className="sxb-interpret-icon" aria-hidden="true">
                <i className={`bi ${it.icon}`} />
              </span>
              <div>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sxb-block" id="sxb-impact" data-anchor="impact">
        <div className="sxb-section-top">
          <h2 className="sxb-section-title">{brief.impact.title}</h2>
          <p className="sxb-section-note">{brief.impact.note}</p>
        </div>
        <div className="sxb-table-scroll">
          <table className="sxb-table">
            <thead>
              <tr>
                <th scope="col">Exposure</th>
                <th scope="col">Transmission channel</th>
                <th scope="col">Evidence that would matter</th>
                <th scope="col">Current assessment</th>
              </tr>
            </thead>
            <tbody>
              {brief.impact.rows.map((r) => (
                <tr key={r.exposure}>
                  <th scope="row">
                    {r.exposure} <span className="sxb-table-role">{r.role}</span>
                  </th>
                  <td>{r.channel}</td>
                  <td>{r.evidence}</td>
                  <td className={r.confirmed ? 'sxb-table-confirmed' : undefined}>
                    {r.assessment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sxb-block" aria-labelledby="sxb-baseline-h">
        <div className="sxb-section-top">
          <h2 className="sxb-section-title" id="sxb-baseline-h">
            {brief.baseline.title}
          </h2>
          <p className="sxb-section-note">
            {brief.baseline.note}
            <Cites ids={[brief.baseline.cite]} sources={sources} />
          </p>
        </div>
        <dl className="sxb-kpis">
          {brief.baseline.cells.map((c) => (
            <div key={c.label} className="sxb-kpi">
              <dt>{c.label}</dt>
              <dd>
                <strong>{c.value}</strong>
                <span>{c.sub}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="sxb-footnote">{brief.baseline.footnote}</p>
      </section>

      <section className="sxb-block sxb-two sxb-two--even">
        <div className="sxb-part">
          <h2 className="sxb-mid-title">What to monitor</h2>
          <ol className="sxb-watch">
            {brief.watchpoints.map((w, i) => (
              <li key={w}>
                <span aria-hidden="true">{pad2(i + 1)}</span>
                {w}
              </li>
            ))}
          </ol>
        </div>
        <div className="sxb-part" id="sxb-sources" data-anchor="sources">
          <h2 className="sxb-mid-title">Evidence and sources</h2>
          <ul className="sxb-sources">
            {sources.map((s) => (
              <li key={s.id}>
                <span className="sxb-source-id">{s.id}</span>
                <div>
                  <p className="sxb-source-title">{s.title}</p>
                  <p className="sxb-source-detail">
                    {s.detail} &middot; {dayLabel(s.date)}
                  </p>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${s.title} in a new tab`}
                >
                  Open
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sxb-block" aria-labelledby="sxb-continue-h">
        <h2 className="sxb-mid-title" id="sxb-continue-h">
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
            placeholder={brief.followUp.placeholder}
            onChange={(e) => setFollowUp(e.target.value)}
          />
          <button type="submit" className="sxb-ask" disabled={!followUp.trim()}>
            Ask
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </button>
        </form>
        <div className="sxb-related">
          <span>Related questions</span>
          {brief.followUp.related.map((q) => (
            <button key={q} type="button" className="sxb-related-q" onClick={() => ask(q)}>
              {q}
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

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
