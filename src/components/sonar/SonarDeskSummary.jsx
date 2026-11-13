'use client';

/**
 * SonarDeskSummary (Sonar research workspace, Nov 13 2026): the one answer card every Sonar
 * board opens with (the ping board, the country board, the research board), so the three
 * stay identical. Each board feeds it its own answer; nothing here invents a field.
 *
 *   header   icon tile, "Desk summary", then the research mode and when the answer was
 *            produced (the answer's own timestamp, the reader's locale); "Data as of" is a
 *            separate item when the data has its own date. `actions` is the slot for Save,
 *            Share and More.
 *   left     the notice, the headline, the summary (citation markers jump to the sources),
 *            the board's actions (deep research, remaining pings), then Market Context for
 *            one listed company.
 *   right    Key takeaways (two or more, else no card) and Evidence and sources (the true
 *            count, the first three rows, "View all sources").
 *
 * The two columns stack below about 800px of card width (container query). Also exports the
 * "Explore related questions" row and the loading skeleton. Sonar card rule: no outlines and
 * no borders; surface tint only. Styles: sonar-desk-summary.css (sds-).
 */

import { useId } from 'react';
import dynamic from 'next/dynamic';
import { VisuallyHidden } from '@/components/ds';
import { splitCitations } from '@/lib/sonar/ping-board';
import { MODE_LABEL, answeredLabel, dayLabel } from '@/lib/sonar/desk-summary';
import './sonar-desk-summary.css';

/* Below the headline: loaded on demand, its height reserved by .sds-mc-slot. */
const SonarMarketContext = dynamic(() => import('./SonarMarketContext'), {
  ssr: false,
  loading: () => <div className="sds-mc-wait" aria-hidden="true" />,
});

