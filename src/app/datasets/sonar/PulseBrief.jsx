'use client';

/**
 * The brief a belt signal opens (Oct 21). It takes the deck's place on the
 * /datasets overview: PulseStage shows the deck while nothing is open and this
 * panel while a signal is, so the page fills with that signal's findings,
 * stats and chart instead of sending the visitor away.
 *
 * Everything shown is the pulse payload (src/lib/datasets/pulse): item-level
 * findings and stats first, then the dataset's context, the item's own chart
 * when it has one (a region's radiance, a series) or the dataset's chart, and
 * the other signals from the same dataset. Findings only, never advice; the
 * footer names the public source and links to the full dataset page.
 *
 * Charts are drawn here as plain SVG from the spec, in the dimension's hue,
 * with direct value labels (no legend, no gridlines). The bar matching the
 * open signal is emphasised when its label appears in the chart.
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePulse } from './PulseProvider';
import './pulse-brief.css';

function fmt(v, unit) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  const a = Math.abs(n);
  if (unit === 'usd') {
    if (a >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${Math.round(n)}`;
  }
  if (unit === 'pct') return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
  if (unit === 'count')
    return a >= 1e4 ? `${Math.round(n / 1e3)}K` : Math.round(n).toLocaleString('en-US');
  if (unit === 'index') return n.toFixed(2);
  return a >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2);
}

function asOfLabel(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* Probabilities come through as 'pct' but are never negative or signed. */
const unitFor = (chart) =>
  chart.unit === 'pct' && chart.points.every((p) => p.value >= 0) && /probab/i.test(chart.title)
    ? 'prob'
    : chart.unit;

