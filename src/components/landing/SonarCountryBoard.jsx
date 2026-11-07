'use client';

/**
 * The country answer board (Nov 2026). On /datasets a country question with a Country &
 * Currency Intelligence card ("Is Turkey's lira under pressure?") is answered as one
 * dashboard across the full width, instead of the three columns:
 *
 *   1. Executive answer (headline, the answer, the drivers as bullets, deep research and the
 *      dossier link)            | Country intelligence (flag, name, currency, pressure badge,
 *                                 four KPI tiles with sparklines)
 *   2. Pressure breakdown (component levels, "Ezana thresholds" explainer) | Source coverage
 *   3. Key findings (Nov 7: computed FX findings, lib/sonar/macro/fx-findings), full width;
 *      then Evidence from Ezana datasets (OECD, Empire, macro, Echo, markets, any other cited
 *      dataset)                 | What's moving the story (the news rail, the dataset cards)
 *   4. Key data visualizations (the exchange rate with 3M to 5Y ranges and its 12-month
 *      change, wide | inflation vs the policy rate and the real rate; the REER with its
 *      median and reserves below), full width
 *   5. How pressure can travel (the transmission map), full width
 *   6. Key chart | Key indicators
 *   7. What could happen next | What to monitor and the bottom line
 *   8. Data not available, one strip; then the sources line
 *
 * Every row is packed edge to edge (boardSpans -> packDetailRows): a missing section never
 * leaves a gap or a lone narrow column. 12 columns wide, 6 at mid width, 1 on a phone, keyed
 * off the board's own width (container queries).
 *
 * Sonar card rule: no outlines and no borders. Cards sit on the band's panel surface with the
 * soft shadow (--snr-panel, --snr-soft), exactly like .snr-fund and .snr-news.
 * Styles: sonar-country-board.css (snr-bd-). Data shaping: src/lib/sonar/country-board.js.
 */

import { useCallback, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Table, THead, TBody, TR, TH, TD, VisuallyHidden, Badge, Tooltip } from '@/components/ds';
import { CountryFlag } from '@/components/sonar/CountryFlag';
import { EzanaThresholdsButton } from '@/components/sonar/macro/EzanaThresholds';
import {
  BADGE_TONE,
  intelChartItems,
  TransmissionMap,
  ScenariosSection,
  MonitorSection,
} from './CountryIntelCard';
import { StoryCard, KeyIndicatorsCard } from './SonarCountryStack';
import {
  hasCountryIntel,
  dateLabel,
  sentenceCase,
  missingSentence,
} from '@/lib/sonar/country-intel-view';
import {
  boardHeadline,
  boardAnswer,
  boardKpis,
  sparkGeometry,
  datasetEvidence,
  sourceCoverage,
  boardSpans,
  chartSpans,
} from '@/lib/sonar/country-board';
import { fxFindings } from '@/lib/sonar/macro/fx-findings';
import { SonarAnswerFrame } from '@/components/sonar/SonarAnswerFrame';
import { anchorCells, canRender } from '@/lib/sonar/answer-sections';
import './country-intel.css';
import './sonar-country-board.css';

const CHARTS_ID = 'snr-bd-charts';

function Eyebrow({ icon, id, children }) {
  return (
    <h3 id={id} className="snr-bd-eyebrow">
      {icon ? <i className={`bi ${icon}`} aria-hidden="true" /> : null}
      {children}
    </h3>
  );
}

