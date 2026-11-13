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
import { SonarNextSteps, SonarRelatedResearch } from '@/components/sonar/SonarWorkspaceRail';
import {
  relatedFromDossierEcho,
  runWorkspaceStep,
  runnableSteps,
  researchMenu,
  mergeRelated,
} from '@/components/sonar/workspace-rail-helpers';
import { SonarSaveActions } from '@/components/sonar/SonarSaveActions';
import { useSonarPlan } from '@/components/sonar/useSonarPlan';
import { useSavedRelated } from '@/components/sonar/useSavedRelated';
import { deskFields } from '@/lib/sonar/saved';
import { nextSteps } from '@/lib/sonar/workspace';
import {
  boardSpans,
  sourceCoverage,
  datasetEvidence,
  hostOf,
  pingResources,
} from '@/lib/sonar/country-board';
import {
  pingKpis,
  topMatches,
  answerParagraphs,
  companyBrief,
  companyIdentity,
  briefFooter,
  exploreValuationAction,
  leadsWithVisual,
} from '@/lib/sonar/ping-board';
import { SonarDeskSummary, SonarRelatedQuestions } from '@/components/sonar/SonarDeskSummary';
import { deskSourceRows, deskTakeaways, summaryParas } from '@/lib/sonar/desk-summary';
import { benchmarkFor } from '@/lib/sonar/market-context';
import { anchorCells, isEquityAnswer } from '@/lib/sonar/answer-sections';
import { ValuationSnapshot } from '@/components/sonar/valuation/ValuationSnapshot';
import { Eyebrow, Coverage, Evidence } from './SonarCountryBoard';
import './country-intel.css';
import './sonar-country-board.css';
import './sonar-ping-board.css';

const VISUAL_ID = 'snr-pb-visual';

function toVisual() {
  const el = document.getElementById(VISUAL_ID);
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}

const remainingLine = (live) =>
  typeof live?.remaining === 'number'
    ? `${live.remaining} free ping${live.remaining === 1 ? '' : 's'} left`
    : null;

/* Nov 13 (research workspace): the answer is the shared Desk Summary. A new answer carries
   its own headline, summary, takeaways and related questions; an older cached one keeps the
   board's reading of the brief (the question as the title, the paragraphs, the lead first). */
function Executive({ live, answer, deepAction, notice, sources, actions = null }) {
  const paras = answerParagraphs(live?.answer, 12);
  const summary = summaryParas(live?.summary);
  const headline = live?.headline || null;
  const left = remainingLine(live);
  return (
    <SonarDeskSummary
      mode="quick"
      answeredAt={live?.answeredAt || null}
      actions={actions}
      notice={notice}
      headline={headline}
      question={live?.query}
      leadFirst={!headline}
      /* The host's paragraphs keep their commodity figure buttons. */
      body={answer || null}
      summary={answer ? [] : headline && summary.length ? summary : paras.slice(0, 4)}
      more={!answer && headline && summary.length ? paras.slice(summary.length) : []}
      footer={
        <div className="snr-bd-actions">
          {deepAction}
          <button type="button" className="snr-bd-link" onClick={toVisual}>
            <i className="bi bi-stack" aria-hidden="true" />
            See the charts and data
          </button>
          {left ? <span className="snr-bd-cite">({left})</span> : null}
        </div>
      }
      takeaways={deskTakeaways(live?.takeaways)}
      sources={deskSourceRows(sources)}
      sourceCount={sources.length}
    />
  );
}

/* Nov 2026: the executive answer for one listed company, as an equity research brief. The
   headline, summary and takeaways are the brief's own text (lib/sonar/ping-board
   companyBrief); an older brief without a headline shows its summary and keeps the rest
   behind "More from the brief", never relabelled. Nov 13: rendered as the Desk Summary, with
   Market Context against the company's sector benchmark. */
function CompanyExecutive({ live, identity, deepAction, notice, sources, market, actions = null }) {
  const brief = companyBrief(live?.answer);
  const foot = briefFooter(live);
  const summary = summaryParas(live?.summary);
  const headline = live?.headline || brief.headline || null;
  return (
    <SonarDeskSummary
      mode="quick"
      answeredAt={live?.answeredAt || null}
      dataAsOf={identity.asOf}
      actions={actions}
      notice={notice}
      subhead={
        <p className="snr-pb-co-id">
          <span className="snr-pb-co-name">
            {identity.name} <span className="snr-pb-co-ticker">({identity.ticker})</span>
          </span>
          {identity.meta.length ? (
            <span className="snr-pb-co-meta"> · {identity.meta.join(' · ')}</span>
          ) : null}
        </p>
      }
      headline={headline}
      question={`${identity.name} (${identity.ticker})`}
      summary={summary.length ? summary : brief.summary ? [brief.summary] : []}
      more={brief.more}
      footer={
        <div className="snr-bd-actions">
          {deepAction}
          <button type="button" className="snr-bd-link" onClick={toVisual}>
            <i className="bi bi-stack" aria-hidden="true" />
            See the charts and data
          </button>
          {[foot.status, remainingLine(live)].filter(Boolean).map((t, i) => (
            <span key={i} className="snr-bd-cite">
              {t}
            </span>
          ))}
        </div>
      }
      takeaways={deskTakeaways(
        live?.takeaways,
        brief.takeaways.map((t) => `${t.label}: ${t.text}`),
      )}
      sources={deskSourceRows(sources)}
      sourceCount={sources.length}
      market={market}
    />
  );
}

