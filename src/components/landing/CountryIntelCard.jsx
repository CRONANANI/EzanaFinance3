'use client';

/**
 * Country & Currency Intelligence card (Nov 2026).
 *
 * For a country question ("Is Turkey's lira under pressure?", "How is Brazil's economy
 * doing?") the pipeline attaches `dossier.intel`: the validated brief (or a computed
 * fallback), up to four KPIs, the assessment rows, conditional scenarios, what to monitor,
 * the measures Ezana does not hold, the chart series and the transmission map. This card
 * renders only what exists: a missing measure drops out, never an empty tile.
 *
 * Every number on screen is one the pipeline computed from stored series. The charts draw
 * real points only and caption their unit, period and source. The assessment is
 * qualitative against Ezana thresholds; the scenarios are conditional, not forecasts; the
 * transmission map is conceptual, not a fitted causal model. Each says so where it shows.
 *
 * Renders in the Sonar band's stack and in the deep research report: card-local --cii-*
 * tokens resolve to the band's --snr-* system inside .snr-band and to the app theme tokens
 * elsewhere. Mono numerics, ds Table / Badge / Tooltip / VisuallyHidden. Styles:
 * country-intel.css, scoped snr-cii-.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD, VisuallyHidden, Badge, Tooltip } from '@/components/ds';
import {
  hasCountryIntel,
  dateLabel,
  cleanPoints,
  fxWindow,
  fxWindowsAvailable,
  defaultFxWindow,
  axisTicks,
  stepDecimals,
  fmtValue,
  isPctUnit,
  missingSentence,
  sentenceCase,
  paragraphs,
  transmissionLayout,
  nodeStatus,
} from '@/lib/sonar/country-intel-view';
import './country-intel.css';

export { hasCountryIntel };

/* ── helpers ────────────────────────────────────────────────────────────── */

function usePixelWidth() {
  const [w, setW] = useState(null);
  const roRef = useRef(null);
  const setNode = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      if (width > 0) setW(width);
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);
  return [w, setNode];
}

const BADGE_TONE = {
  low: 'positive',
  moderate: 'info',
  elevated: 'warning',
  severe: 'negative',
};

/* ── charts ─────────────────────────────────────────────────────────────── */

const PLOT_H = 148;
const M = { l: 44, r: 10, t: 8, b: 20 };

/**
 * One or two series on one axis (never two scales), drawn in pixel space so the axis text
 * is real 11px type. Crosshair and readout on hover; arrow keys step through the points.
 */
