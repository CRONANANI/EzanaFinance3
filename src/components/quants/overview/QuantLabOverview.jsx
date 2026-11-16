'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { computeRunMetrics, drawdownStats } from '@/lib/quants/metrics';
import { NA, fmtPct, fmtRatio, fmtSignedPct, linePaths, areaPath, tone } from '../lab/lab-format';
import { useQuantContext } from '../shell/useQuantContext';
import { Skeleton, SkeletonRegion } from '@/components/ds';
import { useCouncilQuant } from '../council/useCouncilQuant';
import { QuantCouncil, CouncilSampleSwitch } from '../council/QuantCouncil';
import './quant-overview.css';
import {
  PERIODS,
  activityFeed,
  bestSharpe,
  cumulative,
  latestCompleted,
  pickEven,
  relativeTime,
  sliceCurve,
  strategyStatus,
  strategyType,
  ticks,
} from './overview-math';

const BASE = '/for-the-quants';
const W = 600;
const H = 240;
const PAGE_SIZE = 6;

const STATUS_TAG = {
  Draft: '',
  Research: 'qlx-tag--info',
  Archived: 'qlx-tag--plan',
  completed: 'qlx-tag--ok',
  running: 'qlx-tag--info',
  failed: 'qlx-tag--bad',
};
const RUN_STATUS = { completed: 'Completed', running: 'Running', failed: 'Failed' };
/* Council members only: the council tab beside their own research. */
const TABS = [
  ['council', 'Council'],
  ['research', 'My research'],
];
const tabKey = (userId) => `quantlab.overview.tab.${userId || 'viewer'}`;
const toneClass = (x) => ({ positive: 'qlx-up', negative: 'qlx-down' })[tone(x)] || '';

