'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuantContext } from '../shell/useQuantContext';
import { validateSpec } from '@/lib/quants/strategy-spec';
import { BacktestReport } from './BacktestReport';
import { ValidationPanel } from './ValidationPanel';
import { fmtPct, fmtRatio, fmtSignedPct, toApiConfig, tone } from './lab-format';

const BASE = '/for-the-quants';
const TABS = [
  ['results', 'Results'],
  ['runs', 'Runs'],
  ['validation', 'Validation'],
];
const STATUS_TAG = { completed: 'qlx-tag--ok', running: 'qlx-tag--info', failed: 'qlx-tag--bad' };
const STATUS_LABEL = { completed: 'Completed', running: 'Running', failed: 'Failed' };
const toneClass = (x) => ({ positive: 'qlx-up', negative: 'qlx-down' })[tone(x)] || '';
const isoDaysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error || 'Something went wrong. Try again.');
    err.details = Array.isArray(json?.details) ? json.details : [];
    throw err;
  }
  return json;
}

/**
 * The Backtesting workspace: pick a saved strategy, set the run, read the
 * stored report, and validate it. The strategy and run stay in the URL, so a
 * link or a reload lands on the same report.
 */
export function BacktestingWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const { readStored } = useQuantContext();
  const paramStrategy = params.get('strategy') || '';
  const paramRun = params.get('run') || '';
  const paramTab = params.get('tab') || '';

  const [state, setState] = useState('loading'); // loading | ready | error
  const [strategies, setStrategies] = useState([]);
  const [strategyId, setStrategyId] = useState('');
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState(null);
  const [tab, setTab] = useState(TABS.some((t) => t[0] === paramTab) ? paramTab : 'results');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(() => ({
    startDate: isoDaysAgo(365 * 5),
    endDate: isoDaysAgo(1),
    initialCapital: 100000,
    slippageBps: 5,
    commissionPerShare: 0.005,
    riskFreeRate: 0,
  }));
  const setField = (key) => (e) => setConfig((c) => ({ ...c, [key]: e.target.value }));

  const strategy = strategies.find((s) => s.id === strategyId) || null;
  const spec = useMemo(() => {
    const checked = validateSpec(strategy?.version?.spec);
    return checked.ok && !checked.unsupported.length ? checked.spec : null;
  }, [strategy]);

  const syncUrl = useCallback(
    (next) => {
      const q = new URLSearchParams();
      if (next.strategy) q.set('strategy', next.strategy);
      if (next.run) q.set('run', next.run);
      if (next.tab && next.tab !== 'results') q.set('tab', next.tab);
      const qs = q.toString();
      router.replace(qs ? `${BASE}/backtesting?${qs}` : `${BASE}/backtesting`, { scroll: false });
    },
    [router],
  );

  /* Strategies, once. The URL's strategy wins; otherwise the most recently saved. */
  useEffect(() => {
    let live = true;
    api('/api/quants/strategies')
      .then((json) => {
        if (!live) return;
        const list = json.strategies || [];
        setStrategies(list);
        /* The URL wins, then the strategy last used in this tab, then the most recent. */
        const wanted = [paramStrategy, readStored()].find((id) => list.some((s) => s.id === id));
        setStrategyId(wanted || list[0]?.id || '');
        setState('ready');
      })
      .catch(() => live && setState('error'));
    return () => {
      live = false;
    };
    // The URL is read once on arrival; later changes come from this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRun = useCallback(async (id) => {
    setError(null);
    try {
      const json = await api(`/api/quants/backtests/${id}`);
      setRun(json.run);
      return true;
    } catch (err) {
      setRun(null);
      setError({ message: err.message, details: [] });
      return false;
    }
  }, []);

  /* Runs of the selected strategy. Opens the run named in the URL, else its
     latest completed run. */
  useEffect(() => {
    if (!strategyId) return undefined;
    let live = true;
    setRun(null);
    setRuns([]);
    api(`/api/quants/backtests?strategyId=${strategyId}`)
      .then((json) => {
        if (!live) return;
        const list = json.runs || [];
        setRuns(list);
        const wanted =
          list.find((r) => r.id === paramRun && r.status === 'completed') ||
          list.find((r) => r.status === 'completed');
        if (wanted) openRun(wanted.id);
      })
      .catch(() => live && setRuns([]));
    return () => {
      live = false;
    };
    // paramRun is only honoured on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId, openRun]);

  const pickStrategy = (id) => {
    setStrategyId(id);
    setError(null);
    syncUrl({ strategy: id, tab });
  };

  const pickTab = (id) => {
    setTab(id);
    syncUrl({ strategy: strategyId, run: run?.id, tab: id });
  };

  const pickRun = async (id) => {
    if (await openRun(id)) {
      setTab('results');
      syncUrl({ strategy: strategyId, run: id });
    }
  };

  const runBacktest = async () => {
    if (!strategyId) return;
    setBusy(true);
    setError(null);
    try {
      const json = await api('/api/quants/backtests', {
        method: 'POST',
        body: JSON.stringify({ strategyId, config: toApiConfig(config) }),
      });
      setRun(json.run);
      setTab('results');
      syncUrl({ strategy: strategyId, run: json.run.id });
      const list = await api(`/api/quants/backtests?strategyId=${strategyId}`);
      setRuns(list.runs || []);
    } catch (err) {
      setError({ message: err.message, details: err.details || [] });
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <p className="qlx-empty">Loading your strategies.</p>;
  if (state === 'error') return <p className="qlx-empty">Your strategies could not be loaded.</p>;
  if (!strategies.length) {
    return (
      <p className="qlx-empty">
        A backtest runs a saved strategy.{' '}
        <Link className="qlx-link" href={`${BASE}/strategy-lab?new=1`}>
          Create a strategy first
        </Link>
      </p>
    );
  }

  return (
    <div className="ql-root">
      <div className="ql-row ql-row--tight">
        <label className="ql-field ql-field--grow">
          <span className="ql-label">Strategy and version</span>
          <select
            className="ql-input"
            value={strategyId}
            onChange={(e) => pickStrategy(e.target.value)}
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · v{s.latest_version}
              </option>
            ))}
          </select>
        </label>
        <label className="ql-field">
          <span className="ql-label">Start</span>
          <input
            className="ql-input"
            type="date"
            value={config.startDate}
            onChange={setField('startDate')}
          />
        </label>
        <label className="ql-field">
          <span className="ql-label">End</span>
          <input
            className="ql-input"
            type="date"
            value={config.endDate}
            onChange={setField('endDate')}
          />
        </label>
        <label className="ql-field">
          <span className="ql-label">Slippage, bps</span>
          <input
            className="ql-input ql-input--num"
            type="number"
            min={0}
            max={200}
            step="any"
            value={config.slippageBps}
            onChange={setField('slippageBps')}
          />
        </label>
        <button
          type="button"
          className="ql-btn ql-btn--primary"
          disabled={busy || !spec}
          onClick={runBacktest}
        >
          <i className="bi bi-play-fill" aria-hidden />
          {busy ? 'Running backtest' : 'Run backtest'}
        </button>
      </div>

      <details className="ql-details">
        <summary>Configuration</summary>
        <div className="ql-row ql-row--tight">
          <label className="ql-field">
            <span className="ql-label">Starting capital, USD</span>
            <input
              className="ql-input ql-input--num"
              type="number"
              min={1000}
              step={1000}
              value={config.initialCapital}
              onChange={setField('initialCapital')}
            />
          </label>
          <label className="ql-field">
            <span className="ql-label">Commission, USD a share</span>
            <input
              className="ql-input ql-input--num"
              type="number"
              min={0}
              max={1}
              step="any"
              value={config.commissionPerShare}
              onChange={setField('commissionPerShare')}
            />
          </label>
          <label className="ql-field">
            <span className="ql-label">Risk-free rate, %</span>
            <input
              className="ql-input ql-input--num"
              type="number"
              min={0}
              max={20}
              step="any"
              value={config.riskFreeRate}
              onChange={setField('riskFreeRate')}
            />
          </label>
        </div>
        <p className="ql-hint">
          Universe, benchmark, direction and sizing belong to the strategy and are edited in{' '}
          <Link className="ql-link" href={`${BASE}/strategy-lab?strategy=${strategyId}`}>
            Strategy Lab
          </Link>
          . Signals are read on the close and filled at the next session&apos;s open.
        </p>
      </details>

      {!spec && (
        <p className="ql-hint">
          This strategy version cannot be backtested as saved. Open it in Strategy Lab to see why.
        </p>
      )}
      {error && (
        <div className="ql-errors" role="alert">
          <p>{error.message}</p>
          {error.details?.length > 0 && (
            <ul>
              {error.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="qlx-tabs"
        role="tablist"
        aria-label="Backtesting views"
        style={{ marginTop: '1.25rem' }}
      >
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => pickTab(id)}
          >
            {label}
            {id === 'runs' && runs.length ? ` (${runs.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'results' &&
        (run ? (
          <BacktestReport run={run} />
        ) : (
          <div className="ql-empty">
            <i className="bi bi-graph-up" aria-hidden />
            <p>
              No backtest open for this strategy. Run one to see its equity curve against the
              benchmark, drawdowns, monthly returns, every trade, and the assumptions behind the
              numbers.
            </p>
          </div>
        ))}

      {tab === 'runs' &&
        (runs.length === 0 ? (
          <p className="qlx-empty">This strategy has no runs yet.</p>
        ) : (
          <div className="ql-table-wrap">
            <table className="ql-table">
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Started</th>
                  <th scope="col">Window</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="ql-num">
                    Return
                  </th>
                  <th scope="col" className="ql-num">
                    Sharpe
                  </th>
                  <th scope="col" className="ql-num">
                    Max drawdown
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className={run?.id === r.id ? 'is-active' : ''}>
                    <th scope="row">{String(r.id).slice(0, 6)}</th>
                    <td>{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
                    <td>
                      {r.config?.startDate} to {r.config?.endDate}
                    </td>
                    <td>
                      <span className={`qlx-tag ${STATUS_TAG[r.status] || ''}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className={`ql-num ${toneClass(r.metrics?.totalReturn)}`}>
                      {fmtSignedPct(r.metrics?.totalReturn)}
                    </td>
                    <td className="ql-num">{fmtRatio(r.metrics?.sharpe)}</td>
                    <td className="ql-num">{fmtPct(r.metrics?.maxDrawdown)}</td>
                    <td>
                      {r.status === 'completed' ? (
                        <button type="button" className="ql-link" onClick={() => pickRun(r.id)}>
                          Open report
                        </button>
                      ) : (
                        <span className="ql-hint">{r.error || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'validation' && (
        <ValidationPanel strategyId={strategyId} dirty={false} spec={spec} config={config} />
      )}

      <p className="ql-disclaimer">
        For educational and informational purposes only. Not financial advice. Past performance does
        not guarantee future results.
      </p>
    </div>
  );
}

export default BacktestingWorkspace;