function Spark({ tile }) {
  const W = 72;
  const H = 28;
  const g = sparkGeometry(tile.spark, { w: W, h: H, kind: tile.kind });
  if (!g) return null;
  return (
    <svg
      className={`snr-bd-spark is-${tile.kind}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      focusable="false"
    >
      {g.bars ? (
        g.bars.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="1" />)
      ) : (
        <>
          <path d={g.d} />
          <circle cx={g.end.x} cy={g.end.y} r="2.25" />
        </>
      )}
    </svg>
  );
}

/* ── 1a. executive answer ─────────────────────────────────────────────── */

function ExecutiveAnswer({ live, intel, deepAction, notice, remaining }) {
  const titleId = useId();
  const headline = boardHeadline({ intel, query: live?.rawQuery || live?.query });
  const a = boardAnswer(intel);
  const toCharts = () => {
    const el = typeof document !== 'undefined' ? document.getElementById(CHARTS_ID) : null;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };
  return (
    <article className="snr-bd-card snr-bd-exec" aria-labelledby={titleId}>
      <span className="snr-bd-eyebrow">Executive answer</span>
      {notice}
      {headline ? (
        <h2 id={titleId} className="snr-bd-headline">
          {headline}
        </h2>
      ) : (
        <VisuallyHidden as="h2" id={titleId}>
          Executive answer
        </VisuallyHidden>
      )}
      {a.text ? <p className="snr-bd-lede">{a.text}</p> : null}
      {a.bullets.length ? (
        <ul className="snr-bd-bullets">
          {a.bullets.map((b, i) => (
            <li key={i}>
              {b.title ? <strong>{b.title.replace(/[.:]\s*$/, '')}:</strong> : null} {b.text}
            </li>
          ))}
        </ul>
      ) : null}
      {a.detail ? (
        <details className="snr-bd-more">
          <summary>Show the full reading</summary>
          <p className="snr-bd-para">{a.detail}</p>
        </details>
      ) : null}
      <div className="snr-bd-actions">
        {deepAction}
        <button type="button" className="snr-bd-link" onClick={toCharts}>
          <i className="bi bi-stack" aria-hidden="true" />
          See full dossier
        </button>
        {typeof remaining === 'number' ? (
          <span className="snr-bd-cite">
            ({remaining} free ping{remaining === 1 ? '' : 's'} left)
          </span>
        ) : null}
      </div>
    </article>
  );
}

/* ── 1b. country intelligence ─────────────────────────────────────────── */

function IntelHead({ dossier }) {
  const intel = dossier.intel;
  const titleId = useId();
  const thrId = useId();
  const tiles = boardKpis(dossier);
  return (
    <section className="snr-bd-card snr-bd-intel" aria-labelledby={titleId}>
      <h3 id={titleId} className="snr-bd-eyebrow">
        Country intelligence / {intel.focus || 'FX risk'}
      </h3>
      <div className="snr-bd-id">
        <CountryFlag iso2={intel.iso2} width={44} className="snr-bd-flag" />
        <div className="snr-bd-idtext">
          <p className="snr-bd-place">{intel.place || dossier.name}</p>
          {intel.currency?.code ? (
            <p className="snr-bd-cur">
              {sentenceCase(intel.currency.name || '')}{' '}
              <span className="snr-bd-mono">({intel.currency.code})</span>
            </p>
          ) : null}
        </div>
        <div className="snr-bd-status">
          {intel.assessmentLabel ? (
            <Tooltip label="Ezana thresholds">
              <Badge
                tone={BADGE_TONE[intel.overall] || 'neutral'}
                className="snr-bd-badge"
                tabIndex={0}
                aria-describedby={thrId}
              >
                {intel.assessmentLabel}
              </Badge>
            </Tooltip>
          ) : null}
          {intel.assessmentLabel ? (
            <VisuallyHidden id={thrId}>Assessed against Ezana thresholds</VisuallyHidden>
          ) : null}
          {intel.asOf ? (
            <span className="snr-bd-asof">
              As of <time dateTime={intel.asOf}>{dateLabel(intel.asOf)}</time>
            </span>
          ) : null}
        </div>
      </div>
      {tiles.length ? (
        <ul className={`snr-bd-kpis${tiles.length === 3 ? ' is-3' : ''}`} aria-label="Key measures">
          {tiles.map((t) => (
            <li key={t.id} className="snr-bd-kpi">
              <span className="snr-bd-kpi-label">{t.label}</span>
              <span className="snr-bd-kpi-row">
                <span className="snr-bd-kpi-value">{t.value}</span>
                <Spark tile={t} />
              </span>
              {t.change ? <span className="snr-bd-kpi-cap is-change">{t.change}</span> : null}
              {t.period ? <span className="snr-bd-kpi-cap">({t.period})</span> : null}
              {t.stale ? <span className="snr-bd-stale">Not current</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ── 2a. pressure breakdown ───────────────────────────────────────────── */

function Breakdown({ intel }) {
  const id = useId();
  const rows = (intel.rows || []).filter((r) => r && r.label);
  if (!rows.length) return null;
  return (
    <section className="snr-bd-card" aria-labelledby={id}>
      <Eyebrow icon="bi-layers" id={id}>
        Pressure breakdown
      </Eyebrow>
      <Table className="snr-bd-table">
        <VisuallyHidden as="caption">
          Each component of the pressure reading and its level
        </VisuallyHidden>
        <THead>
          <TR>
            <TH scope="col">Component</TH>
            <TH scope="col">Level</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id || r.label}>
              <TH scope="row" className="snr-bd-rowh">
                {r.label}
              </TH>
              <TD>
                <Badge
                  tone={r.id === 'crisis' ? 'neutral' : BADGE_TONE[r.level] || 'neutral'}
                  className="snr-bd-pill"
                >
                  {sentenceCase(r.level || 'n/a')}
                </Badge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <p className="snr-bd-cap">
        Qualitative assessment against <EzanaThresholdsButton rows={rows} place={intel.place} />,
        not a calibrated risk score.
      </p>
    </section>
  );
}

/* ── 2b. source coverage ──────────────────────────────────────────────── */

function Coverage({ live }) {
  const id = useId();
  const chips = sourceCoverage(live);
  if (!chips.length) return null;
  return (
    <section className="snr-bd-card" aria-labelledby={id}>
      <Eyebrow icon="bi-database" id={id}>
        Source coverage
      </Eyebrow>
      <p className="snr-bd-sub">Matched datasets and sourced evidence used in this ping.</p>
      <ul className="snr-bd-cov">
        {chips.map((c) => (
          <li key={c.id} className="snr-bd-covchip">
            <span className="snr-bd-covname">{c.label}</span>
            <span className="snr-bd-covdetail">{c.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 3a. evidence from Ezana datasets ─────────────────────────────────── */

function Evidence({ live }) {
  const id = useId();
  const rows = datasetEvidence(live);
  if (!rows.length) return null;
  return (
    <section className="snr-bd-card" aria-labelledby={id}>
      <Eyebrow icon="bi-file-earmark-text" id={id}>
        Evidence from Ezana datasets
      </Eyebrow>
      <ul className="snr-bd-ev">
        {rows.map((r) => (
          <li key={r.id} className="snr-bd-evrow">
            <span className="snr-bd-tag">{r.chip}</span>
            <div className="snr-bd-evmain">
              <p className="snr-bd-evtitle">{r.title}</p>
              {r.summary ? <p className="snr-bd-evsum">{r.summary}</p> : null}
            </div>
            {r.bullets.length ? (
              <ul className="snr-bd-evlist">
                {r.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : (
              <span aria-hidden="true" />
            )}
            {r.href ? (
              r.external ? (
                <a className="snr-bd-open" href={r.href} target="_blank" rel="noopener noreferrer">
                  Open
                  <VisuallyHidden> {r.title} (opens in a new tab)</VisuallyHidden>
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </a>
              ) : (
                <Link className="snr-bd-open" href={r.href}>
                  Open
                  <VisuallyHidden>
                    {' '}
                    {r.linkLabel ? r.linkLabel.replace(/^Open /, '') : r.title}
                  </VisuallyHidden>
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </Link>
              )
            ) : (
              <span aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 4. key macro charts ──────────────────────────────────────────────── */

const CHART_NAME = {
  fx: 'the exchange-rate chart',
  policy: 'the inflation and policy rate chart',
  reer: 'the real effective exchange rate chart',
  reserves: 'the reserves chart',
};

/* Nov 7: the analytic findings (lib/sonar/macro/fx-findings): each a headline, its evidence,
   what it means, why it matters and its qualification, linked to the chart that shows it. */
function KeyFindings({ findings }) {
  const id = useId();
  const go = (e, chart) => {
    const el = document.getElementById(`intel-chart-${chart}`);
    if (!el) return;
    e.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  };
  return (
    <section className="snr-bd-card snr-bd-findings" aria-labelledby={id}>
      <Eyebrow icon="bi-lightbulb" id={id}>
        Key findings
      </Eyebrow>
      <ol className="snr-bd-flist">
        {findings.map((f, i) => (
          <li key={f.id} className="snr-bd-finding">
            <div className="snr-bd-finding-top">
              <span className="snr-bd-finding-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="snr-bd-finding-kicker">{f.title}</span>
              <span className={`snr-bd-finding-status is-${f.status.toLowerCase()}`}>
                {f.status}
              </span>
            </div>
            <h3 className="snr-bd-finding-head">{f.headline}</h3>
            <ul className="snr-bd-finding-ev" aria-label="Evidence">
              {f.evidence.map((e, k) => (
                <li key={k}>{e}</li>
              ))}
            </ul>
            <dl className="snr-bd-finding-dl">
              {f.interpretation ? (
                <div>
                  <dt>What it means</dt>
                  <dd>{f.interpretation}</dd>
                </div>
              ) : null}
              <div>
                <dt>Why it matters</dt>
                <dd>{f.why}</dd>
              </div>
            </dl>
            <p className="snr-bd-finding-q">
              <i className="bi bi-info-circle" aria-hidden="true" /> {f.qualification}
            </p>
            {f.chart ? (
              <a
                className="snr-bd-finding-link"
                href={`#intel-chart-${f.chart}`}
                onClick={(e) => go(e, f.chart)}
              >
                See {CHART_NAME[f.chart] || 'the chart'}
                <i className="bi bi-arrow-down-right" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* Nov 7: the exchange rate leads, wider (7 of 12) beside inflation and the policy rate (5);
   the REER and reserves share the row below. */
function Charts({ intel }) {
  const id = useId();
  const items = intelChartItems(intel.charts);
  if (!items.length) return null;
  const spans = chartSpans(items.map((c) => c.key));
  return (
    <section id={CHARTS_ID} tabIndex={-1} className="snr-bd-section" aria-labelledby={id}>
      <Eyebrow icon="bi-bar-chart-line" id={id}>
        Key data visualizations
      </Eyebrow>
      <div className={`snr-bd-charts${items.length % 2 ? ' is-odd' : ''}`}>
        {items.map((c) => (
          <div
            key={c.key}
            className="snr-bd-card snr-bd-chart"
            style={{ '--bd-cspan': spans.get(c.key) || 6 }}
          >
            {c.node}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── the board ────────────────────────────────────────────────────────── */

/**
 * live        the ping response the band holds (answer, dossier, sources, webSources, ...)
 * deepAction  the host's inline deep research action (DeepResearchCard placement="inline")
 * news        the band's "news around it" rail node
 * extra       the host's matching dataset cards (stackTop), under the news
 * notice      the "showing results for" notice, when the query was corrected
 */
export function SonarCountryBoard({
  live,
  deepAction = null,
  news = null,
  extra = null,
  notice = null,
  /* Nov 6: the side navigation's access (sectionAccess) and its deep research action. */
  access = null,
  onDeep = null,
}) {
  const mapId = useId();
  const naId = useId();
  /* The host's dataset cards fetch on their own and render nothing when no card matches.
     The cell stays mounted (so the fetch can land) but leaves the packing while empty,
     so an empty cell never holds half a row open. */
  const [extraFilled, setExtraFilled] = useState(false);
  const extraObs = useRef(null);
  const extraRef = useCallback((node) => {
    extraObs.current?.disconnect();
    extraObs.current = null;
    if (!node) return;
    const check = () => setExtraFilled(node.childElementCount > 0);
    check();
    if (typeof MutationObserver === 'undefined') return;
    extraObs.current = new MutationObserver(check);
    extraObs.current.observe(node, { childList: true });
  }, []);
  const dossier = live?.dossier;
  if (!hasCountryIntel(dossier)) return null;
  const intel = dossier.intel;
  const brief = intel.brief || null;
  const missing = (intel.missing || []).filter(Boolean);
  const scenarios = (brief?.scenarios || []).filter((s) => s && s.name);
  const monitor = (brief?.monitor || []).filter((m) => m && m.indicator);
  const hasStory = Boolean((dossier.keyChart?.stories || dossier.oecd?.stories || []).length);
  const hasIndicators = Boolean(dossier.keyIndicators?.length);
  /* Nov 7: computed from the measures the pipeline sent (older cached answers have none). */
  const findings = fxFindings({
    metrics: intel.metrics,
    currency: intel.currency,
    place: intel.place,
    missing,
  });

  /* Reading order; each cell's preferred and narrowest width in 12ths. */
  const cells = [
    {
      id: 'exec',
      section: 'answer',
      span: 7,
      min: 6,
      node: (
        <ExecutiveAnswer
          live={live}
          intel={intel}
          deepAction={deepAction}
          notice={notice}
          remaining={live.remaining}
        />
      ),
    },
    { id: 'intel', section: 'answer', span: 5, min: 5, node: <IntelHead dossier={dossier} /> },
    (intel.rows || []).length
      ? { id: 'breakdown', section: 'metrics', span: 6, min: 5, node: <Breakdown intel={intel} /> }
      : null,
    sourceCoverage(live).length
      ? { id: 'coverage', section: 'sources', span: 6, min: 5, node: <Coverage live={live} /> }
      : null,
    findings.length
      ? {
          id: 'keyfindings',
          section: 'findings',
          span: 12,
          min: 12,
          node: <KeyFindings findings={findings} />,
        }
      : null,
    datasetEvidence(live).length
      ? { id: 'evidence', section: 'findings', span: 7, min: 6, node: <Evidence live={live} /> }
      : null,
    news || extra
      ? {
          id: 'news',
          section: 'sources',
          span: 5,
          min: 4,
          hidden: !news && !extraFilled,
          node: (
            <div className="snr-bd-stack">
              {news ? <div className="snr-bd-card snr-bd-host">{news}</div> : null}
              {extra ? (
                <div className="snr-bd-extra" ref={extraRef}>
                  {extra}
                </div>
              ) : null}
            </div>
          ),
        }
      : null,
    intelChartItems(intel.charts).length
      ? { id: 'charts', section: 'charts', span: 12, min: 12, node: <Charts intel={intel} /> }
      : null,
    intel.transmission?.nodes?.length
      ? {
          id: 'map',
          section: 'charts',
          span: 12,
          min: 12,
          node: (
            <section className="snr-bd-card" aria-labelledby={mapId}>
              <Eyebrow icon="bi-diagram-3" id={mapId}>
                How pressure can travel
              </Eyebrow>
              <TransmissionMap map={intel.transmission} headingId={mapId} />
            </section>
          ),
        }
      : null,
    hasStory
      ? {
          id: 'story',
          section: 'charts',
          span: 6,
          min: 5,
          mid: 6,
          node: (
            <div className="snr-bd-card snr-bd-host">
              <StoryCard dossier={dossier} />
            </div>
          ),
        }
      : null,
    hasIndicators
      ? {
          id: 'indicators',
          section: 'charts',
          span: 6,
          min: 5,
          mid: 6,
          node: (
            <div className="snr-bd-card snr-bd-host">
              <KeyIndicatorsCard dossier={dossier} />
            </div>
          ),
        }
      : null,
    scenarios.length
      ? {
          id: 'scenarios',
          section: 'scenarios',
          span: 7,
          min: 6,
          node: (
            <div className="snr-bd-card snr-bd-sec">
              <ScenariosSection scenarios={scenarios} id={`${mapId}-scn`} />
            </div>
          ),
        }
      : null,
    monitor.length || brief?.bottomLine
      ? {
          id: 'monitor',
          section: 'monitor',
          span: 5,
          min: 4,
          node: (
            <div className="snr-bd-card snr-bd-sec">
              <MonitorSection monitor={monitor} id={`${mapId}-mon`} />
              {brief?.bottomLine ? (
                <div className="snr-cii-sec">
                  <h4 className="snr-cii-h">Bottom line</h4>
                  <p className="snr-cii-para">{brief.bottomLine}</p>
                </div>
              ) : null}
            </div>
          ),
        }
      : null,
    missing.length
      ? {
          id: 'missing',
          section: 'sources',
          span: 12,
          min: 12,
          node: (
            <section className="snr-bd-card snr-bd-missing" aria-labelledby={naId}>
              <i className="bi bi-exclamation-circle snr-bd-missing-ico" aria-hidden="true" />
              <h3 id={naId} className="snr-bd-missing-title">
                Data not available
              </h3>
              <p className="snr-bd-missing-text">
                {missingSentence(missing) ||
                  `${missing.map((m) => sentenceCase(m)).join(', ')} are not in Ezana's data.`}
              </p>
            </section>
          ),
        }
      : null,
  ]
    .filter(Boolean)
    /* Nov 6: the deep sections (scenarios, what to monitor) render only when unlocked. */
    .filter((c) => canRender(c.section, Boolean(access?.unlocked)));

  const spans = boardSpans(cells.filter((c) => !c.hidden));
  const anchors = anchorCells(cells.filter((c) => !c.hidden));
  const present = [...new Set(cells.filter((c) => !c.hidden).map((c) => c.section))];
  const sources = (intel.sources || []).filter(Boolean);

  return (
    <SonarAnswerFrame present={present} access={access} onDeep={onDeep}>
      <div
        className="snr-cii snr-board"
        role="region"
        aria-label={`${intel.place || dossier.name}: country answer`}
      >
        <div className="snr-bd-grid">
          {cells.map((c) => (
            <div
              key={c.id}
              id={anchors.get(c.id)}
              className={`snr-bd-cell snr-bd-cell--${c.id}`}
              hidden={c.hidden || undefined}
              style={{ '--bd-span': spans.get(c.id)?.wide, '--bd-span-mid': spans.get(c.id)?.mid }}
            >
              {c.node}
            </div>
          ))}
        </div>
        {sources.length ? <p className="snr-bd-sources">Sources: {sources.join('; ')}.</p> : null}
      </div>
    </SonarAnswerFrame>
  );
}

/* Nov 6: shared with the ping board (SonarPingBoard.jsx), so every answer uses the same cards. */
export { Eyebrow, Coverage, Evidence };

export default SonarCountryBoard;