/* Nov 13: what Save stores for a quick ping: the Desk Summary as the reader saw it (an older
   answer's own reading where the payload has no fields). Private fields never go in. */
function pingSave(live, sources, identity) {
  const question = live?.rawQuery || live?.query || '';
  const brief = identity ? companyBrief(live?.answer) : null;
  const paras = answerParagraphs(live?.answer, 12);
  const summary =
    live?.summary || (brief?.summary ? brief.summary : paras.slice(0, 3).join('\n\n'));
  return {
    kind: 'ping',
    question,
    subject: live?.dossier?.name || null,
    ticker: live?.dossier?.ticker || null,
    depth: 'quick',
    snapshot: {
      v: 1,
      kind: 'ping',
      ...deskFields({
        question,
        headline: live?.headline || brief?.headline || null,
        summary: summary || null,
        takeaways: deskTakeaways(
          live?.takeaways,
          brief ? brief.takeaways.map((t) => `${t.label}: ${t.text}`) : [],
        ),
        sources: deskSourceRows(sources, 40),
        depth: 'quick',
        answeredAt: live?.answeredAt || null,
      }),
      subject: live?.dossier?.name || null,
      ticker: live?.dossier?.ticker || null,
      dataAsOf: identity?.asOf || null,
      related: live?.related || [],
    },
  };
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
 * onRun       sends a new question through the host's ping path (Next steps, related questions)
 * deepNote    the deep research cost and quota line for the left rail's card
 * queryBar    the workspace's query bar, for the top of the centre column
 */
export function SonarPingBoard({
  live,
  answer = null,
  visual = null,
  deepAction = null,
  notice = null,
  access = null,
  onDeep = null,
  onRun = null,
  deepNote = null,
  queryBar = null,
}) {
  /* Nov 13: who is reading (the Research menu and Save), and their own saved research on
     this subject for the right rail. Hooks before the early return. */
  const sonarPlan = useSonarPlan();
  const signedIn = !sonarPlan.isGuest;
  const savedRelated = useSavedRelated({
    ticker: live?.dossier?.ticker || null,
    subject: live?.dossier?.name || null,
    enabled: signedIn && Boolean(live),
  });
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
  /* Nov 13: every resource the answer used (the Desk Summary's true count) and Market
     Context for one listed company, against its sector benchmark from the dossier profile. */
  const sources = pingResources(live, { max: Infinity });
  const saveActions = (
    <SonarSaveActions
      getSave={() => pingSave(live, sources, identity)}
      question={live?.rawQuery || live?.query || ''}
    />
  );
  const profile = live?.dossier?.profile || {};
  const market =
    identity && equity
      ? {
          symbol: identity.ticker,
          benchmark: benchmarkFor({
            ticker: identity.ticker,
            sector: profile.sector || '',
            industry: profile.industry || live?.dossier?.industry?.name || '',
          }),
        }
      : null;
  const cells = [
    lead
      ? {
          id: 'visual',
          section: 'charts',
          span: 12,
          min: 12,
          node: <Visual visual={visual} lead live={live} notice={notice} deepAction={deepAction} />,
        }
      : /* Nov 13: the Desk Summary takes the full row; the snapshot moves under it. */
        {
          id: 'exec',
          section: 'answer',
          span: 12,
          min: 12,
          node: identity ? (
            <CompanyExecutive
              live={live}
              identity={identity}
              deepAction={deepAction}
              notice={notice}
              sources={sources}
              market={market}
              actions={saveActions}
            />
          ) : (
            <Executive
              live={live}
              answer={answer}
              deepAction={deepAction}
              notice={notice}
              sources={sources}
              actions={saveActions}
            />
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
  /* Nov 13: the workspace's right rail, from this answer's own subject and Echo matches. */
  const steps = runnableSteps(
    nextSteps({
      kind: live?.dossier?.kind || null,
      name: live?.dossier?.name || null,
      ticker: live?.dossier?.ticker || null,
      depth: 'quick',
      unlocked: Boolean(access?.unlocked),
      present,
      canDeep: Boolean(onDeep),
    }),
    { onRun },
  );
  const related = mergeRelated(relatedFromDossierEcho(live?.dossier?.echo), savedRelated);
  const rail =
    steps.length || related.length ? (
      <>
        <SonarNextSteps steps={steps} onStep={(st) => runWorkspaceStep(st, { onDeep, onRun })} />
        <SonarRelatedResearch items={related} moreHref={signedIn ? '/sonar/saved' : null} />
      </>
    ) : null;
  return (
    <SonarAnswerFrame
      present={present}
      access={access}
      onDeep={onDeep}
      equity={equity}
      rail={rail}
      deepNote={deepNote}
      research={researchMenu({ signedIn })}
      top={
        queryBar || live?.related?.length ? (
          <>
            {queryBar}
            <SonarRelatedQuestions questions={live?.related} onAsk={onRun} />
          </>
        ) : null
      }
    >
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
