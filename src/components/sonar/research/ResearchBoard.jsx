'use client';

/**
 * ResearchBoard (Nov 2026): a standard or deep research report laid out as one dashboard
 * ("Which countries produce the most crude oil?"), in place of the long single column:
 *
 *   sources belt (every resource the run used)
 *   1. Executive answer (headline, summary, bullets, deep research) | Top snapshot (top 5)
 *   2. KPI strip: the lead metric, confidence, what was ranked or screened, checks passed
 *   3. Key findings and evidence (findings, interpretation, supporting records)
 *                                  | Research team and confidence + Methodology and sources
 *   4. Key data visualizations: the planned charts (lib/sonar/insight/viz-plan.js), each with
 *      its takeaway; a ranking is one module with a chart and a table view, never two cards
 *   5. Methodology and limitations
 *   6. Evidence and sources (one chip per evidence category; opens the full evidence)
 *
 * The full evidence explorer, relationships and the methodology in full stay below, in a
 * disclosure the host renders (ResearchReport). Every row is packed edge to edge
 * (boardSpans), 12 columns wide, 6 at mid width, 1 on a phone (container queries).
 *
 * Sonar card rule: no outlines and no borders; cards are a panel surface with a soft shadow.
 * Tokens only, mono for numbers, Bootstrap Icons. Data: src/lib/sonar/research-board.js.
 */

import { useId, useMemo, useState } from 'react';
import { VisuallyHidden } from '@/components/ds';
import { SonarSourceBelt } from '@/components/landing/SonarSourceBelt';
import { EVIDENCE_CATEGORIES } from '@/lib/sonar/engine/domains';
import { boardSpans } from '@/lib/sonar/country-board';
import {
  rankingOf,
  rankingRows,
  boardHeadline,
  boardSummary,
  boardBullets,
  boardKpis,
  methodologyLines,
  evidenceGroups,
  citedEvidence,
  researchResources,
  lineGeometry,
  fmtNum,
  execMeta,
  boardFindings,
} from '@/lib/sonar/research-board';
import { placeRanking, dotMapGeometry, WORLD_COLS, WORLD_ROWS } from '@/lib/sonar/dot-map';
import { planVisualizations } from '@/lib/sonar/insight/viz-plan';
import { sendFeedback } from './useResearchStream';
import { SonarAnswerFrame } from '@/components/sonar/SonarAnswerFrame';
import { anchorCells, canRender } from '@/lib/sonar/answer-sections';
import { Cites } from './Cites';
import { congressActivityCells } from './CongressActivityBoard';
import { isActivityPanel } from '@/lib/sonar/congress-activity-board';
import './research-board.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateLabel = (x) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(x || ''));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(x || '');
};

/* The reader sees what kind of claim each finding is (select.js findingKind). An
   interpretation is never labelled verified because its inputs were. */
const KIND_ICON = {
  observation: 'bi-check-circle-fill',
  calculated: 'bi-calculator',
  interpretation: 'bi-lightbulb',
  hypothesis: 'bi-question-circle',
  unavailable: 'bi-dash-circle',
};

function Eyebrow({ id, icon, children }) {
  return (
    <h2 id={id} className="srb-eyebrow">
      {icon ? <i className={`bi ${icon}`} aria-hidden="true" /> : null}
      {children}
    </h2>
  );
}

/* ── 1a. executive answer ─────────────────────────────────────────────── */

/* Nov 7: the answer itself is the card's title. Eyebrow and the deep research action on one
   line, the headline across the card, a meta line (data date, lead source, sources used),
   the summary, then the key points in two columns on a wide card. */