function IntelLineChart({ title, series, unit, caption, legend = false, controls = null }) {
  const [width, setNode] = usePixelWidth();
  const [idx, setIdx] = useState(null);
  const [kbd, setKbd] = useState(false);
  const descId = useId();
  const live = (series || []).filter((s) => s.points?.length >= 2);
  const primary = live.reduce((a, b) => (!a || b.points.length > a.points.length ? b : a), null);
  if (!primary) return null;

  const pct = isPctUnit(unit);
  const W = width || 320;
  const H = PLOT_H;
  const all = live.flatMap((s) => s.points);
  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(...all.map((p) => p.t));
  const ys = all.map((p) => p.y);
  let lo0 = Math.min(...ys);
  let hi0 = Math.max(...ys);
  if (pct && lo0 < 0 && hi0 > 0) {
    lo0 = Math.min(lo0, 0);
    hi0 = Math.max(hi0, 0);
  }
  const { ticks, lo, hi, step } = axisTicks(lo0, hi0, 4);
  const tickDec = stepDecimals(step);
  const x = (t) => M.l + ((t - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
  const y = (v) => H - M.b - ((v - lo) / (hi - lo || 1)) * (H - M.t - M.b);
  const path = (pts) => pts.map((p) => `${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const val = (v) => fmtValue(v, { pct, decimals: pct ? 1 : null });
  const nearest = (pts, t) =>
    pts.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a), pts[0]);

  const at = idx == null ? primary.points.length - 1 : Math.min(idx, primary.points.length - 1);
  const focus = primary.points[at];
  const readout = live.map((s) => {
    const p = nearest(s.points, focus.t);
    return { id: s.id, label: s.label, x: p.x, y: p.y };
  });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(
      1,
      Math.max(0, (e.clientX - r.left - M.l) / Math.max(1, r.width - M.l - M.r)),
    );
    const t = t0 + frac * (t1 - t0);
    const p = nearest(primary.points, t);
    setKbd(false);
    setIdx(primary.points.indexOf(p));
  };
  const onKey = (e) => {
    const last = primary.points.length - 1;
    const cur = idx == null ? last : idx;
    let next = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') next = Math.min(last, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else if (e.key === 'Escape') {
      setIdx(null);
      return;
    }
    if (next != null) {
      e.preventDefault();
      setKbd(true);
      setIdx(next);
    }
  };

  const first = primary.points[0];
  const lastP = primary.points[primary.points.length - 1];
  const summary = live
    .map((s) => {
      const vals = s.points.map((p) => p.y);
      const l = s.points[s.points.length - 1];
      return `${s.label}: latest ${val(l.y)} (${dateLabel(l.x)}), low ${val(Math.min(...vals))}, high ${val(Math.max(...vals))}`;
    })
    .join('. ');
  const xMid = (t0 + t1) / 2;

  return (
    <figure className="snr-cii-chart">
      <figcaption className="snr-cii-chart-title">{title}</figcaption>
      {controls}
      <div className="snr-cii-chart-top">
        {legend && live.length > 1 ? (
          <span className="snr-cii-legend" aria-hidden="true">
            {live.map((s) => (
              <span key={s.id} className={`snr-cii-key${s.dashed ? ' is-dashed' : ''}`}>
                {s.label}
              </span>
            ))}
          </span>
        ) : null}
        <span className="snr-cii-read" aria-live={kbd ? 'polite' : 'off'}>
          {dateLabel(focus.x)}
          {readout.map((r) => (
            <span key={r.id}>
              {live.length > 1 ? ` · ${r.label} ` : ' · '}
              {val(r.y)}
            </span>
          ))}
        </span>
      </div>
      <div
        className="snr-cii-plot"
        ref={setNode}
        tabIndex={0}
        role="img"
        aria-label={`${title}, ${dateLabel(first.x)} to ${dateLabel(lastP.x)}, ${unit}.`}
        aria-describedby={descId}
        onPointerMove={onMove}
        onPointerLeave={() => setIdx(null)}
        onKeyDown={onKey}
      >
        <VisuallyHidden id={descId}>
          {summary}. Use the left and right arrow keys to read each point.
        </VisuallyHidden>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="snr-cii-grid" />
              <text
                x={M.l - 6}
                y={y(t)}
                className="snr-cii-tick"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {fmtValue(t, { pct, decimals: tickDec })}
              </text>
            </g>
          ))}
          {pct && lo < 0 && hi > 0 ? (
            <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="snr-cii-zero" />
          ) : null}
          {live.map((s) => (
            <polyline
              key={s.id}
              points={path(s.points)}
              className={`snr-cii-line${s.dashed ? ' is-dashed' : ''}`}
            />
          ))}
          <text x={M.l} y={H - 4} className="snr-cii-tick" textAnchor="start">
            {dateLabel(first.x)}
          </text>
          {W > 300 ? (
            <text x={x(xMid)} y={H - 4} className="snr-cii-tick" textAnchor="middle">
              {dateLabel(nearest(primary.points, xMid).x)}
            </text>
          ) : null}
          <text x={W - M.r} y={H - 4} className="snr-cii-tick" textAnchor="end">
            {dateLabel(lastP.x)}
          </text>
          <line x1={x(focus.t)} x2={x(focus.t)} y1={M.t} y2={H - M.b} className="snr-cii-guide" />
          {readout.map((r, i) => {
            const s = live[i];
            const p = nearest(s.points, focus.t);
            return (
              <circle
                key={r.id}
                cx={x(p.t)}
                cy={y(p.y)}
                r={4}
                className={`snr-cii-dot${s.dashed ? ' is-dashed' : ''}`}
              />
            );
          })}
        </svg>
      </div>
      {caption ? <span className="snr-cii-cap">{caption}</span> : null}
    </figure>
  );
}

const chartCaption = (c) =>
  c
    ? [c.unit ? `Unit: ${c.unit}` : null, c.period, c.source ? `Source: ${c.source}` : null]
        .filter(Boolean)
        .join('. ') + '.'
    : null;

function FxChart({ fx, fxMonthly }) {
  const base = fx || fxMonthly;
  const available = useMemo(
    () => fxWindowsAvailable(base, fx ? fxMonthly : null),
    [base, fx, fxMonthly],
  );
  const [win, setWin] = useState(() => defaultFxWindow(available));
  const groupId = useId();
  if (!available.length) return null;
  const cur =
    available.find((w) => w.id === win) ||
    available.find((w) => w.id === defaultFxWindow(available));
  const shown = fxWindow(base, fx ? fxMonthly : null, cur.months);
  if (!shown) return null;
  const c = shown.chart;
  const pts = shown.points;
  const period = `${dateLabel(pts[0].x)} to ${dateLabel(pts[pts.length - 1].x)}`;
  return (
    <IntelLineChart
      key={`${cur.id}-${c === fxMonthly ? 'm' : 'd'}`}
      title={base.label || 'Local currency per US dollar'}
      unit={c.unit || base.unit || ''}
      series={[{ id: 'fx', label: c.label || base.label, points: pts }]}
      caption={chartCaption({ ...c, period })}
      controls={
        available.length > 1 ? (
          <div className="snr-cii-seg" role="group" aria-labelledby={groupId}>
            <VisuallyHidden id={groupId}>Exchange-rate range</VisuallyHidden>
            {available.map((w) => (
              <button
                key={w.id}
                type="button"
                className="snr-cii-segbtn"
                aria-pressed={w.id === cur.id}
                onClick={() => setWin(w.id)}
              >
                {w.id}
                <VisuallyHidden>, {w.label}</VisuallyHidden>
              </button>
            ))}
          </div>
        ) : null
      }
    />
  );
}

function IntelCharts({ charts }) {
  if (!charts) return null;
  const infl = charts.inflation ? cleanPoints(charts.inflation) : [];
  const pol = charts.policy ? cleanPoints(charts.policy) : [];
  const res = charts.reserves ? cleanPoints(charts.reserves) : [];
  const fxBase = charts.fx || charts.fxMonthly;
  const items = [];
  if (infl.length >= 2)
    items.push(
      <IntelLineChart
        key="infl"
        title={charts.inflation.label || 'Inflation'}
        unit={charts.inflation.unit || '%'}
        series={[{ id: 'infl', label: 'Inflation', points: infl }]}
        caption={chartCaption(charts.inflation)}
      />,
    );
  if (fxBase && cleanPoints(fxBase).length + cleanPoints(charts.fxMonthly).length >= 2)
    items.push(<FxChart key="fx" fx={charts.fx} fxMonthly={charts.fxMonthly} />);
  if (pol.length >= 2) {
    /* Inflation versus the policy rate: one % axis over the months both cover. */
    const from = infl.length >= 2 ? Math.max(infl[0].t, pol[0].t) : pol[0].t;
    const inflShown = infl.filter((p) => p.t >= from);
    const polShown = pol.filter((p) => p.t >= from);
    const both = inflShown.length >= 2 && polShown.length >= 2;
    const sources = [
      ...new Set([both ? charts.inflation.source : null, charts.policy.source].filter(Boolean)),
    ];
    const pts = both ? [...inflShown, ...polShown] : polShown;
    const t0 = Math.min(...pts.map((p) => p.t));
    const first = pts.find((p) => p.t === t0);
    const lastPol = polShown[polShown.length - 1];
    const lastInfl = inflShown[inflShown.length - 1];
    const end = both && lastInfl && lastInfl.t > lastPol.t ? lastInfl : lastPol;
    items.push(
      <IntelLineChart
        key="policy"
        title={both ? 'Inflation and the policy rate' : charts.policy.label || 'Policy rate'}
        unit="%"
        legend={both}
        series={[
          ...(both ? [{ id: 'infl', label: 'Inflation', points: inflShown }] : []),
          { id: 'policy', label: 'Policy rate', points: polShown, dashed: both },
        ]}
        caption={`${both ? 'Annual inflation (solid line) and policy rate (dashed line), unit: %' : `Unit: ${charts.policy.unit || '%'}`}. ${dateLabel(first.x)} to ${dateLabel(end.x)}. Source: ${sources.join('; ')}.`}
      />,
    );
  }
  if (res.length >= 2)
    items.push(
      <IntelLineChart
        key="res"
        title={charts.reserves.label || 'Official reserves'}
        unit={charts.reserves.unit || ''}
        series={[{ id: 'res', label: 'Reserves', points: res }]}
        caption={chartCaption(charts.reserves)}
      />,
    );
  if (!items.length) return null;
  return <div className="snr-cii-charts">{items}</div>;
}

/* ── transmission map ───────────────────────────────────────────────────── */

function TransmissionMap({ map, headingId }) {
  const [width, setNode] = usePixelWidth();
  const markerId = `snr-cii-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const L = width ? transmissionLayout(map, width) : null;
  const nodes = map?.nodes || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const status = nodeStatus;
  return (
    <div className="snr-cii-map">
      <ul className="snr-cii-map-keys" aria-hidden="true">
        <li className="snr-cii-mapkey is-supported">Supported by data</li>
        <li className="snr-cii-mapkey">Conceptual</li>
      </ul>
      <div className="snr-cii-map-box" ref={setNode}>
        {L ? (
          <svg
            width={L.width}
            height={L.height + 2}
            viewBox={`0 -1 ${L.width} ${L.height + 2}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 z" className="snr-cii-arrowhead" />
              </marker>
            </defs>
            {L.edges.map((e) => (
              <line
                key={`${e.from}-${e.to}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                className="snr-cii-edge"
                markerEnd={`url(#${markerId})`}
              />
            ))}
            {L.nodes.map((n) => (
              <g key={n.id} className={`snr-cii-node${n.supported ? ' is-supported' : ''}`}>
                <rect x={n.x + 0.5} y={n.y + 0.5} width={n.w - 1} height={n.h - 1} rx={8} />
                {n.lines.map((ln, i) => (
                  <text
                    key={i}
                    x={n.x + 8}
                    y={n.y + 8 + 11 + i * 14}
                    className="snr-cii-node-label"
                  >
                    {ln}
                  </text>
                ))}
                {n.tagLines.map((ln, i) => (
                  <text
                    key={`t${i}`}
                    x={n.x + 8}
                    y={n.y + n.h - 8 - (n.tagLines.length - 1 - i) * 14}
                    className="snr-cii-node-tag"
                  >
                    {ln}
                  </text>
                ))}
              </g>
            ))}
          </svg>
        ) : null}
      </div>
      {/* The same map as text: every channel with its status. */}
      <VisuallyHidden as="ul" aria-labelledby={headingId}>
        {(map?.edges || []).map((e) => {
          const [a, b] = Array.isArray(e) ? e : [e?.from, e?.to];
          const na = byId.get(a);
          const nb = byId.get(b);
          if (!na || !nb) return null;
          return (
            <li key={`${a}-${b}`}>
              {na.label} ({status(na)}) leads to {nb.label} ({status(nb)})
            </li>
          );
        })}
      </VisuallyHidden>
      <span className="snr-cii-cap">
        {map?.caption || 'Conceptual channels, not a fitted causal model.'}
      </span>
    </div>
  );
}

/* ── the card ───────────────────────────────────────────────────────────── */

/* True while the node scrolls vertically (the landing band's absorber case), so the card is
   a keyboard tab stop only when there is something to scroll. */
function useScrollable() {
  const [scrollable, setScrollable] = useState(false);
  const roRef = useRef(null);
  const setNode = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node || typeof ResizeObserver === 'undefined') return;
    const check = () => setScrollable(node.scrollHeight > node.clientHeight + 1);
    const ro = new ResizeObserver(check);
    ro.observe(node);
    roRef.current = ro;
    check();
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);
  return [scrollable, setNode];
}