function Bars({ chart, focus }) {
  const unit = unitFor(chart);
  const pts = chart.points.slice(0, 8);
  const max = Math.max(...pts.map((p) => Math.abs(p.value)), 1e-9);
  const hasNeg = pts.some((p) => p.value < 0);
  return (
    <ol className="dpb-bars" aria-label={chart.title}>
      {pts.map((p) => {
        const w = (Math.abs(p.value) / max) * (hasNeg ? 50 : 100);
        const on = focus && String(p.label).toLowerCase() === String(focus).toLowerCase();
        return (
          <li
            key={p.label}
            className={`dpb-bar${on ? ' is-focus' : ''}${p.value < 0 ? ' is-neg' : ''}`}
          >
            <span className="dpb-bar-label">{p.label}</span>
            <span className={`dpb-bar-track${hasNeg ? ' is-diverging' : ''}`} aria-hidden="true">
              <span
                className="dpb-bar-fill"
                style={{
                  width: `${w}%`,
                  ...(hasNeg ? (p.value < 0 ? { right: '50%' } : { left: '50%' }) : { left: 0 }),
                }}
              />
            </span>
            <span className="dpb-bar-value">
              {unit === 'prob' ? `${Math.round(p.value)}%` : fmt(p.value, unit)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const LW = 520;
const LH = 150;
function Line({ chart }) {
  const pts = chart.points.filter((p) => Number.isFinite(Number(p.value)));
  if (pts.length < 2) return null;
  const vals = pts.map((p) => Number(p.value));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i) => (i / (pts.length - 1)) * LW;
  const y = (v) => 10 + (1 - (v - lo) / span) * (LH - 28);
  const d = pts
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(Number(p.value)).toFixed(1)}`)
    .join(' ');
  const last = pts[pts.length - 1];
  return (
    <figure className="dpb-line" aria-label={chart.title}>
      <svg viewBox={`0 0 ${LW} ${LH}`} preserveAspectRatio="none" role="img" aria-hidden="true">
        <path className="dpb-line-area" d={`${d} L${LW} ${LH - 18} L0 ${LH - 18} Z`} />
        <path className="dpb-line-path" d={d} />
      </svg>
      <figcaption className="dpb-line-axis">
        <span>{String(pts[0].label).slice(0, 7)}</span>
        <span className="dpb-line-last">
          {String(last.label).slice(0, 7)} · {fmt(last.value, chart.unit)}
        </span>
      </figcaption>
    </figure>
  );
}

function Chart({ chart, focus }) {
  if (!chart?.points?.length) return null;
  return (
    <section className="dpb-chart">
      <h3 className="dpb-eyebrow">{chart.title}</h3>
      {chart.kind === 'line' ? <Line chart={chart} /> : <Bars chart={chart} focus={focus} />}
    </section>
  );
}

/* The open signal's own label in its dataset chart: the ticker or name that
   starts or ends its headline. Purely presentational. */
function focusLabel(item, chart) {
  if (!chart?.points?.length) return null;
  const h = String(item.headline).toLowerCase();
  const hit = chart.points.find((p) => h.includes(String(p.label).toLowerCase()));
  return hit ? hit.label : null;
}

export default function PulseBrief() {
  const { items, datasets, openKey, open, close } = usePulse();
  const ref = useRef(null);
  const item = items.find((it) => it.key === openKey) || null;
  const ds = item ? datasets[item.datasetId] : null;

  useEffect(() => {
    if (!item || !ref.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ref.current.focus({ preventScroll: true });
    ref.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [item]);

  if (!item) return null;
  const detail = item.detail || {};
  const chart = detail.chart || ds?.chart || null;
  const tiles = (detail.stats?.length ? detail.stats : ds?.stats || []).slice(0, 4);
  const context = detail.stats?.length ? (ds?.stats || []).slice(0, 4) : [];
  const findings = [...(detail.findings || []), ...(ds?.findings || [])].slice(0, 5);
  const related = items
    .filter((it) => it.datasetId === item.datasetId && it.key !== item.key)
    .slice(0, 3);

  return (
    <article
      ref={ref}
      className="dpb-brief"
      style={{ '--dim': `var(--dcr-dim-${item.dimensionId}, var(--dcr-mint))` }}
      tabIndex={-1}
      aria-labelledby="dpb-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <header className="dpb-head">
        <p className="dpb-kicker">
          <i className={`bi ${item.icon}`} aria-hidden="true" />
          <span>{ds?.dimension}</span>
          <span className="dpb-kicker-sep" aria-hidden="true">
            /
          </span>
          <span>{ds?.label}</span>
          {ds?.asOf && asOfLabel(ds.asOf) ? (
            <span className="dpb-asof">Through {asOfLabel(ds.asOf)}</span>
          ) : null}
        </p>
        <button
          type="button"
          className="dpb-close"
          onClick={close}
          aria-label="Close the brief and return to the deck"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </header>

      <h2 id="dpb-title" className="dpb-title">
        {detail.title || item.headline}
      </h2>

      {tiles.length ? (
        <dl className="dpb-tiles">
          {tiles.map((s) => (
            <div key={s.label} className={`dpb-tile${s.tone ? ` is-${s.tone}` : ''}`}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="dpb-body">
        <section className="dpb-findings">
          <h3 className="dpb-eyebrow">Findings</h3>
          <ul>
            {findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {context.length ? (
            <dl className="dpb-context">
              {context.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
        <Chart chart={chart} focus={focusLabel(item, chart)} />
      </div>

      {related.length ? (
        <nav className="dpb-related" aria-label={`More from ${ds?.label}`}>
          <h3 className="dpb-eyebrow">More from {ds?.label}</h3>
          <div className="dpb-related-row">
            {related.map((r) => (
              <button
                key={r.key}
                type="button"
                className="dpb-chip"
                onClick={() => open(r.key, 'brief')}
              >
                <span>{r.headline}</span>
                {r.meta ? <span className="dpb-chip-meta">{r.meta}</span> : null}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <footer className="dpb-foot">
        <p className="dpb-source">Source: {ds?.source}. Findings only, never financial advice.</p>
        {ds?.href ? (
          <Link href={ds.href} className="dpb-open">
            Open {ds.label} <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        ) : null}
      </footer>
    </article>
  );
}

/** Shows the deck, or the open signal's brief in its place. */
export function PulseStage({ children }) {
  const { openKey } = usePulse();
  return (
    <>
      <div className="dpb-stage-deck" hidden={Boolean(openKey)}>
        {children}
      </div>
      {openKey ? <PulseBrief /> : null}
    </>
  );
}
