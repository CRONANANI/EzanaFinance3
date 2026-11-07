'use client';

/**
 * SonarPingBoard (Nov 2026): the shared answer board for every quick ping on /datasets that
 * is not a country intelligence answer (a company, a member of Congress, a sector, an
 * industry, flows, sanctions, a commodity, an open question). The same rows as the country
 * board and the research board (docs/sonar/answer-templates), filled from the ping:
 *
 *   1. Executive answer (the brief, deep research, the dossier link) | Top matches
 *   2. KPI strip (a company's valuation, else what the ping drew on)
 *   3. Evidence from Ezana datasets | Source coverage
 *   4. Charts and data: the ping's own cards (price chart, portfolio, value chain, news),
 *      laid two across
 *   5. Web pages the brief read
 *
 * with the side navigation (SonarAnswerFrame): five free sections, seven locked ones and
 * their call to action. Every row is packed edge to edge (boardSpans). Sonar card rule: no
 * outlines, no borders. Styles: sonar-country-board.css (snr-bd-) and sonar-ping-board.css.
 */

import { useId } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { SonarAnswerFrame } from '@/components/sonar/SonarAnswerFrame';
import { boardSpans, sourceCoverage, datasetEvidence, hostOf } from '@/lib/sonar/country-board';
import { pingKpis, topMatches, answerParagraphs } from '@/lib/sonar/ping-board';
import { anchorCells } from '@/lib/sonar/answer-sections';
import { Eyebrow, Coverage, Evidence } from './SonarCountryBoard';
import './country-intel.css';
import './sonar-country-board.css';
import './sonar-ping-board.css';

const VISUAL_ID = 'snr-pb-visual';

