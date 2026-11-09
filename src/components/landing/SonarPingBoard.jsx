'use client';

/**
 * SonarPingBoard (Nov 2026): the shared answer board for every quick ping on /datasets that
 * is not a country intelligence answer (a company, a member of Congress, a sector, an
 * industry, flows, sanctions, a commodity, an open question). The same rows as the country
 * board and the research board (docs/sonar/answer-templates), filled from the ping:
 *
 *   Nov 9, 2026: an answer whose chart is the answer (leadsWithVisual: the insider-buying
 *   race) opens on row 4, full width, in place of row 1; its brief stays readable to screen
 *   readers and its notice, deep research action and free pings sit with the chart.
 *
 *   1. Executive answer (the brief, deep research, the dossier link) | Top matches
 *      Nov 2026, one listed company: an equity research brief (identity, headline, summary,
 *      three takeaways, a sources footer) | Valuation snapshot (its multiples against its own
 *      history) in place of Top matches, which stay in Evidence from Ezana datasets
 *   2. KPI strip (a company's valuation; nothing when there is none, Nov 9)
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
import {
  pingKpis,
  topMatches,
  answerParagraphs,
  companyBrief,
  companyIdentity,
  splitCitations,
  briefFooter,
  exploreValuationAction,
  leadsWithVisual,
} from '@/lib/sonar/ping-board';
import { anchorCells, isEquityAnswer } from '@/lib/sonar/answer-sections';
import { ValuationSnapshot, fmtDate } from '@/components/sonar/valuation/ValuationSnapshot';
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
      <span className="snr-bd-eyebrow">Desk summary</span>
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

/* Citation markers as small links to the sources section. */
function Cited({ text }) {
  return splitCitations(text).map((p, i) =>
    p.cite ? (
      <a key={i} className="snr-pb-cite" href="#sa-sources" aria-label={`Source ${p.cite}`}>
        {p.cite}
      </a>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

const TAKEAWAY_ICON = {
  Valuation: 'bi-speedometer2',
  Fundamentals: 'bi-bar-chart-line',
  'Primary consideration': 'bi-exclamation-diamond',
};

/* Nov 2026: the executive answer for one listed company, as an equity research brief. The
   headline, summary and takeaways are the brief's own text (lib/sonar/ping-board
   companyBrief); an older brief without a headline shows its summary and keeps the rest
   behind "More from the brief", never relabelled. */
function CompanyExecutive({ live, identity, deepAction, notice }) {
  const id = useId();
  const brief = companyBrief(live?.answer);
  const foot = briefFooter(live);
  const toVisual = () => {
    const el = document.getElementById(VISUAL_ID);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };
  return (
    <article className="snr-bd-card snr-bd-exec snr-pb-co" aria-labelledby={id}>
      <span className="snr-bd-eyebrow">Desk summary</span>
      {notice}
      <header className="snr-pb-co-id">
        <h2 id={id} className="snr-pb-co-name">
          {identity.name} <span className="snr-pb-co-ticker">({identity.ticker})</span>
        </h2>
        {identity.meta.length || identity.asOf ? (
          <p className="snr-pb-co-meta">
            {[...identity.meta, identity.asOf ? `Data as of ${fmtDate(identity.asOf)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </header>
      {brief.headline ? <p className="snr-pb-co-headline">{brief.headline}</p> : null}
      {brief.summary ? (
        <p className="snr-pb-co-summary">
          <Cited text={brief.summary} />
        </p>
      ) : null}
      {brief.takeaways.length ? (
        <ul className="snr-pb-co-takeaways" aria-label="Key takeaways">
          {brief.takeaways.map((t) => (
            <li key={t.label}>
              <i className={`bi ${TAKEAWAY_ICON[t.label]}`} aria-hidden="true" />
              <span>
                <span className="snr-pb-co-tlabel">{t.label}: </span>
                <Cited text={t.text} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {brief.more.length ? (
        <details className="snr-pb-co-more">
          <summary>More from the brief</summary>
          {brief.more.map((p, i) => (
            <p key={i}>
              <Cited text={p} />
            </p>
          ))}
        </details>
      ) : null}
      <div className="snr-bd-actions">
        {deepAction}
        <button type="button" className="snr-bd-link" onClick={toVisual}>
          <i className="bi bi-stack" aria-hidden="true" />
          See the charts and data
        </button>
      </div>
      <footer className="snr-pb-co-foot">
        {[
          foot.cited ? `${foot.cited} cited record${foot.cited === 1 ? '' : 's'}` : null,
          foot.datasets ? `${foot.datasets} Ezana dataset${foot.datasets === 1 ? '' : 's'}` : null,
          foot.web ? `${foot.web} web page${foot.web === 1 ? '' : 's'}` : null,
          foot.asOf ? `Updated ${fmtDate(foot.asOf)}` : null,
          foot.status,
          typeof live?.remaining === 'number'
            ? `${live.remaining} free ping${live.remaining === 1 ? '' : 's'} left`
            : null,
        ]
          .filter(Boolean)
          .map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        <a className="snr-pb-co-srclink" href="#sa-sources">
          Evidence and sources
        </a>
      </footer>
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

function Kpis({ tiles }) {
  if (!tiles?.length) return null;
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

/* Nov 9, 2026: `lead` is the chart-first layout. The answer's question stays the section's
   accessible heading, the brief stays readable to screen readers, and the notice sits above
   the chart with the deep research action and free pings below it. Until the cards land
   (the band's stage 2), a quiet placeholder holds the chart's place so the desk summary
   never flashes in first. */
function Visual({ visual, lead = false, live = null, notice = null, deepAction = null }) {
  const id = useId();
  const paras = lead ? answerParagraphs(live?.answer) : [];
  return (
    <section
      id={VISUAL_ID}
      tabIndex={-1}
      className={`snr-bd-section snr-pb-visual${lead ? ' snr-pb-visual--lead' : ''}`}
      aria-labelledby={id}
    >
      <Eyebrow icon="bi-bar-chart-line" id={id}>
        Charts and data
      </Eyebrow>
      {lead ? (
        <VisuallyHidden as="div">
          <h2>{live?.query}</h2>
          {paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </VisuallyHidden>
      ) : null}
      {lead ? notice : null}
      <div className="snr-pb-visual-body">
        {visual || (lead ? <div className="snr-pb-lead-wait" aria-hidden="true" /> : null)}
      </div>
      {lead && (deepAction || typeof live?.remaining === 'number') ? (
        <div className="snr-bd-actions snr-pb-lead-actions">
          {deepAction}
          {typeof live?.remaining === 'number' ? (
            <span className="snr-bd-cite">
              ({live.remaining} free ping{live.remaining === 1 ? '' : 's'} left)
            </span>
          ) : null}
        </div>
      ) : null}
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
  /* Nov 2026: one listed company gets the equity brief and the Valuation snapshot. */
  const identity = companyIdentity(live);
  const equity = isEquityAnswer({ ticker: live?.dossier?.ticker, kind: live?.dossier?.kind });
  const snapshot = identity ? live.dossier.valuation : null;
  /* Nov 9, 2026: chart-first answers drop the desk summary and top matches. */
  const lead = leadsWithVisual(live);
  const right = lead ? null : snapshot?.rows?.length ? 'valuation' : matches ? 'matches' : null;
  const kpiTiles = pingKpis(live);
  const cells = [
    lead
      ? {
          id: 'visual',
          section: 'charts',
          span: 12,
          min: 12,
          node: <Visual visual={visual} lead live={live} notice={notice} deepAction={deepAction} />,
        }
      : {
          id: 'exec',
          section: 'answer',
          span: right ? 7 : 12,
          min: right ? 6 : 12,
          node: identity ? (
            <CompanyExecutive
              live={live}
              identity={identity}
              deepAction={deepAction}
              notice={notice}
            />
          ) : (
            <Executive live={live} answer={answer} deepAction={deepAction} notice={notice} />
          ),
        },
    right === 'valuation'
      ? {
          id: 'valuation',
          section: 'answer',
          span: 5,
          min: 5,
          node: (
            <div className="snr-bd-card snr-pb-vsn">
              <ValuationSnapshot
                snapshot={snapshot}
                identity={identity}
                action={exploreValuationAction(access, { hasSection: false })}
                onDeep={onDeep}
              />
            </div>
          ),
        }
      : null,
    right === 'matches'
      ? { id: 'matches', section: 'answer', span: 5, min: 5, node: <Matches live={live} /> }
      : null,
    /* Nov 9: only when there are measures to show (no empty row, no "Key metrics" nav item). */
    kpiTiles.length
      ? { id: 'kpis', section: 'metrics', span: 12, min: 12, node: <Kpis tiles={kpiTiles} /> }
      : null,
    matches
      ? { id: 'evidence', section: 'findings', span: 7, min: 6, node: <Evidence live={live} /> }
      : null,
    sourceCoverage(live).length
      ? { id: 'coverage', section: 'sources', span: 5, min: 4, node: <Coverage live={live} /> }
      : null,
    visual && !lead
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
    <SonarAnswerFrame present={present} access={access} onDeep={onDeep} equity={equity}>
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
