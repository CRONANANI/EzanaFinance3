'use client';

/**
 * Run diagnostics on the Quant Lab overview (Nov 19, 2026). Two views of the
 * selected strategy's latest stored run, computed only from that run:
 *
 *   Drawdown strata (EzContourStrata): the cumulative return is the core
 *   ribbon; strata stack up to the running high-water mark, so the band's
 *   thickness at each station is the drawdown from peak. Stations are evenly
 *   spaced dates, plus the deepest trough and the peak before it.
 *
 *   Trade scatter (EzScatterBrush): one point per closed trade, holding days
 *   against return. Brush a region to read the count, means, correlation and
 *   the least-squares trend of just those trades.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { EzContourStrata } from '@/components/charts/EzContourStrata';
import { EzScatterBrush } from '@/components/charts/EzScatterBrush';

const BASE = '/for-the-quants';
const STATIONS = 18;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const pct = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateLabel(iso, spanDays) {
  const [y, m, d] = String(iso || '')
    .split('-')
    .map(Number);
  if (!y || !m) return String(iso || '');
  return spanDays > 200 ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : `${MONTHS[m - 1]} ${d}`;
}

function buildStrata(curve) {
  const pts = (curve || []).filter((p) => isNum(p.equity) && p.equity > 0);
  if (pts.length < 6) return null;
  const e0 = pts[0].equity;
  const cum = pts.map((p) => (p.equity / e0 - 1) * 100);
  const peak = [];
  let hi = -Infinity;
  let peakAt = 0;
  const peakIdx = [];
  cum.forEach((v, i) => {
    if (v > hi) {
      hi = v;
      peakAt = i;
    }
    peak.push(hi);
    peakIdx.push(peakAt);
  });
  let trough = 0;
  cum.forEach((v, i) => {
    if (peak[i] - v > peak[trough] - cum[trough]) trough = i;
  });
  const last = pts.length - 1;
  const set = new Set([0, last, trough, peakIdx[trough]]);
  for (let k = 0; k < STATIONS; k += 1) set.add(Math.round((k / (STATIONS - 1)) * last));
  const idx = [...set].sort((a, b) => a - b);
  const spanDays = (Date.parse(pts[last].date) - Date.parse(pts[0].date)) / 86400000 || 0;
  const stations = idx.map((i) => ({
    id: pts[i].date,
    label: dateLabel(pts[i].date, spanDays),
    date: pts[i].date,
    base: cum[i],
    top: peak[i],
  }));
  const at = (i) => idx.indexOf(i);
  const maxDd = peak[trough] - cum[trough];
  let topIdx = 0;
  stations.forEach((s, i) => {
    if (
      s.top > stations[topIdx].top ||
      (s.top === stations[topIdx].top && s.base >= stations[topIdx].base)
    )
      topIdx = i;
  });
  /* The peak station is where the high-water mark was set (base meets top). */
  const hwm = stations.findIndex(
    (s) => Math.abs(s.top - s.base) < 1e-9 && s.top === stations[topIdx].top,
  );

  const notes = [];
  if (maxDd > 0.05) {
    notes.push({
      index: at(trough),
      title: 'Deepest drawdown',
      value: `−${maxDd.toFixed(1)}%`,
      badge: 'from peak',
      tone: 'neg',
      sub: `${pts[trough].date}, ${pct(cum[trough])} cumulative, after the ${pts[peakIdx[trough]].date} high`,
    });
  }
  if (hwm >= 0) {
    notes.push({
      index: hwm,
      title: 'High-water mark',
      value: pct(stations[hwm].top),
      badge: 'peak',
      tone: 'pos',
      sub: `${stations[hwm].date}, the highest cumulative return in the run`,
    });
  }
  const lastSt = stations[stations.length - 1];
  const gap = lastSt.top - lastSt.base;
  notes.push({
    index: stations.length - 1,
    title: 'Latest',
    value: pct(lastSt.base),
    badge: gap > 0.05 ? `−${gap.toFixed(1)}%` : 'at peak',
    tone: gap > 0.05 ? 'neu' : 'pos',
    sub: `${lastSt.date}, ${gap > 0.05 ? `${gap.toFixed(1)} points below its peak` : 'at its high-water mark'}`,
  });
  /* Keep callouts apart: drop one that sits within two stations of another. */
  const kept = [];
  notes.forEach((n) => {
    if (n.index >= 0 && kept.every((k) => Math.abs(k.index - n.index) > 2)) kept.push(n);
  });
  return { stations, notes: kept, maxDd, from: pts[0].date, to: pts[last].date };
}