/** Citation markers as small links to the sources section. */
export function Cited({ text }) {
  return splitCitations(text).map((p, i) =>
    p.cite ? (
      <a key={i} className="sds-cite" href="#sa-sources" aria-label={`Source ${p.cite}`}>
        {p.cite}
      </a>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

function scrollToSources(e) {
  const el = typeof document !== 'undefined' ? document.getElementById('sa-sources') : null;
  if (!el) return;
  e.preventDefault();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

function Takeaways({ items }) {
  const id = useId();
  if (!items || items.length < 2) return null;
  return (
    <section className="sds-card" aria-labelledby={id}>
      <h3 id={id} className="sds-label">
        <i className="bi bi-lightbulb" aria-hidden="true" />
        Key takeaways
      </h3>
      <ul className="sds-takeaways">
        {items.map((t, i) => (
          <li key={i}>
            <Cited text={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sources({ rows, count }) {
  const id = useId();
  return (
    <section className="sds-card" aria-labelledby={id}>
      <h3 id={id} className="sds-label">
        <i className="bi bi-journal-text" aria-hidden="true" />
        Evidence and sources <span className="sds-count">({count})</span>
      </h3>
      {count ? (
        <>
          <ul className="sds-sources">
            {rows.map((r) => {
              const inner = (
                <>
                  <span className="sds-src-tile" aria-hidden="true">
                    {r.initial}
                  </span>
                  <span className="sds-src-text">
                    <span className="sds-src-name">{r.name}</span>
                    {r.descriptor ? <span className="sds-src-desc">{r.descriptor}</span> : null}
                    {r.date ? <span className="sds-src-date">{r.date}</span> : null}
                  </span>
                  {r.href && r.external ? (
                    <i className="bi bi-box-arrow-up-right sds-src-out" aria-hidden="true" />
                  ) : null}
                </>
              );
              return (
                <li key={r.key}>
                  {r.href ? (
                    <a
                      className="sds-src"
                      href={r.href}
                      {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {inner}
                      {r.external ? <VisuallyHidden> (opens in a new tab)</VisuallyHidden> : null}
                    </a>
                  ) : (
                    <span className="sds-src">{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <a className="sds-all" href="#sa-sources" onClick={scrollToSources}>
            View all sources
            <i className="bi bi-arrow-down-short" aria-hidden="true" />
          </a>
        </>
      ) : (
        <p className="sds-empty">No supporting source was returned for this answer.</p>
      )}
    </section>
  );
}

/**
 * mode        'quick' | 'standard' | 'deep'
 * answeredAt  ISO timestamp the answer was produced (never the render time)
 * dataAsOf    the data's own as-of date (YYYY-MM-DD), shown apart from answeredAt
 * meta        extra meta items (strings), e.g. the research controls a run used
 * actions     slot for Save, Share and More
 * subhead     a line above the headline (a company's identity, "Follow-up to: ...")
 * notice      the "showing results for" notice
 * headline    the answer's headline; `question` titles the card when there is none
 * summary     paragraphs (strings, citations rendered) ...
 * body        ... or the host's own rendered paragraphs (an older answer's fallback)
 * more        paragraphs kept behind "More from the brief"
 * after       anything the board keeps under the summary (limits, a details block)
 * footer      the board's actions row (deep research, charts link, remaining pings)
 * takeaways   strings; fewer than two renders no card
 * sources     rows from deskSourceRows(); sourceCount the true total
 * market      { symbol, benchmark: { symbol, label } } for one listed company, else null
 */
export function SonarDeskSummary({
  mode = 'quick',
  answeredAt = null,
  dataAsOf = null,
  meta = [],
  actions = null,
  subhead = null,
  notice = null,
  headline = null,
  question = null,
  leadFirst = false,
  summary = [],
  body = null,
  more = [],
  after = null,
  footer = null,
  takeaways = [],
  sources = [],
  sourceCount = 0,
  market = null,
}) {
  const id = useId();
  const when = answeredLabel(answeredAt);
  const asOf = dayLabel(dataAsOf);
  const metaItems = [MODE_LABEL[mode] || null, when, ...meta].filter(Boolean);
  const title = headline || question || 'Research answer';
  return (
    <article className="sds" aria-labelledby={id}>
      <header className="sds-head">
        <span className="sds-tile" aria-hidden="true">
          <i className="bi bi-broadcast" />
        </span>
        <span className="sds-eyebrow">Desk summary</span>
        <div className="sds-meta">
          {metaItems.length ? (
            <span className="sds-meta-line">
              {metaItems.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </span>
          ) : null}
          {asOf ? <span className="sds-asof">Data as of {asOf}</span> : null}
        </div>
        {actions ? <div className="sds-actions">{actions}</div> : null}
      </header>
      <div className="sds-body">
        <div className="sds-main">
          {notice}
          {subhead ? <div className="sds-subhead">{subhead}</div> : null}
          <h2 id={id} className={`sds-headline${headline ? '' : ' sds-headline--q'}`}>
            {title}
          </h2>
          {body ||
            (summary.length ? (
              <div className="sds-summary">
                {summary.map((p, i) => (
                  <p key={i} className={leadFirst && i === 0 ? 'sds-lead' : undefined}>
                    <Cited text={p} />
                  </p>
                ))}
              </div>
            ) : null)}
          {more.length ? (
            <details className="sds-more">
              <summary>More from the brief</summary>
              {more.map((p, i) => (
                <p key={i}>
                  <Cited text={p} />
                </p>
              ))}
            </details>
          ) : null}
          {after}
          {footer ? <div className="sds-footer">{footer}</div> : null}
          {market?.symbol ? (
            <div className="sds-mc-slot">
              <SonarMarketContext symbol={market.symbol} benchmark={market.benchmark} />
            </div>
          ) : null}
        </div>
        <aside className="sds-side" aria-label="Takeaways and sources">
          <Takeaways items={takeaways} />
          <Sources rows={sources} count={sourceCount} />
        </aside>
      </div>
    </article>
  );
}

/**
 * Explore related questions: up to four follow-on questions from the answer itself. Choosing
 * one runs it through the host's own ping path. Nothing to show: nothing rendered.
 */
export function SonarRelatedQuestions({ questions = [], onAsk = null }) {
  const id = useId();
  const list = (Array.isArray(questions) ? questions : []).filter(Boolean).slice(0, 4);
  if (!list.length || typeof onAsk !== 'function') return null;
  const ask = (q) => {
    if (typeof window !== 'undefined') {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }
    onAsk(q);
  };
  return (
    <section className="sds-related" aria-labelledby={id}>
      <h2 id={id} className="sds-related-label">
        <i className="bi bi-stars" aria-hidden="true" />
        Explore related questions
      </h2>
      <ul className="sds-related-row">
        {list.map((q) => (
          <li key={q}>
            <button type="button" className="sds-related-q" onClick={() => ask(q)}>
              <i className="bi bi-search sds-related-ico" aria-hidden="true" />
              <span className="sds-related-text">{q}</span>
              <i className="bi bi-arrow-right sds-related-go" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The card's loading state: blocks sized like the headline, paragraph, takeaways, sources. */
export function SonarDeskSummarySkeleton() {
  return (
    <div className="sds sds--wait" role="status" aria-label="Loading the answer">
      <div className="sds-head">
        <span className="sds-tile" aria-hidden="true" />
        <span className="sds-bone sds-bone--eyebrow" />
      </div>
      <div className="sds-body">
        <div className="sds-main">
          <span className="sds-bone sds-bone--headline" />
          <span className="sds-bone sds-bone--headline sds-bone--short" />
          <span className="sds-bone sds-bone--line" />
          <span className="sds-bone sds-bone--line" />
          <span className="sds-bone sds-bone--line sds-bone--short" />
          <span className="sds-bone sds-bone--chart" />
        </div>
        <div className="sds-side">
          <span className="sds-bone sds-bone--card" />
          <span className="sds-bone sds-bone--card" />
        </div>
      </div>
    </div>
  );
}

export default SonarDeskSummary;
