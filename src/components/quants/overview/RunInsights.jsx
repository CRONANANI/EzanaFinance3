'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NA, fmtDays, fmtPct, fmtRatio, fmtSignedPct, tone } from '../lab/lab-format';
import {
  EXIT_REASON,
  MIN_OVERLAP,
  benchmarkRegime,
  correlationMatrix,
  decisionTrace,
  readLabel,
  signalFlow,
  tickerMatrix,
} from './overview-analytics';

const BASE = '/for-the-quants';
const toneClass = (x) => ({ positive: 'qlx-up', negative: 'qlx-down' })[tone(x)] || '';
const TRADE_PAGE = 8;

function Empty({ children }) {
  return <p className="qlx-empty">{children}</p>;
}

/* ── Strategy signal flow: entries vs exits per month ─────────── */

export function SignalFlowCard({ run }) {
  const trades = run?.results?.trades;
  const rows = useMemo(() => signalFlow(trades || []).slice(-24), [trades]);
  const max = Math.max(1, ...rows.flatMap((r) => [r.entries, r.exits]));
  const totals = rows.reduce(
    (a, r) => ({ entries: a.entries + r.entries, exits: a.exits + r.exits }),
    { entries: 0, exits: 0 },
  );
  return (
    <section className="qlx-col qlo-cell" style={{ flex: '1 1 320px' }}>
      <div className="qlx-head">
        <h2 className="qlx-title">Strategy signal flow</h2>
        {rows.length > 0 && (
          <span className="qlx-sub qlx-num">
            {rows[0].month} to {rows[rows.length - 1].month}
          </span>
        )}
      </div>
      {!run ? (
        <Empty>Entries and exits by month appear once the selected strategy has a run.</Empty>
      ) : rows.length === 0 ? (
        <Empty>The selected run opened no positions.</Empty>
      ) : (
        <>
          <div
            className="qlo-flowbars"
            role="img"
            aria-label={`Entries and exits per month: ${totals.entries} entries, ${totals.exits} exits over ${rows.length} months.`}
          >
            {rows.map((r) => (
              <div
                key={r.month}
                className="qlo-flowbar"
                title={`${r.month}: ${r.entries} entries, ${r.exits} exits`}
              >
                <span className="qlo-flowbar-up" style={{ height: `${(r.entries / max) * 50}%` }} />
                <span className="qlo-flowbar-down" style={{ height: `${(r.exits / max) * 50}%` }} />
              </div>
            ))}
          </div>
          <div className="qlx-row qlx-legend-row">
            <span className="qlx-legend">
              <span className="qlo-key qlo-key--up" /> Entries{' '}
              <span className="qlx-num qlx-ink">{totals.entries}</span>
            </span>
            <span className="qlx-legend">
              <span className="qlo-key qlo-key--down" /> Exits{' '}
              <span className="qlx-num qlx-ink">{totals.exits}</span>
            </span>
            <span className="qlx-sub">Fills from the stored run, by calendar month.</span>
          </div>
        </>
      )}
    </section>
  );
}

/* ── Per-ticker results of the selected run ───────────────────── */