async function getJson(path) {
  const res = await fetch(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return json;
}

/* ── Strategy performance ─────────────────────────────────── */

function PerformancePanel({ strategy, summary }) {
  const [run, setRun] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | error
  const [period, setPeriod] = useState('run');
  const [showDd, setShowDd] = useState(false);

  const runId = summary?.id || null;
  useEffect(() => {
    setRun(null);
    if (!runId) {
      setState('idle');
      return undefined;
    }
    let live = true;
    setState('loading');
    getJson(`/api/quants/backtests/${runId}`)
      .then((json) => {
        if (!live) return;
        setRun(json.run);
        setState('ready');
      })
      .catch(() => live && setState('error'));
    return () => {
      live = false;
    };
  }, [runId]);

  const view = useMemo(() => {
    const curve = run?.results?.curve || [];
    if (curve.length < 2) return null;
    const slice = sliceCurve(curve, period);
    /* The four figures and both lines are computed from this one slice of
       this one stored run, so they cannot disagree with each other. */
    const m = computeRunMetrics({ curve: slice, riskFreeRate: run.config?.riskFreeRate || 0 });
    const cum = cumulative(slice);
    const all = [...cum.strategy, ...cum.benchmark].filter((v) => typeof v === 'number');
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const pad = (hi - lo || 0.01) * 0.06;
    lo -= pad;
    hi += pad;
    const scale = (series) =>
      series.map((v) => (typeof v === 'number' ? (v - lo) / (hi - lo) : null));
    /* linePaths scales to its own min and max; feed it values already on the
       shared 0..1 scale, with fixed corners so both lines share it. */
    const { paths } = linePaths([scale(cum.strategy), scale(cum.benchmark), [0, 1]], W, H, 0);
    const dd = drawdownStats(slice).series.map((p) => p.drawdown);
    const ddLo = Math.min(...dd, -0.01);
    return {
      m,
      strategyPath: paths[0],
      benchPath: paths[1],
      area: areaPath(scale(cum.strategy), W, H, 0, 0, 1, 0),
      ddPath: areaPath(dd, W, 56, 0, ddLo, 0, 0),
      yTicks: ticks(lo, hi),
      xTicks: pickEven(cum.dates),
      hasBench: cum.benchmark.some((v) => typeof v === 'number'),
      benchReturn: m.benchmarkReturn,
      from: slice[0].date,
      to: slice[slice.length - 1].date,
    };
  }, [run, period]);

  const benchmark = run?.results?.benchmark || strategy?.version?.spec?.benchmark || 'Benchmark';

  return (
    <section className="qlx-col" style={{ flex: '52 1 440px' }}>
      <div className="qlx-head">
        <div className="qlx-row">
          <h2 className="qlx-title">Strategy performance</h2>
          {view && (
            <span className="qlx-sub qlx-num">
              Run {String(runId).slice(0, 6)} · {view.from} to {view.to}
            </span>
          )}
        </div>
        {view && (
          <div className="qlx-row">
            <div className="qlx-seg" role="group" aria-label="Chart period">
              {PERIODS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={period === id}
                  onClick={() => setPeriod(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="qlx-btn qlx-btn--sm"
              aria-pressed={showDd}
              onClick={() => setShowDd((v) => !v)}
            >
              Drawdown
            </button>
            <Link
              className="qlx-btn qlx-btn--icon qlx-btn--sm"
              href={`${BASE}/backtesting?strategy=${strategy.id}&run=${runId}`}
              aria-label="Open full results"
            >
              <i className="bi bi-arrows-angle-expand" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {!strategy && <p className="qlx-empty">Create a strategy to see its performance here.</p>}
      {strategy && !runId && (
        <p className="qlx-empty">
          {strategy.name} has no completed backtest yet.{' '}
          <Link className="qlx-link" href={`${BASE}/backtesting?strategy=${strategy.id}`}>
            Run a backtest
          </Link>
        </p>
      )}
      {state === 'loading' && <p className="qlx-empty">Loading the stored run.</p>}
      {state === 'error' && <p className="qlx-empty">The stored run could not be loaded.</p>}

      {view && (
        <>
          <div className="qlx-strip qlx-strip--four">
            {[
              ['Total return', fmtSignedPct(view.m.totalReturn, 1), toneClass(view.m.totalReturn)],
              ['Annualised', fmtSignedPct(view.m.cagr, 1), toneClass(view.m.cagr)],
              ['Sharpe', fmtRatio(view.m.sharpe), ''],
              [
                'Max drawdown',
                fmtPct(view.m.maxDrawdown, 1),
                view.m.maxDrawdown < 0 ? 'qlx-down' : '',
              ],
            ].map(([label, value, cls]) => (
              <div key={label} className="qlx-cell">
                <span className="qlx-eyebrow">{label}</span>
                <span className={`qlx-val qlx-val--sm ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="qlx-chart">
            <div className="qlx-axis qlx-axis--y" aria-hidden>
              {view.yTicks.map((t, i) => (
                <span key={i}>{fmtSignedPct(t, 0)}</span>
              ))}
            </div>
            <div className="qlx-plot">
              <svg
                className="qlx-svg-main"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`Cumulative return of the strategy and ${benchmark}. Strategy ${fmtSignedPct(view.m.totalReturn, 1)}, ${benchmark} ${fmtSignedPct(view.benchReturn, 1)}.`}
              >
                <path
                  d={`M0 0.5H${W}M0 60H${W}M0 120H${W}M0 180H${W}M0 239.5H${W}`}
                  className="qlx-grid"
                />
                <path d={view.area} className="qlx-area" />
                {view.hasBench && <path d={view.benchPath} className="qlx-line qlx-line--bench" />}
                <path d={view.strategyPath} className="qlx-line qlx-line--strategy" />
              </svg>
              {showDd && (
                <svg
                  className="qlx-svg-dd"
                  viewBox={`0 0 ${W} 56`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Drawdown from peak over the same dates"
                >
                  <path d={view.ddPath} className="qlx-dd" />
                </svg>
              )}
              <div className="qlx-axis qlx-axis--x" aria-hidden>
                {view.xTicks.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="qlx-row qlx-legend-row">
            <span className="qlx-legend">
              <span className="qlx-swatch" />
              Strategy{' '}
              <span className="qlx-num qlx-ink">{fmtSignedPct(view.m.totalReturn, 1)}</span>
            </span>
            {view.hasBench && (
              <span className="qlx-legend">
                <span className="qlx-swatch qlx-swatch--bench" />
                {benchmark} benchmark{' '}
                <span className="qlx-num qlx-ink">{fmtSignedPct(view.benchReturn, 1)}</span>
              </span>
            )}
            <span className="qlx-sub">Curve and metrics read the same stored run.</span>
          </div>
        </>
      )}
    </section>
  );
}

/* ── My strategies ────────────────────────────────────────── */

function StrategiesPanel({ rows }) {
  const [page, setPage] = useState(0);
  const [desc, setDesc] = useState(true);
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);

  /* The row menu closes on Escape (focus back on its trigger) and on a click
     outside it. */
  useEffect(() => {
    if (!menu) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(null);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      menuRef.current?.querySelector('button')?.focus();
      setMenu(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const sorted = useMemo(() => {
    const value = (r) => (typeof r.ret === 'number' ? r.ret : -Infinity);
    return [...rows].sort((a, b) => (desc ? value(b) - value(a) : value(a) - value(b)));
  }, [rows, desc]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const shown = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="qlx-col" style={{ flex: '48 1 400px' }}>
      <div className="qlx-head">
        <h2 className="qlx-title">My strategies</h2>
        <Link className="qlx-link" href={`${BASE}/strategy-lab`}>
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="qlx-empty">
          No strategies yet.{' '}
          <Link className="qlx-link" href={`${BASE}/strategy-lab`}>
            Create your first strategy
          </Link>
        </p>
      ) : (
        <>
          <div className="qlx-th qlx-cols-strategies">
            <span>Strategy, version, type</span>
            <button
              type="button"
              className="qlx-sort qlx-r"
              aria-label={`Sort by return, ${desc ? 'ascending' : 'descending'}`}
              onClick={() => {
                setDesc((v) => !v);
                setPage(0);
              }}
            >
              Return{' '}
              <i className={`bi ${desc ? 'bi-caret-down-fill' : 'bi-caret-up-fill'}`} aria-hidden />
            </button>
            <span className="qlx-r">Sharpe</span>
            <span className="qlx-r">Max DD</span>
            <span>Status</span>
            <span />
          </div>
          {shown.map((r) => (
            <div key={r.id} className="qlx-tr qlx-cols-strategies">
              <Link className="qlx-name" href={`${BASE}/strategy-lab?strategy=${r.id}`}>
                <span>{r.name}</span>
                <span className="qlx-sub">
                  <span className="qlx-num">v{r.version}</span> · {r.type}
                  {r.validated ? ' · validation on file' : ''}
                </span>
              </Link>
              <span
                className={`qlx-num qlx-r ${typeof r.ret === 'number' ? toneClass(r.ret) : 'qlx-muted'}`}
              >
                {typeof r.ret === 'number' ? fmtSignedPct(r.ret, 1) : 'No runs'}
              </span>
              <span className="qlx-num qlx-r qlx-ink">{fmtRatio(r.sharpe)}</span>
              <span
                className={`qlx-num qlx-r ${typeof r.dd !== 'number' ? 'qlx-muted' : r.dd < 0 ? 'qlx-down' : 'qlx-ink'}`}
              >
                {fmtPct(r.dd, 1)}
              </span>
              <span>
                <span className={`qlx-tag ${STATUS_TAG[r.status]}`}>{r.status}</span>
              </span>
              <div className="qlx-menu-wrap" ref={menu === r.id ? menuRef : undefined}>
                <button
                  type="button"
                  className="qlx-btn qlx-btn--icon qlx-btn--sm qlx-btn--bare"
                  aria-label={`Actions for ${r.name}`}
                  aria-haspopup="menu"
                  aria-expanded={menu === r.id}
                  onClick={() => setMenu((m) => (m === r.id ? null : r.id))}
                >
                  <i className="bi bi-three-dots" aria-hidden />
                </button>
                {menu === r.id && (
                  <div className="qlx-menu" role="menu" aria-label={`Actions for ${r.name}`}>
                    <Link role="menuitem" href={`${BASE}/strategy-lab?strategy=${r.id}`}>
                      Open and edit
                    </Link>
                    <Link role="menuitem" href={`${BASE}/backtesting?strategy=${r.id}`}>
                      Backtest
                    </Link>
                    <Link
                      role="menuitem"
                      href={`${BASE}/backtesting?strategy=${r.id}&tab=validation`}
                    >
                      Validate
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="qlx-row qlx-row--between" style={{ paddingTop: '0.625rem' }}>
            <span className="qlx-sub qlx-num">
              {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, sorted.length)} of{' '}
              {sorted.length}
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

/* ── The page ─────────────────────────────────────────────── */

export function QuantLabOverview() {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [strategies, setStrategies] = useState([]);
  const [runs, setRuns] = useState([]);
  const [validations, setValidations] = useState([]);
  const [selected, setSelected] = useState('');
  const context = useQuantContext();
  const [now, setNow] = useState(0);

  /* The Council tab: council members only, once their membership is known.
     Everyone else sees the Overview as it was. The council part fetches
     nothing until then. */
  const { user } = useAuth();
  const { isOrgUser, isLoading: orgLoading } = useOrg();
  const councilReady = Boolean(user && isOrgUser && !orgLoading);
  const council = useCouncilQuant(councilReady);
  const [tab, setTab] = useState('council');
  const tabsId = useId();
  useEffect(() => {
    if (!councilReady) return;
    try {
      const stored = window.localStorage.getItem(tabKey(user?.id));
      if (stored === 'council' || stored === 'research') setTab(stored);
    } catch {
      /* storage blocked: the Council tab opens first */
    }
  }, [councilReady, user?.id]);
  const chooseTab = (id) => {
    setTab(id);
    try {
      window.localStorage.setItem(tabKey(user?.id), id);
    } catch {
      /* the choice still holds for this visit */
    }
  };
  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TABS.findIndex(([id]) => id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
    chooseTab(next);
    document.getElementById(`${tabsId}-${next}`)?.focus();
  };

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [s, r, v] = await Promise.all([
        getJson('/api/quants/strategies'),
        getJson('/api/quants/backtests'),
        /* Validation is optional context here: the page still works without it. */
        getJson('/api/quants/validations').catch(() => ({ validations: [] })),
      ]);
      setStrategies(s.strategies || []);
      setRuns(r.runs || []);
      setValidations(v.validations || []);
      setNow(Date.now());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = useMemo(() => {
    /* The list endpoint carries each strategy's newest run; the runs feed may
       hold an older completed one when the newest failed. */
    const fromFeed = latestCompleted(runs);
    const out = { ...fromFeed };
    for (const s of strategies) {
      if (s.latestRun?.status === 'completed') out[s.id] = s.latestRun;
    }
    return out;
  }, [runs, strategies]);

  const names = useMemo(
    () => Object.fromEntries(strategies.map((s) => [s.id, s.name])),
    [strategies],
  );
  const validated = useMemo(
    () => new Set(validations.filter((v) => v.status === 'completed').map((v) => v.strategy_id)),
    [validations],
  );

  const rows = useMemo(
    () =>
      strategies.map((s) => {
        const m = latest[s.id]?.metrics;
        return {
          id: s.id,
          name: s.name,
          version: s.latest_version,
          type: strategyType(s.version?.spec),
          ret: m?.totalReturn ?? null,
          sharpe: m?.sharpe ?? null,
          dd: m?.maxDrawdown ?? null,
          status: strategyStatus(s, Boolean(latest[s.id])),
          validated: validated.has(s.id),
        };
      }),
    [strategies, latest, validated],
  );

  /* Default selection: the strategy with the most recent completed run. */
  useEffect(() => {
    if (selected && strategies.some((s) => s.id === selected)) return;
    /* The strategy the user was last working on wins over the default. */
    const carried = context.strategy || context.readStored();
    if (carried && strategies.some((s) => s.id === carried)) {
      setSelected(carried);
      return;
    }
    const withRun = runs.find((r) => r.status === 'completed' && names[r.strategy_id]);
    setSelected(withRun?.strategy_id || strategies[0]?.id || '');
  }, [strategies, runs, names, selected, context]);

  const strategy = strategies.find((s) => s.id === selected) || null;
  const summary = strategy ? latest[strategy.id] || null : null;
  const metrics = summary?.metrics || null;
  const best = useMemo(() => bestSharpe(strategies, latest), [strategies, latest]);
  const feed = useMemo(() => activityFeed(runs, validations, names), [runs, validations, names]);

  const active = strategies.filter((s) => s.status !== 'archived').length;
  const running =
    runs.filter((r) => r.status === 'running').length +
    validations.filter((v) => v.status === 'running').length;
  const dayAgo = now - 86400000;
  const doneToday = [...runs, ...validations].filter(
    (x) => x.status === 'completed' && Date.parse(x.created_at) >= dayAgo,
  ).length;

  const kpis =
    state === 'ready'
      ? [
          {
            label: 'Strategies',
            value: String(strategies.length),
            sub: strategies.length
              ? `${active} active · ${strategies.length - active} archived`
              : 'None saved yet',
          },
          {
            label: 'Active research',
            value: String(running),
            sub: `running · ${doneToday} completed in the last day`,
          },
          { label: 'Paper trading', value: NA, sub: 'Not available yet', cls: 'qlx-muted' },
          {
            label: 'Sharpe (best)',
            value: best ? fmtRatio(best.sharpe) : NA,
            sub: best
              ? `${best.strategy.name} v${best.strategy.latest_version} · ${best.run.config?.startDate} to ${best.run.config?.endDate}`
              : 'No completed backtest yet',
          },
          {
            label: 'Max drawdown',
            value: fmtPct(metrics?.maxDrawdown, 1),
            sub:
              strategy && metrics
                ? `${strategy.name} · run window`
                : 'No completed backtest selected',
            cls: metrics?.maxDrawdown < 0 ? 'qlx-down' : '',
          },
        ]
      : [];

  const research =
    state === 'loading' ? (
      <SkeletonRegion label="Loading your research" className="qlo-skel">
        <Skeleton height={12} width="90%" />
        <Skeleton height={12} width="72%" />
        <Skeleton height={12} width="56%" />
      </SkeletonRegion>
    ) : state === 'error' ? (
      <p className="qlx-empty" role="alert">
        Your research could not be loaded.{' '}
        <button type="button" className="qlo-textbtn" onClick={load}>
          Retry
        </button>
      </p>
    ) : (
      <>
        <div className="qlx-band">
          <PerformancePanel strategy={strategy} summary={summary} />
          <StrategiesPanel rows={rows} />
        </div>

        <div className="qlx-band">
          <section className="qlx-col" style={{ flex: '1 1 300px' }}>
            <div className="qlx-head">
              <h2 className="qlx-title">Risk overview</h2>
              <Link className="qlx-link" href={`${BASE}/risk-portfolio`}>
                Risk &amp; Portfolio
              </Link>
            </div>
            {!metrics ? (
              <p className="qlx-empty">
                Risk figures appear once the selected strategy has a completed backtest.
              </p>
            ) : (
              <>
                {[
                  ['Volatility (annualised)', fmtPct(metrics.volatility, 1), ''],
                  [
                    `Beta against ${strategy?.version?.spec?.benchmark || 'benchmark'}`,
                    fmtRatio(metrics.beta),
                    '',
                  ],
                  [
                    'VaR (95%, 1 day)',
                    metrics.valueAtRisk95 == null ? NA : fmtPct(-metrics.valueAtRisk95, 1),
                    'qlx-down',
                  ],
                  [
                    'Expected shortfall (95%)',
                    metrics.expectedShortfall95 == null
                      ? NA
                      : fmtPct(-metrics.expectedShortfall95, 1),
                    'qlx-down',
                  ],
                  ['Gross exposure (average)', fmtPct(metrics.averageGrossExposure, 0), ''],
                  ['Gross exposure (peak)', fmtPct(metrics.maxGrossExposure, 0), ''],
                ].map(([label, value, cls]) => (
                  <div key={label} className="qlx-kv">
                    <span>{label}</span>
                    <span className={`qlx-num ${value === NA ? 'qlx-muted' : cls || 'qlx-ink'}`}>
                      {value}
                    </span>
                  </div>
                ))}
                <p className="qlx-note" style={{ paddingTop: '0.625rem' }}>
                  Historical method on the daily returns of the selected strategy&apos;s latest
                  completed run.
                </p>
              </>
            )}
          </section>

          <section className="qlx-col" style={{ flex: '1.2 1 320px' }}>
            <div className="qlx-head">
              <h2 className="qlx-title">Research activity</h2>
              <Link className="qlx-link" href={`${BASE}/backtesting`}>
                View all
              </Link>
            </div>
            {feed.length === 0 && (
              <p className="qlx-empty">Backtests and validations will be listed here.</p>
            )}
            {feed.map((a) => (
              <Link
                key={a.id}
                className="qlx-activity"
                href={`${BASE}/backtesting?strategy=${a.strategyId}${a.runId ? `&run=${a.runId}` : '&tab=validation'}`}
              >
                <span
                  className={`qlx-dot ${a.status === 'failed' ? 'qlx-down' : a.status === 'running' ? 'qlx-muted' : 'qlx-up'}`}
                />
                <span className="qlx-activity-text">
                  <span className="qlx-ink" style={{ fontWeight: 600 }}>
                    {a.kind === 'backtest' ? 'Backtest' : 'Validation'} {a.status}
                  </span>
                  <span className="qlx-sub">
                    {a.name} · {relativeTime(a.at, now)}
                  </span>
                </span>
                <span
                  className={`qlx-num ${a.status === 'failed' ? 'qlx-down' : a.resultKind === 'return' ? toneClass(a.result) : 'qlx-ink'}`}
                  style={{ fontWeight: 600 }}
                >
                  {a.status === 'failed'
                    ? 'Failed'
                    : a.status === 'running'
                      ? 'Running'
                      : a.resultKind === 'return'
                        ? fmtSignedPct(a.result, 1)
                        : `OOS Sharpe ${fmtRatio(a.result)}`}
                </span>
              </Link>
            ))}
          </section>
        </div>

        <div className="qlx-band">
          <section className="qlx-col" style={{ flex: '1 1 100%' }}>
            <div className="qlx-head">
              <h2 className="qlx-title">Recent backtests</h2>
              <Link className="qlx-link" href={`${BASE}/backtesting`}>
                View all
              </Link>
            </div>
            {runs.length === 0 ? (
              <p className="qlx-empty">No backtests yet.</p>
            ) : (
              <div className="qlx-tw">
                <div className="qlx-th qlx-cols-runs">
                  <span>Run</span>
                  <span>Strategy</span>
                  <span>Window</span>
                  <span className="qlx-r">Return</span>
                  <span className="qlx-r">Sharpe</span>
                  <span>Status</span>
                </div>
                {runs.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    className="qlx-tr qlx-cols-runs"
                    href={`${BASE}/backtesting?strategy=${r.strategy_id}&run=${r.id}`}
                  >
                    <span className="qlx-num qlx-muted">{String(r.id).slice(0, 6)}</span>
                    <span className="qlx-ink" style={{ fontWeight: 600 }}>
                      {names[r.strategy_id] || 'Deleted strategy'}
                    </span>
                    <span className="qlx-num qlx-muted">
                      {String(r.config?.startDate || '').slice(0, 7)} to{' '}
                      {String(r.config?.endDate || '').slice(0, 7)}
                    </span>
                    <span
                      className={`qlx-num qlx-r ${toneClass(r.metrics?.totalReturn) || 'qlx-muted'}`}
                    >
                      {fmtSignedPct(r.metrics?.totalReturn, 1)}
                    </span>
                    <span className="qlx-num qlx-r qlx-ink">{fmtRatio(r.metrics?.sharpe)}</span>
                    <span>
                      <span className={`qlx-tag ${STATUS_TAG[r.status] || ''}`}>
                        {RUN_STATUS[r.status] || r.status}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="qlx-band">
          <section className="qlx-col" style={{ flex: '1 1 100%' }}>
            <div className="qlx-head">
              <h2 className="qlx-title">Quick actions</h2>
            </div>
            <div className="qlx-actions qlo-actions">
              {[
                [
                  'New strategy',
                  'Build with the rule editor',
                  `${BASE}/strategy-lab?new=1`,
                  'bi-plus-lg',
                ],
                [
                  'Run backtest',
                  'Test on historical bars',
                  `${BASE}/backtesting`,
                  'bi-play-circle',
                ],
                [
                  'Factor research',
                  'Rank the universe by a signal',
                  `${BASE}/factor-research`,
                  'bi-bar-chart',
                ],
                [
                  'Risk analysis',
                  'Exposure and concentration',
                  `${BASE}/risk-portfolio`,
                  'bi-shield',
                ],
              ].map(([label, sub, href, icon]) => (
                <Link key={label} className="qlx-action" href={href}>
                  <i className={`bi ${icon}`} aria-hidden />
                  <span className="qlx-ink" style={{ fontWeight: 600 }}>
                    {label}
                  </span>
                  <span className="qlx-sub">{sub}</span>
                </Link>
              ))}
              <div className="qlx-action" aria-disabled="true">
                <i className="bi bi-send" aria-hidden />
                <span className="qlx-ink" style={{ fontWeight: 600 }}>
                  Paper deploy
                </span>
                <span className="qlx-sub">Not available yet</span>
              </div>
            </div>
          </section>
        </div>

        <p className="qlo-planned">
          <i className="bi bi-hourglass-split" aria-hidden="true" /> Planned, not built yet: factor
          exposure of a run, performance by market regime, and hypotheses handed over from Sonar
          (until then, test a disclosure signal in{' '}
          <Link className="qlx-link" href={`${BASE}/datasets-research`}>
            Datasets &amp; Research
          </Link>
          ).
        </p>
      </>
    );

  return (
    <>
      {state === 'ready' && (
        <>
          <div className="qlx-toolbar" role="group" aria-label="Workspace controls">
            <label className="qlx-row">
              <span className="qlx-label">Strategy</span>
              <select
                className="qlx-select"
                value={selected}
                disabled={!strategies.length}
                onChange={(e) => {
                  setSelected(e.target.value);
                  context.setContext({ strategy: e.target.value });
                }}
              >
                {!strategies.length && <option value="">No strategies yet</option>}
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · v{s.latest_version}
                  </option>
                ))}
              </select>
            </label>
            <Link className="qlx-btn qlx-btn--primary" href={`${BASE}/strategy-lab?new=1`}>
              <i className="bi bi-plus-lg" aria-hidden />
              <span>Create strategy</span>
            </Link>
          </div>

          <section aria-label="Summary" className="qlx-strip">
            {kpis.map((k) => (
              <div key={k.label} className="qlx-cell">
                <span className="qlx-eyebrow">{k.label}</span>
                <span className={`qlx-val ${k.cls || ''}`}>{k.value}</span>
                <span className="qlx-sub">{k.sub}</span>
              </div>
            ))}
          </section>
        </>
      )}

      {councilReady ? (
        <>
          <div className="qlo-tabrow">
            <div className="qlo-tabs" role="tablist" aria-label="Overview">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => chooseTab(id)}
                  onKeyDown={onTabKey}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'council' ? <CouncilSampleSwitch council={council} /> : null}
          </div>
          <div
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-${tab}`}
            className="qlo-panel"
          >
            {tab === 'council' ? <QuantCouncil council={council} /> : research}
          </div>
        </>
      ) : (
        research
      )}
    </>
  );
}

export default QuantLabOverview;