function Heading({ id, children }) {
  return (
    <h4 id={id} className="snr-cii-h">
      {children}
    </h4>
  );
}

export function CountryIntelCard({ dossier }) {
  const uid = useId();
  const ids = (k) => `${uid}-${k}`;
  const [scrollable, setCardNode] = useScrollable();
  const intel = dossier?.intel;
  if (!hasCountryIntel(dossier)) return null;

  const focus = intel.focus || 'FX risk';
  const place = intel.place || dossier.name;
  const iso3 = intel.iso3 || dossier.iso3;
  const cur = intel.currency;
  const brief = intel.brief || null;
  const fallback = brief ? [] : paragraphs(intel.fallbackText);
  const kpis = (intel.kpis || []).filter((k) => k && k.value != null && k.value !== '').slice(0, 4);
  const rows = (intel.rows || []).filter((r) => r && r.label);
  const missing = (intel.missing || []).filter(Boolean);
  const missingNote = missingSentence(missing);
  const drivers = (brief?.drivers || []).filter((d) => d && (d.title || d.text));
  const scenarios = (brief?.scenarios || []).filter((s) => s && s.name);
  const monitor = (brief?.monitor || []).filter((m) => m && m.indicator);
  const map = intel.transmission;
  const hasMap = Boolean(map?.nodes?.length);
  const sources = (intel.sources || []).filter(Boolean);

  return (
    <section
      className="snr-fund snr-fund--wide snr-fund--cty snr-cii"
      aria-labelledby={ids('title')}
      ref={setCardNode}
      tabIndex={scrollable ? 0 : undefined}
    >
      <div className="snr-cii-head">
        {iso3 ? <span className="snr-cii-iso">{iso3}</span> : null}
        <h3 id={ids('title')} className="snr-cii-kicker">
          Country intelligence · {focus}
        </h3>
        <span className="snr-cii-rule" aria-hidden="true" />
      </div>

      <div className="snr-cii-meta">
        <span className="snr-cii-place">{place}</span>
        {cur?.code ? (
          <span className="snr-cii-cur">
            {cur.name ? `${sentenceCase(cur.name)} ` : ''}
            <span className="snr-cii-mono">({cur.code})</span>
          </span>
        ) : null}
        {intel.asOf ? (
          <span className="snr-cii-asof">
            As of <time dateTime={intel.asOf}>{dateLabel(intel.asOf)}</time>
          </span>
        ) : null}
        {intel.assessmentLabel ? (
          <Tooltip label="Ezana thresholds" className="snr-cii-tip">
            <Badge
              tone={BADGE_TONE[intel.overall] || 'neutral'}
              className="snr-cii-badge"
              tabIndex={0}
              aria-describedby={ids('thr')}
            >
              {intel.assessmentLabel}
            </Badge>
          </Tooltip>
        ) : null}
        {intel.assessmentLabel ? (
          <VisuallyHidden id={ids('thr')}>Assessed against Ezana thresholds</VisuallyHidden>
        ) : null}
      </div>

      {brief ? (
        <div className="snr-cii-lede">
          {brief.answer ? <p className="snr-cii-answer">{brief.answer}</p> : null}
          {brief.assessmentLine ? <p className="snr-cii-assess">{brief.assessmentLine}</p> : null}
        </div>
      ) : fallback.length ? (
        <div className="snr-cii-lede">
          {fallback.map((t, i) => (
            <p key={i} className={i === 0 ? 'snr-cii-answer' : 'snr-cii-para'}>
              {t}
            </p>
          ))}
        </div>
      ) : null}

      {kpis.length ? (
        <ul className="snr-cii-kpis" aria-label="Key measures">
          {kpis.map((k) => (
            <li key={k.id || k.label} className="snr-cii-kpi">
              <span className="snr-cii-kpi-label">{k.label}</span>
              <span className="snr-cii-kpi-value">{String(k.value).replace(/^-/, '−')}</span>
              {k.period ? <span className="snr-cii-kpi-cap">{k.period}</span> : null}
              {k.change ? (
                <span className="snr-cii-kpi-cap">
                  {String(k.change).replace(/(^|\s)-(?=\d)/g, '$1\u2212')}
                </span>
              ) : null}
              {k.stale ? <span className="snr-cii-stale">Not current</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {drivers.length ? (
        <div className="snr-cii-sec">
          <Heading id={ids('drv')}>
            {focus === 'Macro' ? 'What is driving it' : 'What is driving the pressure'}
          </Heading>
          <ol className="snr-cii-ol" aria-labelledby={ids('drv')}>
            {drivers.map((d, i) => (
              <li key={i}>
                {d.title ? <strong className="snr-cii-strong">{d.title}.</strong> : null} {d.text}
                {d.refs?.length ? (
                  <span className="snr-cii-refs"> {d.refs.map((r) => `[${r}]`).join('')}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {rows.length ? (
        <div className="snr-cii-sec">
          <Heading id={ids('sev')}>How serious is it</Heading>
          <div className="snr-cii-scroll" role="region" aria-labelledby={ids('sev')} tabIndex={0}>
            <Table className="snr-cii-table">
              <VisuallyHidden as="caption">
                How serious is it: each component and its level
              </VisuallyHidden>
              <THead>
                <TR>
                  <TH scope="col">Component</TH>
                  <TH scope="col">Level</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR
                    key={r.id || r.label}
                    className={r.id === 'crisis' ? 'snr-cii-crisis' : undefined}
                  >
                    <TH scope="row" className="snr-cii-rowh">
                      {r.label}
                    </TH>
                    <TD
                      className={`snr-cii-level is-${String(r.level || '').replace(/\s+/g, '-')}`}
                    >
                      {sentenceCase(r.level || 'n/a')}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <span className="snr-cii-cap">
            Qualitative assessment against Ezana thresholds, not a calibrated risk score.
          </span>
        </div>
      ) : null}

      {scenarios.length ? (
        <div className="snr-cii-sec">
          <Heading id={ids('scn')}>What could happen next</Heading>
          <div className="snr-cii-scroll" role="region" aria-labelledby={ids('scn')} tabIndex={0}>
            <Table className="snr-cii-table snr-cii-table--scn" role="table">
              <VisuallyHidden as="caption">
                What could happen next: conditional scenarios, not forecasts
              </VisuallyHidden>
              <THead role="rowgroup">
                <TR role="row">
                  <TH scope="col" role="columnheader">
                    Scenario
                  </TH>
                  <TH scope="col" role="columnheader">
                    Conditions
                  </TH>
                  <TH scope="col" role="columnheader">
                    Implication
                  </TH>
                </TR>
              </THead>
              <TBody role="rowgroup">
                {scenarios.map((s, i) => (
                  <TR key={i} role="row">
                    <TH scope="row" role="rowheader" className="snr-cii-rowh">
                      {s.name}
                    </TH>
                    <TD role="cell" data-label="Conditions">
                      {s.conditions}
                    </TD>
                    <TD role="cell" data-label="Implication">
                      {s.implication}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <span className="snr-cii-cap">Conditional scenarios, not forecasts.</span>
        </div>
      ) : null}

      {monitor.length ? (
        <div className="snr-cii-sec">
          <Heading id={ids('mon')}>What to monitor</Heading>
          <ol className="snr-cii-ol" aria-labelledby={ids('mon')}>
            {monitor.map((m, i) => (
              <li key={i}>
                <strong className="snr-cii-strong">{m.indicator}.</strong> {m.why}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {brief?.bottomLine ? (
        <div className="snr-cii-sec">
          <Heading>Bottom line</Heading>
          <p className="snr-cii-para">{brief.bottomLine}</p>
        </div>
      ) : null}

      {missing.length ? (
        <div className="snr-cii-sec">
          <Heading id={ids('na')}>Data not available</Heading>
          <ul className="snr-cii-ul" aria-labelledby={ids('na')}>
            {missing.map((m) => (
              <li key={m}>{sentenceCase(m)}</li>
            ))}
          </ul>
          {missingNote ? <p className="snr-cii-para snr-cii-muted">{missingNote}</p> : null}
        </div>
      ) : null}

      <IntelCharts charts={intel.charts} />

      {hasMap ? (
        <div className="snr-cii-sec">
          <Heading id={ids('map')}>How pressure can travel</Heading>
          <TransmissionMap map={map} headingId={ids('map')} />
        </div>
      ) : null}

      {sources.length ? (
        <span className="snr-cii-cap snr-cii-sources">Sources: {sources.join('; ')}.</span>
      ) : null}
    </section>
  );
}

export default CountryIntelCard;