export function TickerMatrixCard({ run, spec }) {
  const trades = run?.results?.trades;
  const rows = useMemo(() => tickerMatrix(trades || [], spec?.universe || []), [trades, spec]);
  return (
    <section className="qlx-col qlo-cell" style={{ flex: '1 1 320px' }}>
      <div className="qlx-head">
        <h2 className="qlx-title">Results by ticker</h2>
        <span className="qlx-sub">Closed trades, selected run</span>
      </div>
      {!run ? (
        <Empty>Each ticker&apos;s trades and hit rate appear after a backtest.</Empty>
      ) : (
        <div className="qlx-tw">
          <div className="qlx-th qlo-cols-matrix">
            <span>Ticker</span>
            <span className="qlx-r">Trades</span>
            <span className="qlx-r">Win rate</span>
            <span className="qlx-r">Avg trade</span>
            <span className="qlx-r">Last signal</span>
          </div>
          {rows.map((r) => (
            <div key={r.ticker} className="qlx-tr qlo-cols-matrix">
              <span className="qlx-num qlx-ink" style={{ fontWeight: 600 }}>
                {r.ticker}
              </span>
              <span className="qlx-num qlx-r">
                {r.trades}
                {r.open ? <span className="qlx-muted"> ({r.open} open)</span> : null}
              </span>
              <span className="qlx-num qlx-r">
                {r.winRate === null ? (
                  <span className="qlx-muted">{NA}</span>
                ) : (
                  <span className={`qlo-cellchip ${r.winRate >= 0.5 ? 'is-up' : 'is-down'}`}>
                    {fmtPct(r.winRate, 0)}
                  </span>
                )}
              </span>
              <span className={`qlx-num qlx-r ${toneClass(r.avgReturn) || 'qlx-muted'}`}>
                {fmtSignedPct(r.avgReturn, 1)}
              </span>
              <span className="qlx-num qlx-r qlx-muted">{r.last || 'No signal'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Historical trades (the stored ledger, not live positions) ── */

export function HistoricalTradesCard({ run, strategyId }) {
  const trades = run?.results?.trades;
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () => [...(trades || [])].sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1)),
    [trades],
  );
  useEffect(() => setPage(0), [run?.id]);
  const pages = Math.max(1, Math.ceil(sorted.length / TRADE_PAGE));
  const shown = sorted.slice(page * TRADE_PAGE, (page + 1) * TRADE_PAGE);
  return (
    <section className="qlx-col qlo-cell" style={{ flex: '1.4 1 460px' }}>
      <div className="qlx-head">
        <div className="qlx-row">
          <h2 className="qlx-title">Historical trades</h2>
          <span className="qlx-tag">Backtest ledger</span>
        </div>
        {run && (
          <Link
            className="qlx-link"
            href={`${BASE}/backtesting?strategy=${strategyId}&run=${run.id}`}
          >
            All trades
          </Link>
        )}
      </div>
      {!run ? (
        <Empty>Simulated trades from the selected backtest are listed here.</Empty>
      ) : sorted.length === 0 ? (
        <Empty>The selected run opened no positions.</Empty>
      ) : (
        <>
          <div className="qlx-tw">
            <div className="qlx-th qlo-cols-trades">
              <span>Ticker</span>
              <span>Entry</span>
              <span>Exit</span>
              <span className="qlx-r">Held</span>
              <span className="qlx-r">Return</span>
              <span>Exit reason</span>
            </div>
            {shown.map((t, i) => (
              <div key={`${t.ticker}-${t.entryDate}-${i}`} className="qlx-tr qlo-cols-trades">
                <span className="qlx-num qlx-ink" style={{ fontWeight: 600 }}>
                  {t.ticker}
                  {t.side === 'short' ? <span className="qlx-muted"> S</span> : null}
                </span>
                <span className="qlx-num qlx-muted">{t.entryDate}</span>
                <span className="qlx-num qlx-muted">{t.open ? 'Open' : t.exitDate}</span>
                <span className="qlx-num qlx-r">{fmtDays(t.holdDays)}</span>
                <span className={`qlx-num qlx-r ${toneClass(t.pnlPct)}`}>
                  {fmtSignedPct(t.pnlPct, 1)}
                </span>
                <span className="qlx-muted">{EXIT_REASON[t.exitReason] || t.exitReason || NA}</span>
              </div>
            ))}
          </div>
          <div className="qlx-row qlx-row--between" style={{ paddingTop: '0.625rem' }}>
            <span className="qlx-sub qlx-num">
              {page * TRADE_PAGE + 1} to {Math.min((page + 1) * TRADE_PAGE, sorted.length)} of{' '}
              {sorted.length} simulated trades
            </span>
            <div className="qlx-row">
              <button
                type="button"
                className="qlx-btn qlx-btn--sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="qlx-btn qlx-btn--sm"
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ── Decision trace: signal, fill, exit, as the engine recorded ── */

function readsText(reads) {
  if (!reads) return '';
  return Object.entries(reads)
    .slice(0, 3)
    .map(([k, v]) => `${readLabel(k)} ${typeof v === 'number' ? v.toLocaleString('en-US') : v}`)
    .join(' · ');
}

export function DecisionTraceCard({ run }) {
  const trades = run?.results?.trades;
  const events = useMemo(() => decisionTrace(trades || []), [trades]);
  return (
    <section className="qlx-col qlo-cell" style={{ flex: '1 1 340px' }}>
      <div className="qlx-head">
        <h2 className="qlx-title">Decision trace</h2>
        <span className="qlx-sub">Latest recorded events</span>
      </div>
      {!run ? (
        <Empty>Each signal, fill and exit of a backtest is logged here.</Empty>
      ) : events.length === 0 ? (
        <Empty>The selected run recorded no decisions.</Empty>
      ) : (
        <ol className="qlo-trace">
          {events.map((e) => (
            <li key={e.id} className={`qlo-trace-item is-${e.kind}`}>
              <span className="qlo-trace-dot" aria-hidden />
              <span className="qlx-num qlx-muted qlo-trace-date">{e.date}</span>
              <span className="qlo-trace-body">
                {e.kind === 'signal' && (
                  <>
                    <span className="qlx-ink">
                      Entry rule met · <span className="qlx-num">{e.ticker}</span>
                    </span>
                    {e.reads && <span className="qlx-sub qlx-num">{readsText(e.reads)}</span>}
                  </>
                )}
                {e.kind === 'entry' && (
                  <span className="qlx-ink">
                    {e.side === 'short' ? 'Short' : 'Bought'}{' '}
                    <span className="qlx-num">{e.ticker}</span> at next open{' '}
                    <span className="qlx-num qlx-muted">{e.price}</span>
                  </span>
                )}
                {e.kind === 'exit' && (
                  <span className="qlx-ink">
                    Closed <span className="qlx-num">{e.ticker}</span> ·{' '}
                    {EXIT_REASON[e.reason] || e.reason}{' '}
                    <span className={`qlx-num ${toneClass(e.pnlPct)}`}>
                      {fmtSignedPct(e.pnlPct, 1)}
                    </span>
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ── Market state of the run's benchmark (rule-based heuristic) ── */

export function MarketRegimeCard({ run, benchmark }) {
  const curve = run?.results?.curve;
  const r = useMemo(() => benchmarkRegime(curve || []), [curve]);
  return (
    <section className="qlx-col qlo-cell" style={{ flex: '1 1 260px' }}>
      <div className="qlx-head">
        <h2 className="qlx-title">Market state</h2>
        <span className="qlx-tag qlx-tag--plan">Heuristic</span>
      </div>
      {!r ? (
        <Empty>
          Unavailable. It needs a run with at least 220 sessions of {benchmark || 'benchmark'}{' '}
          history.
        </Empty>
      ) : (
        <>
          <div className="qlo-regime">
            <div>
              <span className="qlx-eyebrow">Trend</span>
              <span
                className={`qlx-val qlx-val--sm ${r.trend === 'Uptrend' ? 'qlx-up' : 'qlx-down'}`}
              >
                {r.trend}
              </span>
              <span className="qlx-sub qlx-num">
                {fmtSignedPct(r.distance, 1)} vs 200-session avg
              </span>
            </div>
            <div>
              <span className="qlx-eyebrow">Volatility</span>
              <span className="qlx-val qlx-val--sm">{r.volState}</span>
              <span className="qlx-sub qlx-num">
                20-day {fmtPct(r.recentVol, 1)} · run median {fmtPct(r.medianVol, 1)}
              </span>
            </div>
          </div>
          <p className="qlx-note" style={{ paddingTop: '0.625rem' }}>
            {benchmark} as of <span className="qlx-num">{r.asOf}</span>, the run&apos;s last
            session. Trend compares the last value with its 200-session average; volatility compares
            the last 20 sessions with every 20-session window in the run (above 1.25x the median is
            elevated, below 0.8x is calm). A description, not a forecast.
          </p>
        </>
      )}
    </section>
  );
}

/* ── Correlation of saved strategies' daily returns ───────────── */

async function getRun(id, signal) {
  const res = await fetch(`/api/quants/backtests/${id}`, { signal });
  if (!res.ok) throw new Error('Request failed');
  return (await res.json()).run;
}

/** Completed runs to compare: the latest of each strategy, newest first, capped. */
export function StrategyCorrelationCard({ candidates }) {
  const ids = candidates.map((c) => c.run.id).join(',');
  const [state, setState] = useState('idle');
  const [series, setSeries] = useState([]);

  useEffect(() => {
    if (candidates.length < 2) {
      setState('idle');
      setSeries([]);
      return undefined;
    }
    const ctrl = new AbortController();
    setState('loading');
    Promise.all(candidates.map((c) => getRun(c.run.id, ctrl.signal)))
      .then((runs) => {
        setSeries(
          runs.map((r, i) => ({
            id: candidates[i].run.id,
            label: candidates[i].name,
            curve: r?.results?.curve || [],
          })),
        );
        setState('ready');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState('error');
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const matrix = useMemo(() => (series.length >= 2 ? correlationMatrix(series) : null), [series]);

  return (
    <section className="qlx-col qlo-cell" style={{ flex: '1 1 340px' }}>
      <div className="qlx-head">
        <h2 className="qlx-title">Strategy correlation</h2>
        <span className="qlx-sub">Daily returns, Pearson</span>
      </div>
      {candidates.length < 2 ? (
        <Empty>Run at least two strategies over overlapping periods to compare correlation.</Empty>
      ) : state === 'loading' ? (
        <Empty>Loading the stored runs.</Empty>
      ) : state === 'error' ? (
        <Empty>The stored runs could not be loaded.</Empty>
      ) : matrix && !matrix.comparable ? (
        <Empty>
          These runs share fewer than {MIN_OVERLAP} sessions. Backtest them over overlapping dates
          to compare.
        </Empty>
      ) : matrix ? (
        <>
          <div className="qlx-tw">
            <table className="qlo-corr">
              <caption className="qlo-sr">
                Pairwise correlation of daily strategy returns on shared sessions
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="qlo-sr">Strategy</span>
                  </th>
                  {matrix.labels.map((l, j) => (
                    <th key={j} scope="col" title={l}>
                      {j + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.cells.map((row, i) => (
                  <tr key={i}>
                    <th scope="row" title={matrix.labels[i]}>
                      <span className="qlx-num qlx-muted">{i + 1}</span> {matrix.labels[i]}
                    </th>
                    {row.map((c, j) => (
                      <td
                        key={j}
                        className={`qlx-num ${c.r === null ? 'qlx-muted' : c.r >= 0.5 ? 'is-high' : c.r <= -0.2 ? 'is-neg' : ''}`}
                        title={c.r === null ? `${c.n} shared sessions` : `${c.n} shared sessions`}
                      >
                        {c.r === null ? NA : fmtRatio(c.r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="qlx-note" style={{ paddingTop: '0.625rem' }}>
            Latest completed run of each strategy, aligned on the sessions both runs share (at least{' '}
            {MIN_OVERLAP}). Strategies above 0.5 tend to win and lose together.
          </p>
        </>
      ) : null}
    </section>
  );
}
