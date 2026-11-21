'use client';

/**
 * CongressProfileReport (Nov 21 2026): the one-page answer to a quick ping about one member
 * of Congress ("Nancy Pelosi"), rendered inside the universal Sonar answer shell
 * (SonarAnswerFrame: navigation, query bar, follow-ups, Research Controls and Next steps).
 * This file is only the report's content, laid out like the approved design:
 *
 *   row 1  Desk summary (headline, one short paragraph) | Trading lean | Key takeaways
 *   row 2  Portfolio analytics (estimated value chart, KPI strip) | Open positions
 *   row 3  Similar portfolios in Congress | News around the member
 *
 * Every figure is the dossier's own (lib/sonar/landing-politician): estimates from disclosed
 * STOCK Act ranges at their midpoints, and each card says so. A card with nothing to show is
 * not rendered. Section anchors (sa-answer, sa-findings, sa-charts) feed the side navigation;
 * Evidence and sources (sa-sources) lives in the right rail (CongressEvidence below).
 * Sonar card rule: tinted surfaces, no outlines. Styles: congress-profile-report.css (cpr-).
 */

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { Cited } from '@/components/sonar/SonarDeskSummary';
import { Face } from '@/components/sonar/SonarFace';
import { MODE_LABEL, answeredLabel } from '@/lib/sonar/desk-summary';
import {
  tradingLean,
  seriesChange,
  chartAxis,
  monthLabel,
  usdCompact,
  newsRows,
  lastNameOf,
} from '@/lib/sonar/congress-profile';
import './congress-profile-report.css';

const seatOf = (p) => [p?.party, p?.state].filter(Boolean).join(' · ');

function Eyebrow({ icon, id, children, meta = null }) {
  return (
    <div className="cpr-head">
      <h2 id={id} className="cpr-eyebrow">
        <i className={`bi ${icon}`} aria-hidden="true" />
        {children}
      </h2>
      {meta ? <span className="cpr-head-meta">{meta}</span> : null}
    </div>
  );
}

/* ── row 1 ────────────────────────────────────────────────────────── */

function DeskSummary({ headline, question, paragraphs, more }) {
  const id = useId();
  return (
    <section id="sa-answer" className="cpr-card cpr-desk" aria-labelledby={id}>
      <Eyebrow icon="bi-file-earmark-text" id={`${id}-e`}>
        Desk summary
      </Eyebrow>
      <h3 id={id} className="cpr-headline">
        {headline || question}
      </h3>
      {paragraphs.map((p, i) => (
        <p key={i} className="cpr-summary">
          <Cited text={p} />
        </p>
      ))}
      {more.length ? (
        <details className="cpr-more">
          <summary>Read the full brief</summary>
          {more.map((p, i) => (
            <p key={i}>
              <Cited text={p} />
            </p>
          ))}
        </details>
      ) : null}
    </section>
  );
}

/* A half-circle gauge from net selling (left) to net buying (right). */
function LeanGauge({ lean, last }) {
  const id = useId();
  const angle = Math.PI * (1 - (lean.score + 1) / 2);
  const cx = 100;
  const cy = 96;
  const r = 78;
  const nx = cx + Math.cos(angle) * (r - 14);
  const ny = cy - Math.sin(angle) * (r - 14);
  const pct = Math.round(Math.abs(lean.score) * 100);
  return (
    <section className="cpr-card cpr-lean" aria-labelledby={id}>
      <Eyebrow icon="bi-speedometer" id={id}>
        {last ? `${last} trading lean` : 'Trading lean'}
      </Eyebrow>
      <p className="cpr-lean-sub">Disclosed purchases against sales, past 12 months.</p>
      <div className="cpr-gauge">
        <svg
          viewBox="0 0 200 112"
          role="img"
          aria-label={`${lean.label}. ${pct}% toward ${lean.score >= 0 ? 'purchases' : 'sales'} by disclosed value.`}
        >
          <defs>
            <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" style={{ stopColor: 'var(--negative)' }} />
              <stop offset="50%" style={{ stopColor: 'var(--warning)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--emerald)' }} />
            </linearGradient>
          </defs>
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={`url(#${id}-g)`}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line className="cpr-needle" x1={cx} y1={cy} x2={nx} y2={ny} />
          <circle className="cpr-needle-hub" cx={cx} cy={cy} r="5" />
        </svg>
        <p className="cpr-lean-label">{lean.label}</p>
      </div>
      <div className="cpr-lean-scale" aria-hidden="true">
        <span>Net selling</span>
        <span>Balanced</span>
        <span>Net buying</span>
      </div>
      <p className="cpr-note">
        <i className="bi bi-info-circle" aria-hidden="true" /> {usdCompact(lean.buy)} bought,{' '}
        {usdCompact(lean.sell)} sold, at range midpoints. Not a forecast.
      </p>
    </section>
  );
}

