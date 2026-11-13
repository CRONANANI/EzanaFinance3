'use client';

/**
 * SonarMarketContext (Sonar research workspace, Nov 13 2026): one listed company against its
 * benchmark, inside the Desk Summary. Daily closes from /api/sonar/market-context, rebased to
 * 0% at the start of the chosen range. All maths comes from lib/sonar/market-context.js
 * (compareSeries, availableRanges, signedPct, signedPoints, chartSummary); this component only
 * draws. Inline SVG, no chart library. There is no intraday feed, so there is no 1D tab.
 *
 * Failure or no data: one line and Retry, never a placeholder line. Loaded with next/dynamic
 * by SonarDeskSummary. Styles: sonar-market-context.css (smc-).
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Modal } from '@/components/ds';
import {
  DEFAULT_RANGE,
  MARKET_RANGES,
  availableRanges,
  chartSummary,
  compareSeries,
  signedPct,
  signedPoints,
} from '@/lib/sonar/market-context';
import { dayLabel } from '@/lib/sonar/desk-summary';
import './sonar-market-context.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* About four round percent steps covering the domain. */
function percentTicks(lo, hi) {
  const span = Math.max(hi - lo, 1);
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

function geometry(cmp, { w, h, padL = 44, padR = 10, padT = 10, padB = 24 }) {
  const pts = cmp.series;
  const vals = pts.flatMap((p) => [p.subject, p.benchmark]).filter(Number.isFinite);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const x = (i) => padL + (pts.length < 2 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * ih;
  const line = (key) =>
    pts
      .map((p, i) => (Number.isFinite(p[key]) ? `${i ? 'L' : 'M'}${x(i)},${y(p[key])}` : ''))
      .join('');
  const subject = line('subject');
  const area = `${subject}L${x(pts.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`;
  const bench = pts.some((p) => Number.isFinite(p.benchmark)) ? line('benchmark') : null;
  /* Month ticks at the first trading day of each month, thinned to about six. */
  const months = [];
  pts.forEach((p, i) => {
    const m = p.date.slice(0, 7);
    if (!i || m !== pts[i - 1].date.slice(0, 7)) months.push({ i, m });
  });
  const every = Math.max(1, Math.ceil(months.length / 6));
  const monthTicks = months
    .filter((_, k) => k % every === 0)
    .map(({ i, m }) => ({ x: x(i), label: MONTHS[Number(m.slice(5, 7)) - 1] }));
  return {
    x,
    y,
    subject,
    area,
    bench,
    yTicks: percentTicks(lo, hi).map((v) => ({ v, y: y(v) })),
    zeroY: y(0),
    monthTicks,
    padL,
    padR,
    w,
    h,
    bottom: h - padB,
  };
}

function Chart({ cmp, subjectLabel, benchLabel, size = 'card' }) {
  const raw = useId();
  const gid = `smc-g-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [at, setAt] = useState(null);
  const w = size === 'large' ? 960 : 640;
  const h = size === 'large' ? 380 : 220;
  const g = useMemo(() => geometry(cmp, { w, h }), [cmp, w, h]);
  const n = cmp.series.length;
  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - box.left) / box.width) * w;
    const i = Math.round(((fx - g.padL) / (w - g.padL - g.padR)) * (n - 1));
    setAt(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setAt((cur) => Math.max(0, Math.min(n - 1, (cur ?? (step > 0 ? -1 : n)) + step)));
    } else if (e.key === 'Home') setAt(0);
    else if (e.key === 'End') setAt(n - 1);
    else if (e.key === 'Escape') setAt(null);
  };
  const p = at == null ? null : cmp.series[at];
  const label = chartSummary(cmp, subjectLabel, benchLabel);
  return (
    <div className={`smc-chart smc-chart--${size}`}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="smc-svg"
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="smc-grad-top" />
            <stop offset="100%" className="smc-grad-bottom" />
          </linearGradient>
        </defs>
        {g.yTicks.map((t) => (
          <g key={t.v}>
            <line x1={g.padL} x2={w - g.padR} y1={t.y} y2={t.y} className="smc-grid" />
            <text x={g.padL - 6} y={t.y} className="smc-ytick" textAnchor="end" dy="0.32em">
              {`${t.v > 0 ? '+' : t.v < 0 ? '−' : ''}${Math.abs(t.v)}%`}
            </text>
          </g>
        ))}
        <line x1={g.padL} x2={w - g.padR} y1={g.zeroY} y2={g.zeroY} className="smc-zero" />
        {g.monthTicks.map((t) => (
          <text key={`${t.x}`} x={t.x} y={g.bottom + 16} className="smc-xtick" textAnchor="middle">
            {t.label}
          </text>
        ))}
        <path d={g.area} fill={`url(#${gid})`} className="smc-area" />
        {g.bench ? <path d={g.bench} className="smc-bench" /> : null}
        <path d={g.subject} className="smc-subject" />
        {p ? (
          <g aria-hidden="true">
            <line x1={g.x(at)} x2={g.x(at)} y1={10} y2={g.bottom} className="smc-cross" />
            <circle cx={g.x(at)} cy={g.y(p.subject)} r="3.5" className="smc-dot" />
            {Number.isFinite(p.benchmark) ? (
              <circle cx={g.x(at)} cy={g.y(p.benchmark)} r="3" className="smc-dot-b" />
            ) : null}
          </g>
        ) : null}
        <rect
          x={g.padL}
          y={0}
          width={w - g.padL - g.padR}
          height={g.bottom}
          className="smc-hit"
          tabIndex={0}
          aria-label="Chart values: use the left and right arrow keys"
          onMouseMove={pick}
          onMouseLeave={() => setAt(null)}
          onFocus={() => setAt((cur) => cur ?? n - 1)}
          onBlur={() => setAt(null)}
          onKeyDown={onKey}
        />
      </svg>
      {p ? (
        <div
          className="smc-tip"
          role="status"
          style={{ left: `${(g.x(at) / w) * 100}%` }}
          data-side={g.x(at) > w * 0.6 ? 'left' : 'right'}
        >
          <span className="smc-tip-date">{dayLabel(p.date)}</span>
          <span className="smc-tip-row">
            <span className="smc-key smc-key--s" aria-hidden="true" />
            {subjectLabel} <b>{signedPct(p.subject)}</b>
          </span>
          {Number.isFinite(p.benchmark) ? (
            <span className="smc-tip-row">
              <span className="smc-key smc-key--b" aria-hidden="true" />
              {benchLabel} <b>{signedPct(p.benchmark)}</b>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function tone(v) {
  if (!Number.isFinite(v) || Math.abs(v) < 0.05) return 'flat';
  return v > 0 ? 'up' : 'down';
}

function Stats({ cmp, subjectLabel, benchLabel }) {
  return (
    <dl className="smc-stats">
      <div>
        <dt>{subjectLabel}</dt>
        <dd className={`is-${tone(cmp.subjectReturn)}`}>{signedPct(cmp.subjectReturn)}</dd>
      </div>
      {cmp.benchmarkReturn != null ? (
        <>
          <div>
            <dt>{benchLabel}</dt>
            <dd className="is-bench">{signedPct(cmp.benchmarkReturn)}</dd>
          </div>
          <div>
            <dt>Relative</dt>
            <dd className={`is-${tone(cmp.relative)}`}>{signedPoints(cmp.relative)}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

/**
 * symbol     the company's ticker
 * benchmark  { symbol, label } from benchmarkFor()
 */
export default function SonarMarketContext({ symbol, benchmark = null }) {
  const titleId = useId();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [range, setRange] = useState(null);
  const [open, setOpen] = useState(false);
  const benchSym = benchmark?.symbol || '';

  const load = useCallback(() => {
    if (!symbol) return undefined;
    const ctrl = new AbortController();
    setState('loading');
    const qs = new URLSearchParams({ symbol });
    if (benchSym) qs.set('benchmark', benchSym);
    fetch(`/api/sonar/market-context?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        setData(j);
        setState(j?.subject?.length >= 2 ? 'ready' : 'empty');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState('error');
      });
    return () => ctrl.abort();
  }, [symbol, benchSym]);
  useEffect(() => load(), [load]);

  const ranges = useMemo(() => (data ? availableRanges(data.subject, data.bench) : []), [data]);
  const active =
    range && ranges.includes(range)
      ? range
      : ranges.includes(DEFAULT_RANGE)
        ? DEFAULT_RANGE
        : ranges[ranges.length - 1] || null;
  const cmp = useMemo(
    () => (data && active ? compareSeries(data.subject, data.bench, active) : null),
    [data, active],
  );
  const subjectLabel = symbol;
  const benchLabel = benchSym || 'Benchmark';
  const title = benchSym
    ? `${symbol} vs. ${benchSym}${benchmark?.label ? ` (${benchmark.label})` : ''}`
    : symbol;

  if (state === 'loading') {
    return <div className="smc smc--wait" aria-busy="true" aria-label="Loading market context" />;
  }
  if (state !== 'ready' || !cmp) {
    return (
      <section className="smc smc--empty" aria-labelledby={titleId}>
        <h3 id={titleId} className="smc-title">
          Market context
        </h3>
        <p className="smc-none">Market data is not available for the selected period.</p>
        <button type="button" className="smc-retry" onClick={load}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Retry
        </button>
      </section>
    );
  }

  const provenance = [
    `Daily closes, rebased to 0% at ${dayLabel(cmp.from)}.`,
    `As of ${dayLabel(cmp.to)}.`,
    data.currency ? `${data.currency}.` : null,
    cmp.droppedDays > 0 ? 'Days only one of the two traded are left out.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const tabs = (
    <div className="smc-tabs" role="group" aria-label="Range">
      {MARKET_RANGES.filter((r) => ranges.includes(r.key)).map((r) => (
        <button
          key={r.key}
          type="button"
          className="smc-tab"
          aria-pressed={r.key === active}
          onClick={() => setRange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  return (
    <section className="smc" aria-labelledby={titleId}>
      <div className="smc-head">
        <h3 id={titleId} className="smc-title">
          <span className="smc-eyebrow">Market context</span>
          <span className="smc-name">{title}</span>
        </h3>
        {tabs}
        <button
          type="button"
          className="smc-expand"
          onClick={() => setOpen(true)}
          aria-label="Expand the chart"
          title="Expand"
        >
          <i className="bi bi-arrows-angle-expand" aria-hidden="true" />
        </button>
      </div>
      <div className="smc-body">
        <Chart cmp={cmp} subjectLabel={subjectLabel} benchLabel={benchLabel} />
        <Stats cmp={cmp} subjectLabel={subjectLabel} benchLabel={benchLabel} />
      </div>
      <p className="smc-prov">{provenance}</p>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="1040px">
        <div className="smc smc--modal">
          <div className="smc-head">{tabs}</div>
          <Chart cmp={cmp} subjectLabel={subjectLabel} benchLabel={benchLabel} size="large" />
          <Stats cmp={cmp} subjectLabel={subjectLabel} benchLabel={benchLabel} />
          <p className="smc-prov">{provenance}</p>
        </div>
      </Modal>
    </section>
  );
}
