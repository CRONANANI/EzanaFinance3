'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { NA, fmtDate, fmtMoney, fmtSignedPct } from '@/lib/org-command-center';
import { buildReturnChart } from '@/lib/org-fund-analytics-model';
import { Empty, Section, SectionError, Skel } from '@/components/org/command-center/parts';

const CHART_H = 264;

function useWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/**
 * Fund return against benchmark return, in percent, by day. The Command
 * Center's chart draws fund value in dollars, so this page has its own, built
 * on the same chart styles so the two read as one.
 */
function ReturnChart({ series, benchLabel }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef, 600);
  const gradId = useId().replace(/:/g, '');

  const chart = useMemo(
    () => buildReturnChart(series, { width, height: CHART_H }),
    [series, width],
  );
  useEffect(() => {
    setHover(null);
  }, [series]);

  const pick = useCallback(
    (clientX) => {
      const el = wrapRef.current;
      if (!el || !chart || clientX == null) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left - chart.left;
      const f = Math.min(1, Math.max(0, x / chart.plotW));
      setHover(Math.round(f * (chart.points.length - 1)));
    },
    [chart],
  );
  const onKey = (e) => {
    if (!chart) return;
    const last = chart.points.length - 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setHover((h) => {
        const at = h == null ? last : h;
        return Math.min(last, Math.max(0, at + (e.key === 'ArrowRight' ? 1 : -1)));
      });
    } else if (e.key === 'Escape') {
      setHover(null);
    }
  };

  if (!chart) {
    return (
      <Empty href="/org-trading" action="Open trading desk">
        Not enough history yet. The chart needs two daily fund records, and one is recorded each
        weekday evening.
      </Empty>
    );
  }

  const hp = hover != null ? chart.points[hover] : null;
  const lastPt = chart.points[chart.points.length - 1];

  return (
    <div className="tcc-chart ofa-chart">
      <div
        className="tcc-chart__plot"
        ref={wrapRef}
        style={{ height: CHART_H }}
        role="img"
        tabIndex={0}
        aria-label={`Fund return against ${benchLabel} return from ${fmtDate(chart.firstDate)} to ${fmtDate(chart.lastDate)}. Latest fund return ${fmtSignedPct(lastPt.fundReturn)}, ${benchLabel} ${fmtSignedPct(lastPt.benchReturn)}. Use the left and right arrow keys to read a date.`}
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => pick(e.touches[0]?.clientX)}
        onTouchMove={(e) => pick(e.touches[0]?.clientX)}
        onTouchEnd={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width={chart.W} height={chart.H} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart.yTicks.map((t) => (
            <g key={t.label}>
              <line
                x1={chart.left}
                x2={chart.W - chart.right}
                y1={t.y}
                y2={t.y}
                className={t.zero ? 'ofa-chart__zero' : 'tcc-chart__grid'}
              />
              <text x={chart.left - 8} y={t.y + 4} textAnchor="end" className="tcc-chart__tick">
                {t.label}
              </text>
            </g>
          ))}
          {chart.xTicks.map((t, i) => (
            <text
              key={`${t.label}-${i}`}
              x={t.x}
              y={chart.H - 4}
              textAnchor={t.anchor}
              className="tcc-chart__tick"
            >
              {t.label}
            </text>
          ))}
          <path d={chart.area} fill={`url(#${gradId})`} />
          {chart.benchLine && <path d={chart.benchLine} className="tcc-chart__bench" />}
          <path d={chart.line} className="tcc-chart__line" />
          {hp && (
            <>
              <line
                x1={hp.x}
                x2={hp.x}
                y1={chart.top}
                y2={chart.baseY}
                className="tcc-chart__cross"
              />
              {hp.benchY != null && (
                <circle cx={hp.x} cy={hp.benchY} r="3" className="ofa-chart__benchdot" />
              )}
              <circle cx={hp.x} cy={hp.y} r="4" className="tcc-chart__dot" />
            </>
          )}
        </svg>
        {hp && (
          <div
            className="tcc-chart__tip"
            style={{
              left: Math.min(chart.W - 104, Math.max(chart.left + 104, hp.x)),
            }}
            aria-live="polite"
          >
            <span className="tcc-mono tcc-chart__tipsub">{fmtDate(hp.date)}</span>
            <span className="tcc-chart__tipsub">
              Fund return{' '}
              <span className="tcc-mono tcc-chart__tipval">{fmtSignedPct(hp.fundReturn)}</span>
            </span>
            <span className="tcc-chart__tipsub">
              {benchLabel} <span className="tcc-mono">{fmtSignedPct(hp.benchReturn)}</span>
            </span>
            <span className="tcc-chart__tipsub">
              Fund value <span className="tcc-mono">{fmtMoney(hp.fundValue)}</span>
            </span>
          </div>
        )}
      </div>
      <ul className="tcc-legend ofa-legend">
        <li>
          <span className="tcc-legend__swatch" aria-hidden="true" />
          Fund return <span className="tcc-mono">{fmtSignedPct(lastPt.fundReturn)}</span>
        </li>
        {chart.hasBench && (
          <li>
            <span className="tcc-legend__swatch tcc-legend__swatch--dotted" aria-hidden="true" />
            {benchLabel} <span className="tcc-mono">{fmtSignedPct(lastPt.benchReturn)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Performance: the one chart on the page. The headline figures sit in the
 * KPI strip above and are not repeated here.
 */
export function Performance({ fund, bench, headline, rangeText, onRetry }) {
  const loading = fund.status === 'loading';
  const benchLabel = bench.label === NA ? 'Benchmark' : bench.label;
  return (
    <Section
      id="ofa-perf"
      title="Performance"
      className="ofa-perf"
      aside={
        !loading && fund.status === 'ready' && rangeText ? (
          <span className="ofa-scope tcc-mono">{rangeText}</span>
        ) : null
      }
    >
      {fund.status === 'error' ? (
        <SectionError message="Could not load fund performance." onRetry={onRetry} />
      ) : loading ? (
        <div className="tcc-chart" aria-busy="true">
          <Skel h={CHART_H} />
        </div>
      ) : (
        <div
          className={fund.refreshing ? 'ofa-refreshing' : undefined}
          aria-busy={fund.refreshing || undefined}
        >
          <ReturnChart series={fund.data?.series || []} benchLabel={benchLabel} />
          <p className="ofa-foot">
            {headline.rebased
              ? 'Both lines start at zero on the first day of the period.'
              : 'Fund return is the gain on cost of the holdings. It is not time-weighted and leaves out cash, dividends and anything already sold.'}{' '}
            One record is added each weekday evening.
            {bench.estimated
              ? ' The benchmark line is an estimate from past pitch results, not index prices.'
              : ''}
          </p>
        </div>
      )}
    </Section>
  );
}
