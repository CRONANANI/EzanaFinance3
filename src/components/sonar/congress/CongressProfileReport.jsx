'use client';

/**
 * CongressProfileReport (Nov 21 2026): the exemplary answer to a quick ping that names one
 * member of Congress ("Nancy Pelosi"), rendered inside the universal Sonar shell
 * (SonarAnswerFrame: contents menu, composer, follow-ups, tools row). Its rows come from the
 * exemplary layout (lib/sonar/exemplary/layouts, 'congress-member-profile'):
 *
 *   row 1  Desk summary (a one-line headline, one short paragraph), full width
 *   row 2  {Member} portfolio (estimated value, 1Y/3Y/5Y/10Y/all time, key figures) | Key
 *          findings (the full brief beyond the summary) | Trading lean, with why it reads so
 *   row 3  Similar portfolios in Congress | News around the member | Open positions
 *
 * Every figure is the dossier's own (lib/sonar/landing-politician): estimates from disclosed
 * STOCK Act ranges at their midpoints, and each card says so. A card with nothing to show
 * drops out of its row. Section anchors (sa-answer, sa-findings, sa-charts) feed the contents
 * menu; Evidence and sources (sa-sources) is in the tools row.
 * Sonar card rule: tinted surfaces, no outlines. Styles: congress-profile-report.css (cpr-).
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { Cited } from '@/components/sonar/SonarDeskSummary';
import { Face } from '@/components/sonar/SonarFace';
import {
  tradingLean,
  leanBullets,
  periodVolume,
  ALL_TIME,
  seriesChange,
  seriesPeriods,
  sliceSeries,
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

/* Nov 21: the headline always sits on one line. It starts at the card-title size and steps
   down to fit the card's width; only if it still cannot fit at the smallest size does it end
   in an ellipsis, with the full text in a tooltip. */
const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const FIT_MAX = 20;
const FIT_MIN = 13;

function FitHeadline({ id, children }) {
  const ref = useRef(null);
  const [size, setSize] = useState(FIT_MAX);
  const [cut, setCut] = useState(false);
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    let px = FIT_MAX;
    el.style.fontSize = `${px}px`;
    while (px > FIT_MIN && el.scrollWidth > el.clientWidth + 1) {
      px -= 0.5;
      el.style.fontSize = `${px}px`;
    }
    setSize(px);
    setCut(el.scrollWidth > el.clientWidth + 1);
  }, []);
  useIsoLayout(() => {
    fit();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, children]);
  return (
    <h3
      id={id}
      ref={ref}
      className="cpr-headline"
      style={{ fontSize: `${size}px` }}
      title={cut ? String(children) : undefined}
    >
      {children}
    </h3>
  );
}

function DeskSummary({ headline, question, paragraphs, actions = null }) {
  const id = useId();
  return (
    <section id="sa-answer" className="cpr-card cpr-desk" aria-labelledby={id}>
      <Eyebrow icon="bi-file-earmark-text" id={`${id}-e`} meta={actions}>
        Desk summary
      </Eyebrow>
      <FitHeadline id={id}>{headline || question}</FitHeadline>
      {paragraphs.map((p, i) => (
        <p key={i} className="cpr-summary">
          <Cited text={p} />
        </p>
      ))}
    </section>
  );
}