function Executive({ report, rank, deepAction, onCite, meta = [] }) {
  const id = useId();
  const pointsId = useId();
  const headline = boardHeadline(report, rank);
  const summary = boardSummary(report, rank);
  const bullets = boardBullets(report, rank);
  return (
    <section className="srb-card srb-exec" aria-labelledby={id}>
      <div className="srb-exec-top">
        <span className="srb-eyebrow">
          <i className="bi bi-broadcast" aria-hidden="true" />
          Executive answer
        </span>
        {deepAction ? <div className="srb-exec-deep">{deepAction}</div> : null}
      </div>
      <h2 id={id} className="srb-exec-title">
        {headline || 'Research answer'}
      </h2>
      {meta.length ? (
        <ul className="srb-exec-meta" aria-label="About this answer">
          {meta.map((m) => (
            <li key={m.id}>
              <i className={`bi ${m.icon}`} aria-hidden="true" />
              {m.text}
            </li>
          ))}
        </ul>
      ) : null}
      {summary ? (
        <p className="srb-lede">
          {summary}{' '}
          {report?.executiveConclusion?.markers?.length ? (
            <Cites markers={report.executiveConclusion.markers} onCite={onCite} />
          ) : null}
        </p>
      ) : null}
      {report?.conclusionLimits ? (
        <p className="srb-limits">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>
            <span className="srb-limits-label">Not established: </span>
            {report.conclusionLimits}
          </span>
        </p>
      ) : null}
      {bullets.length ? (
        <div className="srb-exec-points">
          <h3 id={pointsId} className="srb-exec-label">
            Key points
          </h3>
          <ul className="srb-bullets" aria-labelledby={pointsId}>
            {bullets.map((b, i) => (
              <li key={i} className={`is-${b.kind}`}>
                {b.text}
                {b.kind === 'derived' ? (
                  <VisuallyHidden> (calculated from the ranking)</VisuallyHidden>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ── 1b. top snapshot ─────────────────────────────────────────────────── */

/* Nov 7: a country ranking's top five on a dotted world map, each ranked country lit in
   emerald (deeper for a higher rank) with its rank marker, and the five listed under it.
   A ranking that is not of countries keeps the bar list. */
function Snapshot({ rank }) {
  const id = useId();
  const rows = rankingRows(rank, 5);
  const placed = placeRanking(rows);
  const sub = (
    <p className="srb-sub">
      {rank.title}
      {rank.unit ? ` (${rank.unit})` : ''}
      {rank.period ? `, ${rank.period}` : ''}
    </p>
  );
  if (!placed.isCountries) {
    return (
      <section className="srb-card" aria-labelledby={id}>
        <Eyebrow id={id}>Top {rows.length} snapshot</Eyebrow>
        {sub}
        <ol className="srb-snap">
          {rows.map((r) => (
            <li key={r.label} className="srb-snap-row">
              <span className="srb-snap-rank" aria-hidden="true">
                #{r.rank}
              </span>
              <span className="srb-snap-body">
                <span className="srb-snap-name">
                  <VisuallyHidden>Rank {r.rank}: </VisuallyHidden>
                  {r.label}
                </span>
                <span className="srb-snap-bar" aria-hidden="true">
                  <span style={{ width: `${r.width}%` }} />
                </span>
              </span>
              <span className="srb-snap-val">{r.display}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  return (
    <section className="srb-card srb-mapcard" aria-labelledby={id}>
      <Eyebrow id={id} icon="bi-globe-americas">
        Top {rows.length} snapshot
      </Eyebrow>
      {sub}
      <DotMap rows={placed.rows} label={`${rank.title}: top ${rows.length} on a world map`} />
      <ol className="srb-maplist">
        {placed.rows.map((r) => (
          <li key={r.label} className={`srb-maplist-row is-r${r.rank}`}>
            <span className="srb-maplist-rank" aria-hidden="true">
              {r.rank}
            </span>
            <span className="srb-maplist-name">
              <VisuallyHidden>Rank {r.rank}: </VisuallyHidden>
              {r.label}
            </span>
            <span className="srb-maplist-val">{r.display}</span>
            <span className="srb-maplist-share" aria-hidden="true">
              <span style={{ width: `${r.width}%` }} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DotMap({ rows, label }) {
  const geo = useMemo(() => dotMapGeometry(rows), [rows]);
  const names = new Map(rows.map((r) => [r.iso3, r.label]));
  return (
    <div className="srb-map" role="img" aria-label={`${label}. The list below gives each value.`}>
      <svg
        viewBox={`0 0 ${WORLD_COLS} ${WORLD_ROWS}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <path d={geo.base} className="srb-map-land" />
        {geo.ranked.map((g) => (
          <path key={g.iso3} d={g.d} className={`srb-map-hit is-r${g.rank}`} />
        ))}
        {geo.markers
          .filter((m) => m.moved)
          .map((m) => (
            <line key={m.iso3} x1={m.ax} y1={m.ay} x2={m.x} y2={m.y} className="srb-map-leader" />
          ))}
      </svg>
      {geo.markers.map((m) => (
        <span
          key={m.iso3}
          className={`srb-map-pin is-r${m.rank}`}
          style={{
            left: `${(m.x / WORLD_COLS) * 100}%`,
            top: `${(m.y / WORLD_ROWS) * 100}%`,
          }}
          title={names.get(m.iso3) || m.iso3}
          aria-hidden="true"
        >
          {m.rank}
        </span>
      ))}
    </div>
  );
}

/* ── 2. KPI strip ─────────────────────────────────────────────────────── */

/* Nov 7: shorter tiles, everything centred: the icon over the value, label and note. */
function Kpis({ tiles }) {
  return (
    <ul className="srb-kpis" aria-label="Key measures" style={{ '--srb-kpis': tiles.length }}>
      {tiles.map((t) => (
        <li key={t.id} className="srb-card srb-kpi">
          <span className="srb-kpi-head">
            <i className={`bi ${t.icon} srb-kpi-ico`} aria-hidden="true" />
            <span className="srb-kpi-value">{t.value}</span>
          </span>
          <span className="srb-kpi-label">{t.label}</span>
          {t.sub ? <span className="srb-kpi-sub">{t.sub}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/* ── 3a. key findings and evidence ────────────────────────────────────── */

function FindingFlags({ f, runId }) {
  const [sent, setSent] = useState(null);
  const flag = async (kind) =>
    setSent((await sendFeedback({ runId, findingId: f.id, kind })) ? kind : 'failed');
  if (sent)
    return (
      <p className="srb-flags srb-muted" role="status">
        {sent === 'failed' ? 'Not sent. Try again.' : 'Thanks. We review every report.'}
      </p>
    );
  return (
    <p className="srb-flags">
      <span className="srb-muted">Flag:</span>
      <button type="button" className="srb-textbtn" onClick={() => flag('incorrect_finding')}>
        Incorrect
      </button>
      <button type="button" className="srb-textbtn" onClick={() => flag('incorrect_calculation')}>
        Calculation wrong
      </button>
      <button type="button" className="srb-textbtn" onClick={() => flag('outdated_evidence')}>
        Outdated
      </button>
    </p>
  );
}

function Findings({
  report,
  evidence,
  runId,
  onCite,
  allCited = false,
  title = 'Key findings and evidence',
  rank = null,
}) {
  const id = useId();
  const findings = boardFindings(report, rank);
  const interp = (report?.analysis || []).filter((a) => a?.text);
  const cited = [];
  const seen = new Set();
  for (const f of [report?.executiveConclusion, ...findings, ...interp].filter(Boolean))
    for (const e of citedEvidence(f, evidence))
      if (!seen.has(e.marker)) {
        seen.add(e.marker);
        cited.push(e);
      }
  if (!findings.length && !interp.length) return null;
  return (
    <section className="srb-card" aria-labelledby={id}>
      <Eyebrow id={id}>{title}</Eyebrow>
      {findings.map((f) => (
        <article key={f.id} className="srb-finding">
          <header className="srb-finding-head">
            <span className="srb-tag">Key finding</span>
            <span className={`srb-status is-${f.kind.id}`}>
              <i className={`bi ${KIND_ICON[f.kind.id]}`} aria-hidden="true" />
              {f.kind.label}
            </span>
            {f.validation?.action === 'downgraded' ? (
              <span className="srb-status is-qualified">Qualified</span>
            ) : null}
          </header>
          <h3 className="srb-finding-title">{f.title}</h3>
          <p className="srb-finding-text">
            {f.explanation} <Cites markers={f.markers} onCite={onCite} />
          </p>
          {f.comparison ? (
            <p className="srb-finding-calc">
              <i className="bi bi-arrow-left-right" aria-hidden="true" />
              {f.comparison}
            </p>
          ) : null}
          {f.implication || f.caveat ? (
            <dl className="srb-finding-notes">
              {f.implication ? (
                <div>
                  <dt>Why it matters</dt>
                  <dd>{f.implication}</dd>
                </div>
              ) : null}
              {f.caveat ? (
                <div>
                  <dt>Qualification</dt>
                  <dd>{f.caveat}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          <FindingFlags f={f} runId={runId} />
        </article>
      ))}
      {interp.map((a) => (
        <p key={a.id} className="srb-interp">
          <span className="srb-tag is-interp">Interpretation</span> {a.text}{' '}
          <Cites markers={a.markers} onCite={onCite} />
        </p>
      ))}
      {cited.length ? (
        <div className="srb-support">
          <h3 className="srb-minihead">Supporting evidence</h3>
          <ul className="srb-support-list">
            {/* Locked answers have no evidence explorer: every cited record is listed
                here, and a citation lands on its row (evs-<marker>). */}
            {(allCited ? cited : cited.slice(0, 4)).map((e) => (
              <li key={e.marker} id={`evs-${e.marker}`} tabIndex={-1}>
                <button
                  type="button"
                  className="srb-support-row"
                  onClick={() => onCite?.(e.marker)}
                >
                  <span className="srb-support-marker">{e.marker}</span>
                  <span className="srb-support-body">
                    <span className="srb-support-title">{e.title}</span>
                    <span className="srb-support-text">{e.text}</span>
                  </span>
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  <VisuallyHidden>Open record {e.marker} in the full evidence</VisuallyHidden>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ── 3b. team, confidence and methodology ─────────────────────────────── */

function TeamAndMethod({ team, run, lines }) {
  const tid = useId();
  const mid = useId();
  const people = (team?.specialists || []).filter((s) => s?.title);
  const audit = team?.audit;
  const total = Number(audit?.total) || audit?.checks?.length || 0;
  const passed = total
    ? Number(audit?.passed ?? (audit?.checks || []).filter((c) => c.pass).length) || 0
    : 0;
  return (
    <div className="srb-stack">
      {people.length || run?.confidence ? (
        <section className="srb-card" aria-labelledby={tid}>
          <Eyebrow id={tid}>Research team and confidence</Eyebrow>
          <ul className="srb-team">
            {people.map((p) => (
              <li key={p.id} className="srb-person">
                <i className="bi bi-person-circle srb-person-ico" aria-hidden="true" />
                <span>
                  <span className="srb-person-role">
                    {p.role === 'lead' ? 'Lead analyst' : 'Supporting analyst'}
                  </span>
                  <span className="srb-person-title">{p.title}</span>
                  {p.status === 'missing' ? (
                    <span className="srb-person-note">
                      Did not report in time; the answer was written without this view.
                    </span>
                  ) : p.conclusion ? (
                    <span className="srb-person-note">{p.conclusion}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <dl className="srb-conf">
            {run?.confidence ? (
              <div>
                <dt>Confidence level</dt>
                <dd>
                  <span className={`srb-conf-pill is-${run.confidence}`}>
                    {String(run.confidence).toUpperCase()}
                  </span>
                </dd>
              </div>
            ) : null}
            {total ? (
              <div>
                <dt>Checks passed</dt>
                <dd className="srb-mono">
                  {passed} of {total}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
      {lines.length ? (
        <section className="srb-card" aria-labelledby={mid}>
          <Eyebrow id={mid}>Methodology and source quality</Eyebrow>
          <dl className="srb-lines">
            {lines.map((l) => (
              <div key={l.id} className="srb-line">
                <dt>
                  <i className={`bi ${l.icon}`} aria-hidden="true" />
                  {l.label}
                </dt>
                <dd>{l.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

/* ── 4. charts ────────────────────────────────────────────────────────── */

function LineChart({ vis, takeaway = null }) {
  const g = lineGeometry(vis.series);
  if (!g) return null;
  const desc = `${vis.title}, ${dateLabel(g.from)} to ${dateLabel(g.to)}: from ${fmtNum(g.first, { decimals: 2 })} to ${fmtNum(g.last, { decimals: 2 })}, low ${fmtNum(g.low, { decimals: 2 })}, high ${fmtNum(g.high, { decimals: 2 })}.`;
  const up = g.changePct != null && g.changePct >= 0;
  return (
    <figure className="srb-card srb-chart">
      <div className="srb-chart-head">
        <figcaption className="srb-chart-title">
          {vis.title}
          <span className="srb-chart-sub">
            {vis.unit ? `${vis.unit}, ` : ''}
            {vis.method || ''}
          </span>
        </figcaption>
        {g.changePct != null ? (
          <span className="srb-chart-delta">
            <span className={`srb-chip ${up ? 'is-up' : 'is-down'}`}>
              {up ? '+' : '−'}
              {fmtNum(Math.abs(g.changePct))}%
            </span>
            <span className="srb-mono srb-muted">
              {fmtNum(g.first, { decimals: 2 })} to {fmtNum(g.last, { decimals: 2 })}
            </span>
          </span>
        ) : null}
      </div>
      <div className="srb-plot" role="img" aria-label={desc}>
        <div className="srb-plot-y" aria-hidden="true">
          {g.ticks.map((t) => (
            <span key={t.value} style={{ top: `${t.y}%` }}>
              {fmtNum(t.value, { decimals: 0 })}
            </span>
          ))}
        </div>
        <svg
          className="srb-plot-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {g.ticks.map((t) => (
            <line
              key={t.value}
              x1="0"
              x2="100"
              y1={t.y}
              y2={t.y}
              className="srb-gridline"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={g.area} className="srb-area" />
          <path d={g.line} className="srb-linepath" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="srb-plot-x" aria-hidden="true">
          {g.xLabels.map((l) => (
            <span key={l.x} style={{ left: `${l.x}%` }}>
              {dateLabel(l.label)}
            </span>
          ))}
        </div>
      </div>
      {takeaway ? <p className="srb-takeaway">{takeaway}</p> : null}
      <p className="srb-cap">
        Source: {vis.source}. Period:{' '}
        {vis.period?.label ||
          [vis.period?.from, vis.period?.to].filter(Boolean).join(' to ') ||
          'as reported'}
        .
      </p>
    </figure>
  );
}

/* A ranking is drawn once: the bars and, in the same module, the exact figures as a table
   (value and share of the listed). The reader switches views; no second card repeats it. */
function RankingModule({ vis, takeaway = null }) {
  const id = useId();
  const [view, setView] = useState('chart');
  const rank = rankingOf([vis]);
  if (!rank) return null;
  const rows = rankingRows(rank, 10);
  return (
    <figure className="srb-card srb-chart" aria-labelledby={id}>
      <div className="srb-chart-head">
        <figcaption id={id} className="srb-chart-title">
          {rank.title}
          <span className="srb-chart-sub">
            {rank.unit ? `${rank.unit}, ` : ''}
            {rank.period}
          </span>
        </figcaption>
        <div className="srb-views" role="group" aria-label="Show as">
          {['chart', 'table'].map((v) => (
            <button
              key={v}
              type="button"
              className={`srb-view${view === v ? ' is-on' : ''}`}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              <i
                className={`bi ${v === 'chart' ? 'bi-bar-chart-line' : 'bi-table'}`}
                aria-hidden="true"
              />
              {v === 'chart' ? 'Chart' : 'Table'}
            </button>
          ))}
        </div>
      </div>
      {view === 'chart' ? (
        <ol className="srb-bars">
          {rows.map((r) => (
            <li key={r.label} className="srb-bars-row">
              <span className="srb-bars-name">{r.label}</span>
              <span className="srb-bars-track" aria-hidden="true">
                <span style={{ width: `${r.width}%` }} />
              </span>
              <span className="srb-bars-val">{r.display}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div
          className="srb-tablewrap"
          role="region"
          aria-label={`${rank.title}, table`}
          tabIndex={0}
        >
          <table className="srb-table">
            <caption className="srb-sr">
              {rank.title}: the top {rows.length}, each value and its share of the {rows.length}{' '}
              listed
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col" className="is-num">
                  Value
                </th>
                <th scope="col" className="is-num">
                  Share (top {rows.length})
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="srb-mono">{r.rank}</td>
                  <th scope="row">
                    {r.label}
                    {r.note && r.note !== rank.rows[0].note ? (
                      <span className="srb-muted"> ({r.note})</span>
                    ) : null}
                  </th>
                  <td className="is-num">{r.display}</td>
                  <td className="is-num">{fmtNum(r.share, { fixed: true })}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {takeaway ? <p className="srb-takeaway">{takeaway}</p> : null}
      <p className="srb-cap">
        Source: {vis.source}. {vis.method ? `Method: ${vis.method}.` : ''}
      </p>
    </figure>
  );
}

/* The planned charts (viz-plan.js): each says what it shows, none repeats another. */
function Charts({ items: planned, Fallback }) {
  const id = useId();
  const items = planned
    .map(({ id: key, vis: v, spec }) => {
      const takeaway = spec?.takeaway || null;
      if (v.type === 'line') return { id: key, node: <LineChart vis={v} takeaway={takeaway} /> };
      if (v.type === 'bars' || v.type === 'leaderboard')
        return { id: key, node: <RankingModule vis={v} takeaway={takeaway} /> };
      return Fallback
        ? {
            id: key,
            node: (
              <div className="srb-card srb-chart">
                <Fallback vis={v} />
              </div>
            ),
          }
        : null;
    })
    .filter(Boolean);
  if (!items.length) return null;
  return (
    <section id="srr-charts-h" className="srb-section" aria-labelledby={id}>
      <Eyebrow id={id}>Key data visualizations</Eyebrow>
      <div
        className={`srb-charts${items.length % 2 ? ' is-odd' : ''}`}
        style={{ '--srb-charts': Math.min(items.length, 2) }}
      >
        {items.map((c) => (
          <div key={c.id} className="srb-chart-cell">
            {c.node}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 5b. methodology and limitations ──────────────────────────────────── */

function Limits({ lines, limitations }) {
  const id = useId();
  if (!lines.length && !limitations.length) return null;
  return (
    <section className="srb-card" aria-labelledby={id}>
      <Eyebrow id={id}>Methodology and limitations</Eyebrow>
      <dl className="srb-lines">
        {lines
          .filter((l) => l.id !== 'caveat')
          .map((l) => (
            <div key={l.id} className="srb-line">
              <dt>
                <i className={`bi ${l.icon}`} aria-hidden="true" />
                {l.label}
              </dt>
              <dd>{l.text}</dd>
            </div>
          ))}
        {limitations.length ? (
          <div className="srb-line">
            <dt>
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              Data gaps
            </dt>
            <dd>
              <ul className="srb-gaps">
                {limitations.slice(0, 4).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

/* ── 6. evidence and sources strip ────────────────────────────────────── */

const GROUP_ICON = {
  ezana_datasets: 'bi-database',
  government_records: 'bi-bank',
  corporate_filings: 'bi-file-earmark-text',
  market_data: 'bi-graph-up',
  news: 'bi-newspaper',
  historical: 'bi-clock-history',
  calculated: 'bi-calculator',
  supporting_research: 'bi-journal-text',
};

function SourcesStrip({ groups, onPick }) {
  const id = useId();
  if (!groups.length) return null;
  return (
    <section className="srb-card srb-strip" aria-labelledby={id}>
      <Eyebrow id={id}>Evidence and sources</Eyebrow>
      <ul className="srb-strip-list">
        {groups.map((g) => (
          <li key={g.id}>
            <button type="button" className="srb-pill" onClick={() => onPick?.(g.id)}>
              <i className={`bi ${GROUP_ICON[g.id] || 'bi-link-45deg'}`} aria-hidden="true" />
              {g.label}
              <span className="srb-mono srb-muted">{g.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── data gaps (free answers) ─────────────────────────────────────────── */

function Gaps({ limitations }) {
  const id = useId();
  return (
    <section className="srb-card srb-gapsrow" aria-labelledby={id}>
      <Eyebrow id={id} icon="bi-exclamation-triangle">
        Data gaps
      </Eyebrow>
      <ul className="srb-gaps">
        {limitations.slice(0, 3).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

/* ── the board ────────────────────────────────────────────────────────── */

/**
 * state       the research stream state (plan, run, report, analysis)
 * team        selectTeam(state)
 * limitations the merged limitations list the report already builds
 * sourceLabels SOURCE_LABELS from ResearchReport
 * onCite      opens the full evidence and moves focus to a record
 * onPickCategory  opens the full evidence on one category
 * deepAction  the host's inline deep research action (standard research only)
 * ChartFallback   ResearchChart, for chart types the board does not draw itself
 */
export default function ResearchBoard({
  state,
  team,
  limitations = [],
  sourceLabels = {},
  onCite,
  onPickCategory,
  deepAction = null,
  ChartFallback = null,
  /* Nov 6: the side navigation's access (sectionAccess), its deep research action, and the
     deep blocks the host renders under the board when unlocked ([{ key, node }]). */
  access = null,
  onDeep = null,
  deepBlocks = [],
  /* Nov 7: Back and the ping bar, at the top of the sections column (the run passes them). */
  navTop = null,
}) {
  const unlocked = Boolean(access?.unlocked);
  const report = state.report;
  const run = state.run;
  const runId = run?.runId || state.plan?.runId;
  const evidence = run?.evidence || [];
  const metrics = state.analysis?.metrics || [];
  const vis = state.analysis?.visualizations || [];
  const rank = rankingOf(vis);
  /* Nov 2026: the charts are planned (what each answers, no two alike); the plan reads the
     run's intent and the key findings, so a saved or cached run plans the same way. */
  const vizPlan = planVisualizations(vis, {
    intent: state.analysis?.intent || run?.intent || null,
    findings: report?.keyFindings || [],
    depth: state.plan?.spec?.depth || 'standard',
  });
  const kpis = boardKpis({
    metrics,
    run,
    plan: state.plan,
    team,
    rank,
    intent: state.analysis?.intent || run?.intent || null,
  });
  const lines = methodologyLines({ rank, metrics, run, limitations, sourceLabels });
  const groups = evidenceGroups(evidence, EVIDENCE_CATEGORIES);
  const resources = researchResources(state, { sourceLabels });
  const meta = execMeta({ rank, resources, evidence });
  /* Nov 7: a congressional activity run ("How has disclosed congressional trading changed?")
     carries Ezana's computed counts as a panel. Its board leads with them (executive answer,
     takeaways, KPI strip, three charts, key findings, reporting limitations); the model's
     findings, team, methodology and evidence follow. */
  const activity = isActivityPanel(state.panels?.congressActivity)
    ? state.panels.congressActivity
    : null;

  const generic = [
    {
      id: 'exec',
      section: 'answer',
      span: rank ? 7 : 12,
      min: rank ? 6 : 12,
      node: (
        <Executive
          report={report}
          rank={rank}
          deepAction={deepAction}
          onCite={onCite}
          meta={meta}
        />
      ),
    },
    rank
      ? { id: 'snapshot', section: 'answer', span: 5, min: 5, node: <Snapshot rank={rank} /> }
      : null,
    kpis.length
      ? { id: 'kpis', section: 'metrics', span: 12, min: 12, node: <Kpis tiles={kpis} /> }
      : null,
    (report?.keyFindings || []).length || (report?.analysis || []).length
      ? {
          id: 'findings',
          section: 'findings',
          span: 7,
          min: 6,
          node: (
            <Findings
              report={report}
              evidence={evidence}
              runId={runId}
              onCite={onCite}
              allCited={!unlocked}
              rank={rank}
            />
          ),
        }
      : null,
    {
      id: 'team',
      section: 'team',
      span: 5,
      min: 5,
      node: <TeamAndMethod team={team} run={run} lines={lines} />,
    },
    vizPlan.items.length
      ? {
          id: 'charts',
          section: 'charts',
          span: 12,
          min: 12,
          node: <Charts items={vizPlan.items} Fallback={ChartFallback} />,
        }
      : null,
    {
      id: 'limits',
      section: 'methodology',
      span: 12,
      min: 5,
      mid: 6,
      node: <Limits lines={lines} limitations={limitations} />,
    },
    groups.length
      ? {
          id: 'strip',
          section: 'sources',
          span: 12,
          min: 12,
          node: <SourcesStrip groups={groups} onPick={onPickCategory} />,
        }
      : null,
    /* Locked answers keep their data gaps in view (honesty is not a paid feature): a
       compact card in the free Evidence and sources section. The activity board's
       Reporting limitations card already does this. */
    !unlocked && limitations.length && !activity
      ? {
          id: 'gaps',
          section: 'sources',
          span: 12,
          min: 12,
          node: <Gaps limitations={limitations} />,
        }
      : null,
  ].filter(Boolean);
  const replaced = new Set(['exec', 'snapshot', 'kpis', 'charts']);
  const cells = (
    activity
      ? [
          ...congressActivityCells(activity, { deepAction }),
          ...generic
            .filter((c) => !replaced.has(c.id))
            .map((c) =>
              c.id === 'findings'
                ? {
                    ...c,
                    node: (
                      <Findings
                        report={report}
                        evidence={evidence}
                        runId={runId}
                        onCite={onCite}
                        allCited={!unlocked}
                        title="Analyst findings and evidence"
                        rank={rank}
                      />
                    ),
                  }
                : c,
            ),
        ]
      : generic
  ).filter((c) => canRender(c.section, unlocked));
  const spans = boardSpans(cells);
  const anchors = anchorCells(cells);
  const blocks = unlocked ? (deepBlocks || []).filter((b) => b && b.node) : [];
  const present = [
    ...new Set([...cells.map((c) => c.section), ...blocks.map((b) => b.key).filter(Boolean)]),
  ];
  const seenKeys = new Set(cells.map((c) => c.section));

  return (
    <SonarAnswerFrame present={present} access={access} onDeep={onDeep} navTop={navTop}>
      <div className="srb" role="region" aria-label="Research answer">
        {resources.length ? <SonarSourceBelt items={resources} /> : null}
        <div className="srb-grid">
          {cells.map((c) => (
            <div
              key={c.id}
              id={anchors.get(c.id)}
              className={`srb-cell srb-cell--${c.id}`}
              style={{
                '--srb-span': spans.get(c.id)?.wide,
                '--srb-span-mid': spans.get(c.id)?.mid,
              }}
            >
              {c.node}
            </div>
          ))}
        </div>
        {blocks.map((b, i) => {
          const first = b.key && !seenKeys.has(b.key);
          if (b.key) seenKeys.add(b.key);
          return (
            <div
              key={b.key || `block-${i}`}
              id={first ? `sa-${b.key}` : undefined}
              className="srb-block"
            >
              {b.node}
            </div>
          );
        })}
      </div>
    </SonarAnswerFrame>
  );
}
