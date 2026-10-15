'use client';

/**
 * Sanctions Activity Timeline: new OFAC listings per month (per year for all
 * time), by OFAC's own publication date (sanctions_listing_dates), never by
 * our load date. Follows the page's shared country / program / type filter.
 *
 *   Range      6, 12, 24 months or all time
 *   Breakdown  Total; By type (stacked: a record has exactly one type);
 *              By program or By country (a ranked list for the selected
 *              period, because those keys overlap and cannot be stacked)
 * Selecting a bar picks that month; "Show in listings" applies it as the
 * listings' date range. With no listing dates loaded the card says so and
 * draws nothing: history is never estimated or interpolated.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { monthRange, timelineSummary, toYears } from '@/lib/sanctions/insights';
import { programMeta } from '@/lib/sanctions/programs';
import { Seg, StateNote, TYPES, fmt, monthLabel, shortDate } from './ui';

const RANGES = [
  { key: 6, label: '6M' },
  { key: 12, label: '12M' },
  { key: 24, label: '24M' },
  { key: 0, label: 'All' },
];
const DIMS = [
  { key: 'total', label: 'Total' },
  { key: 'type', label: 'By type' },
  { key: 'program', label: 'By program' },
  { key: 'country', label: 'By country' },
];

/* A round axis maximum: 1, 2 or 5 times a power of ten at or above max. */
function niceMax(max) {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 5, 10]) if (m * p >= max) return m * p;
  return 10 * p;
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function qs(o) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== '' && v != null) sp.set(k, String(v));
  return sp.toString();
}