function Executive({ live, answer, deepAction, notice }) {
  const id = useId();
  const paras = answerParagraphs(live?.answer);
  const toVisual = () => {
    const el = document.getElementById(VISUAL_ID);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };
  return (
    <article className="snr-bd-card snr-bd-exec" aria-labelledby={id}>
      <span className="snr-bd-eyebrow">Executive answer</span>
      {notice}
      <h2 id={id} className="snr-pb-q">
        {live?.query}
      </h2>
      {/* The host's paragraphs (commodity figures stay buttons that open their chart). */}
      {answer || (
        <div className="snr-pb-answer">
          {paras.map((p, i) => (
            <p key={i} className={i === 0 ? 'snr-bd-headline snr-pb-lead' : 'snr-bd-lede'}>
              {p}
            </p>
          ))}
        </div>
      )}
      <div className="snr-bd-actions">
        {deepAction}
        <button type="button" className="snr-bd-link" onClick={toVisual}>
          <i className="bi bi-stack" aria-hidden="true" />
          See the charts and data
        </button>
        {typeof live?.remaining === 'number' ? (
          <span className="snr-bd-cite">
            ({live.remaining} free ping{live.remaining === 1 ? '' : 's'} left)
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Matches({ live }) {
  const id = useId();
  const rows = topMatches(live, 5);
  return (
    <section className="snr-bd-card" aria-labelledby={id}>
      <Eyebrow icon="bi-bullseye" id={id}>
        Top matches
      </Eyebrow>
      <ol className="snr-pb-matches">
        {rows.map((r, i) => (
          <li key={r.id} className="snr-pb-match">
            <span className="snr-pb-rank" aria-hidden="true">
              #{i + 1}
            </span>
            <span className="snr-pb-match-body">
              <span className="snr-bd-tag">{r.chip}</span>
              {r.href ? (
                r.external ? (
                  <a
                    className="snr-pb-match-title"
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.title}
                    <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
                  </a>
                ) : (
                  <Link className="snr-pb-match-title" href={r.href}>
                    {r.title}
                  </Link>
                )
              ) : (
                <span className="snr-pb-match-title">{r.title}</span>
              )}
              {r.summary ? <span className="snr-pb-match-sum">{r.summary}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Kpis({ live }) {
  const tiles = pingKpis(live);
  if (!tiles.length) return null;
  return (
    <ul className="snr-pb-kpis" aria-label="Key measures" style={{ '--pb-kpis': tiles.length }}>
      {tiles.map((t) => (
        <li key={t.id} className="snr-bd-card snr-pb-kpi">
          <i className={`bi ${t.icon} snr-pb-kpi-ico`} aria-hidden="true" />
          <span className="snr-pb-kpi-text">
            <span className="snr-pb-kpi-value">{t.value}</span>
            <span className="snr-pb-kpi-label">{t.label}</span>
            {t.sub ? <span className="snr-pb-kpi-sub">{t.sub}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Visual({ visual }) {
  const id = useId();
  return (
    <section
      id={VISUAL_ID}
      tabIndex={-1}
      className="snr-bd-section snr-pb-visual"
      aria-labelledby={id}
    >
      <Eyebrow icon="bi-bar-chart-line" id={id}>
        Charts and data
      </Eyebrow>
      <div className="snr-pb-visual-body">{visual}</div>
    </section>
  );
}

function WebSources({ live }) {
  const id = useId();
  const web = (live?.webSources || []).filter((w) => w?.url);
  if (!web.length) return null;
  return (
    <section className="snr-bd-card snr-pb-web" aria-labelledby={id}>
      <Eyebrow icon="bi-globe2" id={id}>
        Web pages the brief read
      </Eyebrow>
      <ul className="snr-pb-weblist">
        {web.map((w) => (
          <li key={w.url}>
            <a href={w.url} target="_blank" rel="noopener noreferrer" className="snr-pb-webchip">
              <i className="bi bi-link-45deg" aria-hidden="true" />
              <span>{w.title || hostOf(w.url)}</span>
              <span className="snr-pb-host">{hostOf(w.url)}</span>
              <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * live        the ping response
 * answer      the host's rendered answer paragraphs (optional; plain paragraphs otherwise)
 * visual      the ping's own cards (the host's right-hand stack content)
 * deepAction  inline deep research action
 * notice      the "showing results for" notice
 * access, onDeep  the side navigation's lock state and its deep research action
 */
export function SonarPingBoard({
  live,
  answer = null,
  visual = null,
  deepAction = null,
  notice = null,
  access = null,
  onDeep = null,
}) {
  if (!live) return null;
  const matches = datasetEvidence(live).length;
  const cells = [
    {
      id: 'exec',
      section: 'answer',
      span: matches ? 7 : 12,
      min: matches ? 6 : 12,
      node: <Executive live={live} answer={answer} deepAction={deepAction} notice={notice} />,
    },
    matches
      ? { id: 'matches', section: 'answer', span: 5, min: 5, node: <Matches live={live} /> }
      : null,
    { id: 'kpis', section: 'metrics', span: 12, min: 12, node: <Kpis live={live} /> },
    matches
      ? { id: 'evidence', section: 'findings', span: 7, min: 6, node: <Evidence live={live} /> }
      : null,
    sourceCoverage(live).length
      ? { id: 'coverage', section: 'sources', span: 5, min: 4, node: <Coverage live={live} /> }
      : null,
    visual
      ? { id: 'visual', section: 'charts', span: 12, min: 12, node: <Visual visual={visual} /> }
      : null,
    (live.webSources || []).length
      ? { id: 'web', section: 'sources', span: 12, min: 12, node: <WebSources live={live} /> }
      : null,
  ].filter(Boolean);
  const spans = boardSpans(cells);
  const anchors = anchorCells(cells);
  const present = [...new Set(cells.map((c) => c.section))];
  return (
    <SonarAnswerFrame present={present} access={access} onDeep={onDeep}>
      <div className="snr-cii snr-board snr-pb" role="region" aria-label={`${live.query}: answer`}>
        <div className="snr-bd-grid">
          {cells.map((c) => (
            <div
              key={c.id}
              id={anchors.get(c.id)}
              className={`snr-bd-cell snr-bd-cell--${c.id}`}
              style={{ '--bd-span': spans.get(c.id)?.wide, '--bd-span-mid': spans.get(c.id)?.mid }}
            >
              {c.node}
            </div>
          ))}
        </div>
      </div>
    </SonarAnswerFrame>
  );
}

export default SonarPingBoard;