export function RunDiagnostics({ strategy, run, state }) {
  const strata = useMemo(() => buildStrata(run?.results?.curve), [run]);
  const trades = useMemo(
    () =>
      (run?.results?.trades || [])
        .filter((t) => !t.open && isNum(t.holdDays) && isNum(t.pnlPct))
        .map((t, i) => ({
          id: `${t.ticker}-${t.entryDate}-${i}`,
          x: t.holdDays,
          y: t.pnlPct * 100,
          label: `${t.ticker || 'Trade'} · ${t.entryDate || ''} to ${t.exitDate || ''}`,
        })),
    [run],
  );

  if (!strategy || state !== 'ready' || !run) return null;

  return (
    <div className="qlx-band">
      <section className="qlx-col" style={{ flex: '1 1 100%' }} aria-labelledby="qlo-strata-h">
        <div className="qlx-head">
          <div className="qlx-row">
            <h2 id="qlo-strata-h" className="qlx-title">
              Drawdown strata
            </h2>
            {strata ? (
              <span className="qlx-sub qlx-num">
                {strategy.name} · {strata.from} to {strata.to}
              </span>
            ) : null}
          </div>
          <Link className="qlx-link" href={`${BASE}/risk-portfolio`}>
            Risk &amp; Portfolio
          </Link>
        </div>
        {strata ? (
          <>
            <p className="qlx-note" style={{ marginBottom: '0.75rem' }}>
              The ribbon is the run&apos;s cumulative return. Each band above it climbs to the
              high-water mark, so the thicker the strata, the deeper the drawdown from peak. Hover a
              station for the numbers; click to pin.
            </p>
            <EzContourStrata
              stations={strata.stations}
              format={(v) => pct(v)}
              baseLabel="Cumulative return"
              topLabel="High-water mark"
              gapLabel="Drawdown"
              annotations={strata.notes}
              height={400}
              ariaLabel={`Drawdown strata for ${strategy.name}: deepest drawdown ${strata.maxDd.toFixed(1)}% from peak`}
            />
          </>
        ) : (
          <p className="qlx-empty">This run has too few points to draw its drawdown strata.</p>
        )}
      </section>

      <section className="qlx-col" style={{ flex: '1 1 100%' }} aria-labelledby="qlo-scatter-h">
        <div className="qlx-head">
          <div className="qlx-row">
            <h2 id="qlo-scatter-h" className="qlx-title">
              Trade scatter
            </h2>
            <span className="qlx-sub qlx-num">
              {trades.length} closed {trades.length === 1 ? 'trade' : 'trades'}
            </span>
          </div>
          <Link
            className="qlx-link"
            href={`${BASE}/backtesting?strategy=${strategy.id}&run=${run.id}`}
          >
            All trades
          </Link>
        </div>
        {trades.length >= 5 ? (
          <>
            <p className="qlx-note" style={{ marginBottom: '0.75rem' }}>
              One point per closed trade. Drag to brush a region: the readout and trend line
              recompute for just those trades, and the edge histograms show where they sit.
            </p>
            <EzScatterBrush
              points={trades}
              xLabel="Holding days"
              yLabel="Return"
              formatX={(v) => `${Math.round(v)}d`}
              formatY={(v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`}
              trend
              height={420}
              ariaLabel={`Trade scatter for ${strategy.name}`}
            />
          </>
        ) : (
          <p className="qlx-empty">
            The scatter needs at least five closed trades; this run has {trades.length}.
          </p>
        )}
      </section>
    </div>
  );
}

export default RunDiagnostics;
