'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CHART_RANGES,
  NA,
  benchmarkInfo,
  buildFundChart,
  fmtDate,
  fmtMoney,
  fmtMoneyCompact,
  fmtSignedPct,
  toneOf,
} from '@/lib/org-command-center';
import { ArrowLink, Empty, Section, SectionError, Skel, TextToggle } from './parts';

const CHART_H = 216;

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

export function FundChart({ snapshots, benchLabel, range }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef, 400);
  const gradId = useId().replace(/:/g, '');

  const chart = useMemo(
    () => buildFundChart(snapshots, range, { width, height: CHART_H }),
    [snapshots, range, width],
  );
  useEffect(() => {
    setHover(null);
  }, [range, snapshots]);

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

  const hp = chart && hover != null ? chart.points[hover] : null;
  const lastPt = chart ? chart.points[chart.points.length - 1] : null;

  return (
    <div className="tcc-chart">
      <div
        className="tcc-chart__plot"
        ref={wrapRef}
        style={{ height: CHART_H }}
        role="img"
        tabIndex={chart ? 0 : -1}
        aria-label={
          chart
            ? `Fund value from ${fmtDate(chart.firstDate)} to ${fmtDate(chart.lastDate)}. Latest ${fmtMoney(lastPt.value)}. Use the left and right arrow keys to read a date.`
            : 'Fund value chart'
        }
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => pick(e.touches[0]?.clientX)}
        onTouchMove={(e) => pick(e.touches[0]?.clientX)}
        onTouchEnd={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {chart ? (
          <>
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
                    className="tcc-chart__grid"
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
                  <circle cx={hp.x} cy={hp.y} r="4" className="tcc-chart__dot" />
                </>
              )}
            </svg>
            {hp && (
              <div
                className="tcc-chart__tip"
                style={{
                  left: Math.min(chart.W - 96, Math.max(chart.left + 96, hp.x)),
                }}
                aria-live="polite"
              >
                <span className="tcc-mono tcc-chart__tipval">{fmtMoney(hp.value)}</span>
                {hp.benchmarkValue != null && (
                  <span className="tcc-chart__tipsub">
                    {benchLabel} <span className="tcc-mono">{fmtMoney(hp.benchmarkValue)}</span>
                  </span>
                )}
                <span className="tcc-mono tcc-chart__tipsub">{fmtDate(hp.date)}</span>
              </div>
            )}
          </>
        ) : (
          <Empty href="/org-team-hub/fund-analytics" action="Open fund analytics">
            No fund snapshots yet. The chart fills in as daily snapshots are recorded.
          </Empty>
        )}
      </div>
      {chart && (
        <ul className="tcc-legend">
          <li>
            <span className="tcc-legend__swatch" aria-hidden="true" />
            Fund value <span className="tcc-mono">{fmtMoneyCompact(lastPt.value)}</span>
          </li>
          {chart.hasBench && (
            <li>
              <span className="tcc-legend__swatch tcc-legend__swatch--dotted" aria-hidden="true" />
              {benchLabel}{' '}
              <span className="tcc-mono">{fmtMoneyCompact(lastPt.benchmarkValue)}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Fund performance: the value chart beside the headline read-out. */
export function FundPerformance({ summary, onRetry }) {
  const [range, setRange] = useState('YTD');
  const loading = summary.status === 'loading';
  const failed = summary.status === 'error';
  const perf = summary.data?.performance || null;
  const bench = benchmarkInfo(perf);
  const benchLabel = bench.estimated
    ? 'Same cost at the pitch benchmark (est.)'
    : bench.label === NA
      ? 'Same cost in the benchmark'
      : `Same cost in ${bench.label}`;

  return (
    <Section
      id="tcc-perf"
      title="Fund performance"
      className="tcc-perf"
      aside={
        <div className="tcc-toggles" role="group" aria-label="Chart period">
          {CHART_RANGES.map((r) => (
            <TextToggle key={r} mono pressed={range === r} onClick={() => setRange(r)}>
              {r}
            </TextToggle>
          ))}
        </div>
      }
    >
      {failed ? (
        <SectionError message="Could not load fund performance." onRetry={onRetry} />
      ) : (
        <div className="tcc-perf__body" aria-busy={loading || undefined}>
          {loading ? (
            <div className="tcc-chart">
              <Skel h={CHART_H} />
            </div>
          ) : (
            <FundChart
              snapshots={summary.data?.snapshots || []}
              benchLabel={benchLabel}
              range={range}
            />
          )}
          <span className="tcc-vrule" aria-hidden="true" />
          <div className="tcc-readout">
            <dl>
              <div>
                <dt>Fund value</dt>
                <dd className="tcc-mono" title={loading ? undefined : fmtMoney(perf?.total_value)}>
                  {loading ? <Skel w={96} h={18} /> : fmtMoneyCompact(perf?.total_value)}
                </dd>
              </div>
              <div>
                <dt>Return on cost</dt>
                <dd className={`tcc-mono tcc-${toneOf(perf?.return_pct)}`}>
                  {loading ? <Skel w={80} h={18} /> : fmtSignedPct(perf?.return_pct)}
                </dd>
              </div>
              <div>
                <dt>Alpha</dt>
                <dd className={`tcc-mono tcc-${toneOf(perf?.alpha_pct)}`}>
                  {loading ? <Skel w={80} h={18} /> : fmtSignedPct(perf?.alpha_pct)}
                </dd>
              </div>
              <div>
                <dt>Benchmark</dt>
                <dd className={bench.estimated ? 'tcc-readout__words' : 'tcc-mono'}>
                  {loading ? <Skel w={64} h={18} /> : bench.label}
                </dd>
                {!loading && <p className="tcc-readout__note">{bench.sourceText}</p>}
              </div>
            </dl>
            <ArrowLink href="/org-trading" className="tcc-readout__link">
              Open trading desk
            </ArrowLink>
          </div>
        </div>
      )}
    </Section>
  );
}
