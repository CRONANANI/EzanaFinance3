'use client';

/**
 * SonarFinancialActivityMatrix (Nov 28 2026), adapted from the 21st.dev "LED matrix sales"
 * for financial activity counts per period: congressional disclosures by month, procurement
 * actions, lobbying filings, 13F reporting activity, signal frequency. The source's warm
 * gradients and commerce styling are gone: dark ground, emerald dots, restrained motion.
 *
 * Each column is one period; each dot stands for a fixed number of records (shown in the
 * key), stacked per series (purchases emerald, sales red, others grey, each with its own
 * label so colour never stands alone). A period with no observation is hatched and labelled
 * "No record", never drawn as zero; a confirmed zero shows 0. Arrow keys step through the
 * periods; the readout names the period and its counts.
 *
 * payload.data: { columns: [{ period, <seriesKey>: number|null }], series: [{ key, label,
 *                 tone: 'pos'|'neg'|'neu' }], zeroConfirmed? }
 */
import { useMemo, useRef, useState } from 'react';
import { num } from '@/lib/sonar/presentation/contracts';
import './sonar-research-library.css';

const MAX_DOTS = 16;
const TONE = { pos: '', neg: ' is-neg', neu: ' is-neu' };

export function SonarFinancialActivityMatrix({ payload }) {
  const p = payload || {};
  const d = p.data || {};
  const series = useMemo(
    () =>
      d.series?.length ? d.series : [{ key: 'value', label: p.metric || 'Records', tone: 'pos' }],
    [d.series, p.metric],
  );
  const cols = useMemo(() => d.columns || [], [d.columns]);
  const [active, setActive] = useState(null);
  const refs = useRef([]);

  const { perDot } = useMemo(() => {
    const peak = Math.max(
      0,
      ...cols.map((c) => series.reduce((a, s) => a + (num(c[s.key]) || 0), 0)),
    );
    return { perDot: Math.max(1, Math.ceil(peak / MAX_DOTS)) };
  }, [cols, series]);

  const info = (c) => {
    const vals = series.map((s) => ({ s, v: num(c[s.key]) }));
    const missing = vals.every((x) => x.v === null);
    const zero = !missing && vals.every((x) => x.v === 0) && d.zeroConfirmed !== false;
    return { vals, missing, zero };
  };

  const label = (c) => {
    const { vals, missing } = info(c);
    if (missing) return `${c.period}: no record`;
    return `${c.period}: ${vals.map((x) => `${x.s.label} ${x.v === null ? 'N/A' : x.v.toLocaleString('en-US')}`).join(', ')}`;
  };

  const onKey = (e, i) => {
    const next =
      e.key === 'ArrowRight'
        ? i + 1
        : e.key === 'ArrowLeft'
          ? i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? cols.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(cols.length - 1, next));
    setActive(j);
    refs.current[j]?.focus();
  };

  return (
    <div>
      <div className="srl-keys">
        {series.map((s) => (
          <span key={s.key} className="srl-key">
            <span className={`srl-dot${TONE[s.tone] || ''}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
        <span className="srl-key">
          One dot = {perDot.toLocaleString('en-US')} {p.unit || 'records'}
        </span>
        <span className="srl-key">
          <span
            className="srl-col is-missing"
            style={{ height: 10, minWidth: 14 }}
            aria-hidden="true"
          />
          No record
        </span>
      </div>
      <div className="srl-matrix" role="group" aria-label={p.title || 'Activity by period'}>
        {cols.map((c, i) => {
          const { vals, missing, zero } = info(c);
          return (
            <button
              key={`${c.period}-${i}`}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className={`srl-col${missing ? ' is-missing' : ''}${zero ? ' is-zero' : ''}${active === i ? ' is-active' : ''}`}
              aria-label={label(c)}
              tabIndex={active === null ? (i === cols.length - 1 ? 0 : -1) : active === i ? 0 : -1}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {vals.flatMap((x) =>
                x.v
                  ? Array.from({ length: Math.ceil(x.v / perDot) }, (_, k) => (
                      <span key={`${x.s.key}-${k}`} className={`srl-dot${TONE[x.s.tone] || ''}`} />
                    ))
                  : [],
              )}
            </button>
          );
        })}
      </div>
      <div className="srl-axis" aria-hidden="true">
        <span>{cols[0]?.period}</span>
        <span>{cols[cols.length - 1]?.period}</span>
      </div>
      <p className="srl-readout" aria-live="polite">
        {active !== null && cols[active]
          ? label(cols[active])
          : 'Hover or use the arrow keys to read a period.'}
      </p>
    </div>
  );
}

export default SonarFinancialActivityMatrix;