function Takeaways({ items }) {
  const id = useId();
  if (!items || items.length < 2) return null;
  return (
    <section id="sa-findings" className="cpr-card cpr-take" aria-labelledby={id}>
      <Eyebrow icon="bi-bullseye" id={id}>
        Key takeaways
      </Eyebrow>
      <ul className="cpr-take-list">
        {items.slice(0, 4).map((t, i) => (
          <li key={i}>
            <Cited text={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── row 2 ────────────────────────────────────────────────────────── */

function niceTicks(min, max, target = 4) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target + 0.5) || mag * 10;
  const out = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) out.push(v);
  return out;
}

const tickUsd = (v) => {
  if (v >= 1e6) return `$${+(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
};

/* The estimated open value by month: measured to its box, so text never stretches. */
function ValueChart({ series, months, label }) {
  const [box, setBox] = useState(null);
  const [hover, setHover] = useState(null);
  const ro = useRef(null);
  const gid = useId();
  const setNode = useCallback((node) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    });
    obs.observe(node);
    ro.current = obs;
  }, []);
  const PAD = { top: 10, right: 8, bottom: 22, left: 46 };
  const geo = useMemo(() => {
    if (!box || !Array.isArray(series) || series.length < 2) return null;
    const pw = Math.max(10, box.w - PAD.left - PAD.right);
    const ph = Math.max(10, box.h - PAD.top - PAD.bottom);
    const lo = Math.min(...series);
    const hi = Math.max(...series);
    const ticks = niceTicks(lo, hi, ph < 110 ? 3 : 4);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const ySpan = yMax - yMin || 1;
    const x = (i) => PAD.left + (i / (series.length - 1)) * pw;
    const y = (v) => PAD.top + ph - ((v - yMin) / ySpan) * ph;
    const line = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${PAD.left},${PAD.top + ph} ${line} ${x(series.length - 1).toFixed(1)},${PAD.top + ph}`;
    const xt = chartAxis(months, Math.max(2, Math.floor(pw / 64)));
    return { pw, ph, ticks, x, y, line, area, xt };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, series, months]);
  const onMove = (e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - PAD.left) / geo.pw) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };
  const last = series[series.length - 1];
  return (
    <div
      className="cpr-chart"
      ref={setNode}
      role="img"
      aria-label={`${label}. ${series.length} months, latest ${usdCompact(last)}.`}
    >
      {geo ? (
        <svg
          viewBox={`0 0 ${box.w} ${box.h}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--emerald)', stopOpacity: 0.32 }} />
              <stop offset="100%" style={{ stopColor: 'var(--emerald)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line
                className="cpr-grid"
                x1={PAD.left}
                x2={box.w - PAD.right}
                y1={geo.y(t)}
                y2={geo.y(t)}
              />
              <text className="cpr-tick" x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end">
                {tickUsd(t)}
              </text>
            </g>
          ))}
          {geo.xt.map((t, k) => (
            <text
              key={t.i}
              className="cpr-tick"
              x={geo.x(t.i)}
              y={box.h - 4}
              textAnchor={k === 0 ? 'start' : k === geo.xt.length - 1 ? 'end' : 'middle'}
            >
              {t.text}
            </text>
          ))}
          <polygon points={geo.area} fill={`url(#${gid})`} />
          <polyline className="cpr-line" points={geo.line} />
          {hover != null ? (
            <g>
              <line
                className="cpr-cross"
                x1={geo.x(hover)}
                x2={geo.x(hover)}
                y1={PAD.top}
                y2={PAD.top + geo.ph}
              />
              <circle className="cpr-dot" cx={geo.x(hover)} cy={geo.y(series[hover])} r="3.5" />
            </g>
          ) : null}
        </svg>
      ) : null}
      {hover != null && geo ? (
        <span
          className="cpr-tip"
          style={{ left: Math.min(Math.max(geo.x(hover), 60), box.w - 60) }}
          aria-hidden="true"
        >
          {monthLabel(months[hover])} · {usdCompact(series[hover])}
        </span>
      ) : null}
    </div>
  );
}

function Analytics({ dossier }) {
  const id = useId();
  const s = dossier.stats || {};
  const hasChart = Array.isArray(dossier.series) && dossier.series.length >= 2;
  const change = seriesChange(dossier.series, 12);
  const kpis = [
    { k: 'Est. open value', v: typeof s.estValue === 'number' ? usdCompact(s.estValue) : 'N/A' },
    { k: 'Open positions', v: typeof s.openPositions === 'number' ? s.openPositions : 'N/A' },
    { k: 'Top holdings', v: dossier.topHoldings?.length ? dossier.topHoldings.join(' ') : 'N/A' },
    { k: 'Trades, 12M', v: typeof s.trades12m === 'number' ? s.trades12m : 'N/A' },
  ];
  return (
    <section id="sa-charts" className="cpr-card cpr-an" aria-labelledby={id}>
      <Eyebrow icon="bi-bar-chart-line" id={id} meta={dossier.seriesLabel || null}>
        {dossier.name} portfolio analytics
      </Eyebrow>
      <div className="cpr-an-top">
        <Face
          name={dossier.name}
          src={dossier.headshot}
          srcs={dossier.headshots}
          party={dossier.party}
          size="lg"
        />
        <div className="cpr-an-who">
          <span className="cpr-an-name">{dossier.name}</span>
          <span className="cpr-an-seat">
            {[seatOf(dossier), dossier.chamber].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="cpr-an-value">
          <span className="cpr-an-value-k">Estimated open value</span>
          <span className="cpr-an-value-v">
            {typeof s.estValue === 'number' ? usdCompact(s.estValue) : 'N/A'}
            {change ? (
              <span
                className={`cpr-chip${change.pct < 0 ? ' is-down' : ''}`}
                title="Change in the estimated series over 12 months"
              >
                <i
                  className={`bi ${change.pct < 0 ? 'bi-caret-down-fill' : 'bi-caret-up-fill'}`}
                  aria-hidden="true"
                />
                {change.pct >= 0 ? '+' : '-'}
                {Math.abs(change.pct).toFixed(1)}% (12M)
              </span>
            ) : null}
          </span>
        </div>
      </div>
      {hasChart ? (
        <ValueChart
          series={dossier.series}
          months={dossier.seriesMonths || []}
          label={`${dossier.name} estimated portfolio value`}
        />
      ) : (
        <p className="cpr-empty">No disclosed trades to chart yet.</p>
      )}
      <dl className="cpr-kpis">
        {kpis.map((x) => (
          <div key={x.k} className="cpr-kpi">
            <dt>{x.k}</dt>
            <dd>{x.v}</dd>
          </div>
        ))}
      </dl>
      <p className="cpr-note">
        Estimated from disclosed STOCK Act ranges at their midpoints. No market prices applied.
      </p>
    </section>
  );
}

const sharePct = (v) => (typeof v === 'number' && v > 0 ? `${(v * 100).toFixed(1)}%` : 'N/A');

function Positions({ dossier }) {
  const id = useId();
  const rows = Array.isArray(dossier.holdings) ? dossier.holdings : [];
  if (!rows.length) return null;
  const top = Math.max(0, ...rows.map((h) => Number(h.share) || 0));
  const s = dossier.stats || {};
  return (
    <section className="cpr-card cpr-pos" aria-labelledby={id}>
      <Eyebrow
        icon="bi-layers"
        id={id}
        meta={typeof s.openPositions === 'number' ? `${s.openPositions} open` : null}
      >
        Open positions
      </Eyebrow>
      <table className="cpr-table">
        <thead>
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col" className="cpr-num">
              Portfolio weight
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.ticker}>
              <td>
                <span className="cpr-ticker">{h.ticker}</span>
              </td>
              <td className="cpr-co">{h.company || h.sector || ''}</td>
              <td className="cpr-num">
                <span className="cpr-weight">
                  <span className="cpr-bar" aria-hidden="true">
                    <span
                      style={{
                        width: `${top ? Math.max(4, ((Number(h.share) || 0) / top) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span className="cpr-pct">{sharePct(h.share)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cpr-note">Share of the estimated open book, by disclosed ranges.</p>
    </section>
  );
}

/* ── row 3 ────────────────────────────────────────────────────────── */

function Similar({ dossier }) {
  const id = useId();
  const rows = Array.isArray(dossier.similar) ? dossier.similar : [];
  if (!rows.length) return null;
  return (
    <section className="cpr-card cpr-sim" aria-labelledby={id}>
      <Eyebrow icon="bi-people" id={id}>
        Similar portfolios in Congress
      </Eyebrow>
      <ol className="cpr-sim-list">
        {rows.map((p, i) => (
          <li key={p.bioguideId || p.name} className="cpr-sim-row">
            <span className="cpr-rank" aria-hidden="true">
              {i + 1}
            </span>
            <Face name={p.name} src={p.headshot} srcs={p.headshots} party={p.party} size="sm" />
            <span className="cpr-sim-who">
              <span className="cpr-sim-name">{p.name}</span>
              <span className="cpr-sim-seat">
                {[seatOf(p), p.chamber].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="cpr-sim-overlap">
              <span className="cpr-sim-count">
                {p.sharedCount || p.shared?.length || 0} shared ticker
                {(p.sharedCount || p.shared?.length || 0) === 1 ? '' : 's'}
              </span>
              {p.shared?.length ? (
                <span className="cpr-sim-tickers">{p.shared.slice(0, 3).join(', ')}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      <Link href="/inside-the-capitol" className="cpr-link">
        Compare portfolios in Capitol Watch <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </section>
  );
}

function when(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

function News({ name, columns }) {
  const id = useId();
  const rows = newsRows(columns, 4);
  if (!rows.length) return null;
  return (
    <section className="cpr-card cpr-news" aria-labelledby={id}>
      <Eyebrow icon="bi-newspaper" id={id}>
        News around {name}
      </Eyebrow>
      <ul className="cpr-news-list">
        {rows.map((n) => (
          <li key={n.url}>
            <a className="cpr-news-item" href={n.url} target="_blank" rel="noopener noreferrer">
              <span className="cpr-news-title">{n.title}</span>
              <span className="cpr-news-meta">
                {n.origin === 'dataset' ? (
                  <span className="cpr-tag">
                    <i className="bi bi-database" aria-hidden="true" /> Ezana data
                  </span>
                ) : null}
                <span>{n.source || hostOf(n.url)}</span>
                {when(n.publishedAt) ? <span>{when(n.publishedAt)}</span> : null}
              </span>
              <i className="bi bi-box-arrow-up-right cpr-news-out" aria-hidden="true" />
              <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── the report ───────────────────────────────────────────────────── */

/**
 * live        the ping response (dossier.kind === 'politician')
 * headline, paragraphs, more  the desk summary's text (the board picks it)
 * takeaways   strings from deskTakeaways()
 * notice      the "showing results for" notice
 * actions     Save (SonarSaveActions)
 * remaining   free pings left, or null
 */
export function CongressProfileReport({
  live,
  headline = null,
  paragraphs = [],
  more = [],
  takeaways = [],
  notice = null,
  actions = null,
  remaining = null,
}) {
  const dossier = live?.dossier;
  if (!dossier) return null;
  const lean = tradingLean(dossier);
  const meta = [MODE_LABEL.quick || 'Quick ping', answeredLabel(live?.answeredAt || null)].filter(
    Boolean,
  );
  const hasTake = takeaways.length >= 2;
  const row1 = ['desk', lean ? 'lean' : null, hasTake ? 'take' : null].filter(Boolean).length;
  const hasSim = Array.isArray(dossier.similar) && dossier.similar.length > 0;
  const hasNews = newsRows(live?.newsColumns, 1).length > 0;
  const hasPos = Array.isArray(dossier.holdings) && dossier.holdings.length > 0;
  return (
    <div className="cpr" role="region" aria-label={`${live.query}: answer`}>
      <div className="cpr-meta">
        <div className="cpr-meta-left">
          {notice}
          <span className="cpr-meta-line">
            {meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
            {typeof remaining === 'number' ? (
              <span>
                {remaining} free ping{remaining === 1 ? '' : 's'} left
              </span>
            ) : null}
          </span>
        </div>
        {actions ? <div className="cpr-meta-actions">{actions}</div> : null}
      </div>
      <div className={`cpr-row cpr-row--1 is-${row1}`}>
        <DeskSummary
          headline={headline}
          question={live.query}
          paragraphs={paragraphs}
          more={more}
        />
        {lean ? <LeanGauge lean={lean} last={lastNameOf(dossier.name)} /> : null}
        {hasTake ? <Takeaways items={takeaways} /> : null}
      </div>
      <div className={`cpr-row cpr-row--2${hasPos ? '' : ' is-1'}`}>
        <Analytics dossier={dossier} />
        <Positions dossier={dossier} />
      </div>
      {hasSim || hasNews ? (
        <div className={`cpr-row cpr-row--3${hasSim && hasNews ? '' : ' is-1'}`}>
          <Similar dossier={dossier} />
          <News name={dossier.name} columns={live.newsColumns} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The right rail's Evidence and sources (the report's sa-sources anchor): the first three
 * rows, then every row behind "View all sources". rows from deskSourceRows(); count the true
 * total.
 */
export function CongressEvidence({ rows = [], count = 0 }) {
  const id = useId();
  const [all, setAll] = useState(false);
  if (!count) return null;
  const shown = all ? rows : rows.slice(0, 3);
  return (
    <section id="sa-sources" className="san-card cpr-ev" aria-labelledby={id}>
      <h2 id={id} className="san-card-head">
        <i className="bi bi-database" aria-hidden="true" />
        Evidence and sources
      </h2>
      <ul className="cpr-ev-list">
        {shown.map((r) => {
          const inner = (
            <>
              <span className="cpr-ev-tile" aria-hidden="true">
                {r.initial}
              </span>
              <span className="cpr-ev-text">
                <span className="cpr-ev-name">{r.name}</span>
                {r.descriptor ? <span className="cpr-ev-desc">{r.descriptor}</span> : null}
              </span>
              {r.href && r.external ? (
                <i className="bi bi-box-arrow-up-right cpr-ev-out" aria-hidden="true" />
              ) : null}
            </>
          );
          return (
            <li key={r.key}>
              {r.href ? (
                <a
                  className="cpr-ev-row"
                  href={r.href}
                  {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {inner}
                  {r.external ? <VisuallyHidden> (opens in a new tab)</VisuallyHidden> : null}
                </a>
              ) : (
                <span className="cpr-ev-row">{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > 3 ? (
        <button
          type="button"
          className="cpr-ev-all"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
        >
          {all ? 'Show fewer sources' : `View all sources (${count})`}
          <i className={`bi ${all ? 'bi-chevron-up' : 'bi-arrow-right'}`} aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

export default CongressProfileReport;