/* A half-circle gauge from net selling (left) to net buying (right). */
function LeanGauge({ lean, last, bullets = [] }) {
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
      {bullets.length ? (
        <ul className="cpr-lean-list">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      <p className="cpr-note">
        <i className="bi bi-info-circle" aria-hidden="true" /> Disclosed ranges at their midpoints.
        A description of the filings, not a forecast.
      </p>
    </section>
  );
}

/* Key findings: what the full brief adds beyond the desk summary, as bullets. */
function Findings({ items }) {
  const id = useId();
  if (!items || items.length < 2) return null;
  return (
    <section id="sa-findings" className="cpr-card cpr-take" aria-labelledby={id}>
      <Eyebrow icon="bi-lightning-charge" id={id}>
        Key findings
      </Eyebrow>
      <ul className="cpr-take-list">
        {items.map((t, i) => (
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
function ValueChart({ series, months, label, onHover = null }) {
  const [box, setBox] = useState(null);
  const [hover, setHoverState] = useState(null);
  const setHover = (i) => {
    setHoverState(i);
    onHover?.(i);
  };
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

/* Nov 21: the listed assets with the best REALIZED returns over the selected period: each
   disclosed purchase in the period matched to the member's next disclosed sale of the same
   asset, close to close (the Politician Tracker's "Realized return"). Positions still held
   have no realized return. A ticker opens a new Sonar ping on it. */
function BestReturns({ bioguide, months, periodName, onTicker }) {
  const [state, setState] = useState({ status: 'loading', rows: [] });
  useEffect(() => {
    if (!bioguide) {
      setState({ status: 'empty', rows: [] });
      return undefined;
    }
    let live = true;
    setState({ status: 'loading', rows: [] });
    fetch(
      `/api/sonar/politician-returns?bioguide=${encodeURIComponent(bioguide)}&months=${months || 0}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!live) return;
        const rows = Array.isArray(d?.rows) ? d.rows : [];
        setState({ status: rows.length ? 'ready' : 'empty', rows });
      })
      .catch(() => live && setState({ status: 'error', rows: [] }));
    return () => {
      live = false;
    };
  }, [bioguide, months]);
  return (
    <div className="cpr-best" aria-live="polite">
      <p className="cpr-best-head">Best realized returns, {periodName}</p>
      {state.status === 'loading' ? (
        <ul className="cpr-best-list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="cpr-best-skel" aria-hidden="true" />
          ))}
        </ul>
      ) : state.status === 'ready' ? (
        <ul className="cpr-best-list">
          {state.rows.map((r) => (
            <li key={r.ticker} className="cpr-best-row">
              {onTicker ? (
                <button
                  type="button"
                  className="cpr-best-tk"
                  onClick={() => onTicker(r.ticker)}
                  aria-label={`Ping ${r.ticker} in Sonar`}
                >
                  {r.ticker}
                </button>
              ) : (
                <span className="cpr-best-tk">{r.ticker}</span>
              )}
              <span
                className="cpr-best-since"
                title={`Bought from ${r.since}, last sold ${r.lastSale}`}
              >
                {r.trades} closed trade{r.trades === 1 ? '' : 's'}, {monthLabel(r.since)} to{' '}
                {monthLabel(r.lastSale)}
              </span>
              <span className={`cpr-best-pct${r.pct < 0 ? ' is-down' : ''}`}>
                {r.pct >= 0 ? '+' : '-'}
                {Math.abs(r.pct).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cpr-best-empty">
          {state.status === 'error'
            ? 'Returns could not be loaded right now.'
            : 'No purchases in this period have been sold yet.'}
        </p>
      )}
      <p className="cpr-best-note">
        Realized: each purchase to the next disclosed sale of the same asset, close to close, price
        only. Positions still held, bonds and other assets without a ticker are not included.
      </p>
    </div>
  );
}

function Portfolio({ dossier, onTicker = null }) {
  const id = useId();
  const s = dossier.stats || {};
  const series = Array.isArray(dossier.series) ? dossier.series : [];
  const months = Array.isArray(dossier.seriesMonths) ? dossier.seriesMonths : [];
  const periods = seriesPeriods(series.length);
  const initial = periods.find((p) => p.key === '3Y' && p.available) ? '3Y' : ALL_TIME;
  const [period, setPeriod] = useState(initial);
  const view = sliceSeries(series, months, periods.find((p) => p.key === period) || null);
  const hasChart = view.series.length >= 2;
  /* Nov 21: the header reports the selected period, the way the Politician Tracker's
     "Disclosed volume" column does: the sum of the disclosed range midpoints of every trade
     in the window, with the count and the bought and sold split. The chart below is the
     estimated open value over the same window. */
  const sel = periods.find((p) => p.key === period) || null;
  const vol = periodVolume(
    dossier.volume,
    period === ALL_TIME ? dossier.volume?.total?.length : sel?.months,
  );
  const periodName = period === ALL_TIME ? 'all time' : period;
  const kpis = [
    { k: 'Est. open value', v: typeof s.estValue === 'number' ? usdCompact(s.estValue) : 'N/A' },
    { k: 'Open positions', v: typeof s.openPositions === 'number' ? s.openPositions : 'N/A' },
    { k: 'Top holdings', v: dossier.topHoldings?.length ? dossier.topHoldings.join(' ') : 'N/A' },
    { k: 'Trades, 12M', v: typeof s.trades12m === 'number' ? s.trades12m : 'N/A' },
  ];
  return (
    <section id="sa-charts" className="cpr-card cpr-an" aria-labelledby={id}>
      <div className="cpr-head">
        <h2 id={id} className="cpr-eyebrow">
          <i className="bi bi-bar-chart-line" aria-hidden="true" />
          {dossier.name} portfolio
        </h2>
        {periods.length ? (
          <div className="cpr-periods" role="group" aria-label="Time period">
            {periods.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`cpr-period${p.key === period ? ' is-on' : ''}`}
                aria-pressed={p.key === period}
                disabled={!p.available}
                title={p.available ? undefined : 'Not enough disclosed history for this period'}
                onClick={() => setPeriod(p.key)}
              >
                {p.key === ALL_TIME ? 'All time' : p.key}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
        <div className="cpr-an-value" aria-live="polite">
          <span className="cpr-an-value-k">
            {vol ? `Disclosed volume, ${periodName}` : 'Estimated open value'}
          </span>
          <span className="cpr-an-value-v">
            {vol
              ? usdCompact(vol.total)
              : typeof s.estValue === 'number'
                ? usdCompact(s.estValue)
                : 'N/A'}
          </span>
          {vol ? (
            <span className="cpr-an-value-from">
              {vol.count} trade{vol.count === 1 ? '' : 's'} · {usdCompact(vol.buy)} bought ·{' '}
              {usdCompact(vol.sell)} sold
            </span>
          ) : null}
        </div>
      </div>
      <div className="cpr-an-body">
        {hasChart ? (
          <ValueChart
            key={period}
            series={view.series}
            months={view.months}
            label={`${dossier.name} estimated portfolio value, ${periodName}`}
          />
        ) : (
          <p className="cpr-empty">No disclosed trades to chart yet.</p>
        )}
        <BestReturns
          bioguide={dossier.bioguideId}
          months={period === ALL_TIME ? 0 : sel?.months}
          periodName={periodName}
          onTicker={onTicker}
        />
      </div>
      <dl className="cpr-kpis">
        {kpis.map((x) => (
          <div key={x.k} className="cpr-kpi">
            <dt>{x.k}</dt>
            <dd>{x.v}</dd>
          </div>
        ))}
      </dl>
      <p className="cpr-note">
        Disclosed volume and the estimated value chart use the midpoints of disclosed STOCK Act
        ranges. No market prices applied.
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
            <tr key={h.ticker || h.tag}>
              <td>
                <span
                  className={`cpr-ticker${h.untickered ? ' cpr-ticker--group' : ''}`}
                  title={h.untickered ? 'Positions with no ticker, grouped' : undefined}
                >
                  {h.ticker || h.tag}
                </span>
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
      <p className="cpr-note">
        Share of the estimated open book, by disclosed ranges. Bonds, notes, Treasuries and private
        assets have no ticker, so each kind is one row.
      </p>
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
 * headline, paragraphs  the desk summary's text (the board picks it)
 * findings    Key findings: what the full brief adds beyond the summary (briefFindings())
 * notice      the "showing results for" notice
 * actions     Save (SonarSaveActions), at the top right of the desk summary
 * onTicker    runs a new Sonar ping on a ticker (the Best returns list)
 */
/**
 * The layout's rows as render blocks: consecutive rows of three merge into one block of
 * three columns (column i stacks each row's i-th card); any other row stays a row.
 */
export function groupRows(rows = []) {
  const out = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    if (row.length === 3 && prev?.stacked) {
      row.forEach((k, i) => prev.cols[i].push(k));
    } else if (row.length === 3 && prev && !prev.stacked && prev.row.length === 3) {
      out[out.length - 1] = { stacked: true, cols: prev.row.map((k, i) => [k, row[i]]) };
    } else {
      out.push({ stacked: false, row });
    }
  }
  return out;
}

export function CongressProfileReport({
  live,
  rows = [['desk'], ['portfolio', 'findings', 'lean'], ['similar', 'news', 'positions']],
  headline = null,
  paragraphs = [],
  findings = [],
  notice = null,
  actions = null,
  onTicker = null,
}) {
  const dossier = live?.dossier;
  if (!dossier) return null;
  const lean = tradingLean(dossier);
  /* Every card the exemplary layout may name, or null when it has nothing to show. */
  const cards = {
    desk: (
      <DeskSummary
        headline={headline}
        question={live.query}
        paragraphs={paragraphs}
        actions={actions}
      />
    ),
    portfolio: <Portfolio dossier={dossier} onTicker={onTicker} />,
    findings: findings.length >= 2 ? <Findings items={findings} /> : null,
    lean: lean ? (
      <LeanGauge lean={lean} last={lastNameOf(dossier.name)} bullets={leanBullets(dossier, lean)} />
    ) : null,
    similar:
      Array.isArray(dossier.similar) && dossier.similar.length ? (
        <Similar dossier={dossier} />
      ) : null,
    news: newsRows(live?.newsColumns, 1).length ? (
      <News name={dossier.name} columns={live.newsColumns} />
    ) : null,
    positions:
      Array.isArray(dossier.holdings) && dossier.holdings.length ? (
        <Positions dossier={dossier} />
      ) : null,
  };
  return (
    <div className="cpr" role="region" aria-label={`${live.query}: answer`}>
      {notice ? <div className="cpr-notice">{notice}</div> : null}
      {groupRows(rows).map((block, i) => {
        if (block.stacked) {
          /* Nov 22: two rows of three render as three stacked columns, so a short card
             (Key findings, say) lets the card beneath it (News) rise into the gap. */
          const cols = block.cols
            .map((col) => col.filter((k) => cards[k]))
            .filter((col) => col.length);
          if (!cols.length) return null;
          return (
            <div key={i} className={`cpr-row is-${cols.length} is-triple is-stacked`}>
              {cols.map((col) => (
                <div key={col.join('-')} className="cpr-col">
                  {col.map((k) => (
                    <div key={k} className={`cpr-cell cpr-cell--${k}`}>
                      {cards[k]}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        }
        const row = block.row;
        const present = row.filter((k) => cards[k]);
        if (!present.length) return null;
        return (
          <div
            key={i}
            className={`cpr-row is-${present.length}${row.length === 3 ? ' is-triple' : ''}`}
          >
            {present.map((k) => (
              <div key={k} className={`cpr-cell cpr-cell--${k}`}>
                {cards[k]}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default CongressProfileReport;