export default function ActivityTimeline({ initial, filter, onApplyRange, baselineLabel }) {
  const [months, setMonths] = useState(24);
  const [dim, setDim] = useState('total');
  const [data, setData] = useState(initial);
  const [stack, setStack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [parts, setParts] = useState(null);
  const firstRun = useRef(true);

  const scope = { country: filter.country, program: filter.program, type: filter.type };
  const scopeKey = `${scope.country}|${scope.program}|${scope.type}`;

  /* The series: refetch on range or filter change (the first render uses the
     server's 24-month, unfiltered series). */
  useEffect(() => {
    if (firstRun.current && months === 24 && !scope.country && !scope.program && !scope.type) {
      firstRun.current = false;
      return undefined;
    }
    firstRun.current = false;
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    getJson(`/api/datasets/sanctions/activity?${qs({ months, ...scope })}`, ctrl.signal)
      .then((d) => setData(d))
      .catch((e) => {
        if (e?.name !== 'AbortError') setFailed(true);
      })
      .finally(() => setLoading(false));
    setSel(null);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, scopeKey]);

  /* By type: one series per type (types are exclusive, so they stack). */
  useEffect(() => {
    if (dim !== 'type' || scope.type) {
      setStack(null);
      return undefined;
    }
    const ctrl = new AbortController();
    Promise.all(
      TYPES.map((t) =>
        getJson(
          `/api/datasets/sanctions/activity?${qs({ months, ...scope, type: t.key })}`,
          ctrl.signal,
        ),
      ),
    )
      .then((all) => setStack(Object.fromEntries(TYPES.map((t, i) => [t.key, all[i].rows || []]))))
      .catch(() => setStack(null));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim, months, scopeKey]);

  const allTime = months === 0;
  const bars = useMemo(() => {
    const rows = data?.rows || [];
    if (!allTime)
      return rows.map((r) => ({
        key: r.month,
        label: monthLabel(r.month),
        long: monthLabel(r.month, true),
        n: r.listings,
      }));
    return toYears(rows).map((y) => ({ key: y.year, label: y.year, long: y.year, n: y.listings }));
  }, [data, allTime]);

  const stackBy = useMemo(() => {
    if (!stack) return null;
    const out = {};
    for (const t of TYPES) {
      const rows = allTime
        ? toYears(stack[t.key]).map((y) => ({ key: y.year, n: y.listings }))
        : stack[t.key].map((r) => ({ key: r.month, n: r.listings }));
      out[t.key] = Object.fromEntries(rows.map((r) => [r.key, r.n]));
    }
    return out;
  }, [stack, allTime]);

  const summary = useMemo(() => timelineSummary((data?.rows || []).map((r) => r)), [data]);
  const max = niceMax(Math.max(0, ...bars.map((b) => b.n)));

  /* The period the breakdown list and "Show in listings" refer to. */
  const period = useMemo(() => {
    if (!bars.length) return null;
    if (sel) {
      if (allTime) return { from: `${sel}-01-01`, to: `${sel}-12-31`, label: sel };
      const r = monthRange(sel);
      return r ? { ...r, label: monthLabel(sel, true) } : null;
    }
    const first = data.rows[0]?.month;
    const last = data.rows[data.rows.length - 1]?.month;
    const end = monthRange(last);
    return first && end
      ? { from: first, to: end.to, label: allTime ? 'all time' : `the last ${months} months` }
      : null;
  }, [sel, bars, data, allTime, months]);

  /* By program / country: what the period's listings were made of. */
  useEffect(() => {
    if ((dim !== 'program' && dim !== 'country') || !period || !data?.ready) {
      setParts(null);
      return undefined;
    }
    const ctrl = new AbortController();
    getJson(
      `/api/datasets/sanctions/activity?${qs({ months, ...scope, dim, from: period.from, to: period.to })}`,
      ctrl.signal,
    )
      .then((d) => setParts(d.breakdown || []))
      .catch(() => setParts(null));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim, period?.from, period?.to, scopeKey, data?.ready]);

  const readout = hover || (sel ? bars.find((b) => b.key === sel) : null);
  const labelEvery = Math.max(1, Math.ceil(bars.length / 12));
  const scopeText = [
    scope.country,
    scope.program,
    scope.type && TYPES.find((t) => t.key === scope.type)?.label,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="snx-card snx-tl" aria-labelledby="snx-tl-title">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-tl-title" className="snx-card-title">
            Sanctions activity timeline
          </h2>
          <p className="snx-card-sub">
            New OFAC listings {allTime ? 'per year' : 'per month'}, dated by OFAC&apos;s own
            publication date.
            {scopeText ? ` Filtered to ${scopeText}.` : ''}
          </p>
        </div>
        <div className="snx-tl-controls">
          <Seg label="Range" value={months} onChange={(v) => setMonths(v)} options={RANGES} />
          <Seg label="Breakdown" value={dim} onChange={setDim} options={DIMS} />
        </div>
      </div>

      {!data?.ready ? (
        <StateNote kind={failed ? 'error' : 'unavailable'}>
          {failed
            ? 'The timeline could not be loaded. Try again shortly.'
            : 'OFAC listing dates are not loaded yet. The timeline appears after the first import of OFAC publication dates; it is never estimated.'}
        </StateNote>
      ) : (
        <>
          <dl className="snx-tl-stats">
            <div>
              <dt>Listed in period</dt>
              <dd className="snx-mono">{fmt(summary.total)}</dd>
            </div>
            <div>
              <dt>Busiest month</dt>
              <dd className="snx-mono">
                {summary.peak
                  ? `${monthLabel(summary.peak.month, true)} · ${fmt(summary.peak.listings)}`
                  : 'none'}
              </dd>
            </div>
            <div>
              <dt>Monthly average</dt>
              <dd className="snx-mono">{summary.avg ?? 'n/a'}</dd>
            </div>
          </dl>

          <div className={`snx-tl-chart${loading ? ' is-loading' : ''}`} aria-busy={loading}>
            <div className="snx-tl-axis" aria-hidden="true">
              <span>{fmt(max)}</span>
              <span>{fmt(max / 2)}</span>
              <span>0</span>
            </div>
            <div
              className="snx-tl-bars"
              role="group"
              aria-label={allTime ? 'New listings per year' : 'New listings per month'}
              onMouseLeave={() => setHover(null)}
            >
              {bars.map((b, i) => {
                const h = (b.n / max) * 100;
                const parts2 = stackBy
                  ? TYPES.map((t) => ({ t, n: stackBy[t.key]?.[b.key] || 0 })).filter((p) => p.n)
                  : null;
                return (
                  <button
                    key={b.key}
                    type="button"
                    className={`snx-tl-bar${sel === b.key ? ' is-on' : ''}`}
                    aria-pressed={sel === b.key}
                    aria-label={`${b.long}: ${fmt(b.n)} new listings`}
                    onMouseEnter={() => setHover(b)}
                    onFocus={() => setHover(b)}
                    onBlur={() => setHover(null)}
                    onClick={() => setSel(sel === b.key ? null : b.key)}
                  >
                    <span className="snx-tl-col" style={{ height: `${h}%` }}>
                      {parts2
                        ? parts2.map((p) => (
                            <span
                              key={p.t.key}
                              className="snx-tl-seg"
                              style={{ flexGrow: p.n, background: p.t.color }}
                            />
                          ))
                        : null}
                    </span>
                    <span className="snx-tl-x" aria-hidden="true">
                      {i % labelEvery === 0 || i === bars.length - 1 ? b.label : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="snx-tl-readout" aria-live="polite">
            {readout ? (
              <>
                <b>{readout.long}</b> · {fmt(readout.n)} new listings
                {stackBy
                  ? ` (${TYPES.map((t) => `${t.label} ${fmt(stackBy[t.key]?.[readout.key] || 0)}`).join(', ')})`
                  : ''}
              </>
            ) : (
              'Hover or select a bar for its count. Select one to break down that period.'
            )}
          </p>

          {dim === 'type' && stackBy ? (
            <span className="snx-strip-legend snx-tl-legend">
              {TYPES.map((t) => (
                <span key={t.key}>
                  <i style={{ background: t.color }} aria-hidden="true" />
                  {t.label}
                </span>
              ))}
            </span>
          ) : null}

          {(dim === 'program' || dim === 'country') && period ? (
            <div className="snx-tl-parts">
              <p className="snx-tl-parts-head">
                Top {dim === 'program' ? 'programs' : 'address countries'} in {period.label}
              </p>
              {parts === null ? (
                <p className="snx-rail-note">Loading…</p>
              ) : parts.length === 0 ? (
                <p className="snx-rail-note">No listings in this period.</p>
              ) : (
                <ol className="snx-tl-parts-list">
                  {parts.map((p) => (
                    <li key={p.key}>
                      <span
                        className="snx-tl-parts-name"
                        title={dim === 'program' ? programMeta(p.key).label : p.key}
                      >
                        {p.key === '(none)'
                          ? dim === 'program'
                            ? 'No program'
                            : 'No country stated'
                          : p.key}
                      </span>
                      <span
                        className="snx-tl-parts-bar"
                        style={{ width: `${(p.listings / parts[0].listings) * 100}%` }}
                        aria-hidden="true"
                      />
                      <span className="snx-mono">{fmt(p.listings)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="snx-fine">
                A listing can fall under several {dim === 'program' ? 'programs' : 'countries'}, so
                these counts overlap and do not add up to the period total.
              </p>
            </div>
          ) : null}

          {period ? (
            <div className="snx-tl-actions">
              <button
                type="button"
                className="snx-action-btn"
                onClick={() => onApplyRange(period.from, period.to)}
              >
                Show {sel ? period.label : 'this period'} in the listings
                <i className="bi bi-arrow-down" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <p className="snx-fine">
            Counts listing records by OFAC&apos;s publication date
            {data.rows.length ? `, ${shortDate(data.rows[0].month)} onward` : ''}. It includes
            records removed since tracking began ({baselineLabel || 'the first load'}); records OFAC
            removed before then are not in OFAC&apos;s current files, so earlier periods undercount
            them. The current {allTime ? 'year' : 'month'} is to date. Listing counts measure
            designation activity, not the severity or effect of sanctions.
          </p>
        </>
      )}
    </section>
  );
}
