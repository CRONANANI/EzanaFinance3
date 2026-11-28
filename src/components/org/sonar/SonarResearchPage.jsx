'use client';

/**
 * Sonar Research (/org-team-hub/sonar): where research runs become reports
 * the fund keeps, reviews, approves and attaches to pitches.
 *
 * An analyst sees their drafts, what came back to them and how much deep
 * research is left; a portfolio manager or executive also sees what waits on
 * their review and everyone's research quality; an executive sets the
 * budget. One layout for every role: what a member is offered follows the
 * server's rules, and the server checks every request again.
 *
 * The tab, the filters and the analytics window are kept in the page
 * address. The page renders inside TeamHubShell (the shared sidebar), which
 * the layout provides.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  NA,
  TABS,
  cleanFilters,
  cleanTab,
  cleanWindow,
  kpisOf,
  windowLabel,
} from '@/lib/org-sonar-research-model';
import { Kpi } from './parts';
import { useSonarResearchData } from './useSonarResearchData';
import { ReportsTab } from './ReportsTab';
import { ResearchTab } from './ResearchTab';
import { AnalyticsTab } from './AnalyticsTab';
import { CouncilIntelligenceTab } from './CouncilIntelligenceTab';
import { BudgetSettingsDialog } from './BudgetSettingsDialog';
import '@/components/org/command-center/command-center.css';
import './sonar-research.css';
import '@/styles/home-canvas.css';

/** Keep the tab, filters and window in the page address. */
function writeAddress({ tab, filters, windowDays }) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('tab', tab === 'reports' ? null : tab);
  set('q', filters.q || null);
  set('status', filters.status || null);
  set('kind', filters.kind || null);
  set('visibility', filters.visibility || null);
  set('ticker', filters.ticker || null);
  set('mine', filters.mine ? '1' : null);
  set('window', windowDays === '90' ? null : windowDays);
  if (tab !== 'research') {
    url.searchParams.delete('pitch');
    url.searchParams.delete('question');
    url.searchParams.delete('saveTo');
    url.searchParams.delete('company');
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page osp-page">
      <VisuallyHidden>
        <h1>Sonar Research</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

export function SonarResearchPage({ sampleViewer = false, initial = {} }) {
  const { isOrgUser, isLoading } = useOrg();
  const enabled = Boolean(isOrgUser && !isLoading);

  const [tab, setTabState] = useState(() => cleanTab(initial.tab));
  const [filters, setFilters] = useState(() => cleanFilters(initial));
  const [windowDays, setWindowDays] = useState(() => cleanWindow(initial.window));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [running, setRunning] = useState(null);
  const [notice, setNotice] = useState(null);
  const [visited, setVisited] = useState(() => ({ [cleanTab(initial.tab)]: true }));
  const quietFilters = useDebounced(filters, 250);

  const data = useSonarResearchData({
    enabled,
    sampleViewer,
    filters: quietFilters,
    windowDays,
  });

  useEffect(() => {
    writeAddress({ tab, filters, windowDays });
  }, [tab, filters, windowDays]);

  const setTab = useCallback((t) => {
    setTabState(t);
    setVisited((v) => ({ ...v, [t]: true }));
  }, []);

  const viewer = useMemo(
    () => data.reports.data?.viewer || { userId: null, role: 'analyst', canApprove: false },
    [data.reports.data],
  );
  const kpis = useMemo(
    () =>
      kpisOf({
        rows: data.reports.data?.reports || [],
        viewer,
        budget: data.budget.status === 'ready' ? data.budget.data : null,
        analytics: data.analytics.status === 'ready' ? data.analytics.data : null,
      }),
    [data.reports.data, viewer, data.budget, data.analytics],
  );
  const canManage = Boolean(data.budget.data?.viewer?.canManage);

  const prefill = useMemo(
    () => ({
      mode: initial.question ? 'open' : 'fund_fit',
      company: initial.company && !initial.question ? initial.company : '',
      question: initial.question || '',
      pitchId: initial.pitch || '',
      saveTo: initial.saveTo || '',
    }),
    [initial.question, initial.company, initial.pitch, initial.saveTo],
  );

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>Sonar Research is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading Sonar Research</span>
        )}
      </Notice>
    );
  }
  if (!isOrgUser || data.reports.status === 'forbidden') {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const rLoading = data.reports.status === 'loading';
  const rFailed = !rLoading && data.reports.status !== 'ready';
  const bLoading = data.budget.status === 'loading';
  const bFailed = !bLoading && data.budget.status !== 'ready';
  const aLoading = data.analytics.status === 'loading';
  const aFailed = !aLoading && data.analytics.status !== 'ready';
  const showN = (failed, v) => (failed || v == null ? NA : String(v));

  const toggleSample = () => {
    setNotice(null);
    setRunning(null);
    setSettingsOpen(false);
    data.setShowSample((v) => !v);
  };

  const onTicker = (t) => {
    setFilters((f) => ({ ...f, ticker: t }));
    setTab('reports');
  };

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page osp-page">
      <VisuallyHidden>
        <h1>Sonar Research</h1>
      </VisuallyHidden>

      <div className="tcc-top osp-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip osp-kpistrip" role="list" aria-label="Research figures">
            <Kpi
              icon="bi-inbox"
              label={kpis.reviewer ? 'Awaiting your review' : 'Yours under review'}
              loading={rLoading}
              tone={rFailed ? 'na' : undefined}
              title={
                kpis.reviewer
                  ? 'Reports by other members waiting for a reviewer'
                  : 'Your reports a reviewer has not decided yet'
              }
            >
              {showN(rFailed, kpis.awaiting)}
            </Kpi>
            <Kpi
              icon="bi-pencil-square"
              label="Your drafts"
              loading={rLoading}
              tone={rFailed ? 'na' : kpis.returned ? 'warn' : undefined}
              title="Your drafts, including reports returned to you"
            >
              {showN(rFailed, kpis.drafts)}
              {!rFailed && kpis.returned ? (
                <span className="osp-kpi-sub">{kpis.returned} returned</span>
              ) : null}
            </Kpi>
            <Kpi
              icon="bi-check2-circle"
              label={`Approved, ${windowLabel(windowDays)}`}
              loading={aLoading}
              tone={aFailed ? 'na' : undefined}
              title="Reports saved in the analytics window that have an approved version"
            >
              {showN(aFailed, kpis.approved)}
            </Kpi>
            <Kpi
              icon="bi-wallet2"
              label="Deep runs left"
              loading={bLoading}
              tone={bFailed ? 'na' : kpis.left === 0 ? 'warn' : undefined}
              title="Deep research runs left in the fund's monthly pool"
            >
              {bFailed ? (
                NA
              ) : (
                <>
                  {kpis.left}
                  <span className="osp-kpi-sub">of {kpis.pool}</span>
                </>
              )}
            </Kpi>
            <Kpi
              icon="bi-hourglass-split"
              label="Stale coverage"
              loading={aLoading}
              tone={aFailed ? 'na' : kpis.stale > 0 ? 'warn' : undefined}
              title="Tickers whose latest approved research is older than 120 days"
            >
              {showN(aFailed, kpis.stale)}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions osp-actions">
          {data.sampleActive || data.sampleAvailable ? (
            <div className="tcc-actions__context">
              {data.sampleActive ? <span className="tcc-sample">Sample content</span> : null}
              {data.sampleAvailable ? (
                <button type="button" className="tcc-textbtn" onClick={toggleSample}>
                  {data.sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              ) : null}
            </div>
          ) : null}
          <a href="/sonar" className="tcc-textbtn">
            Open main Sonar
          </a>
          {canManage ? (
            <button type="button" className="tcc-textbtn" onClick={() => setSettingsOpen(true)}>
              Budget settings
            </button>
          ) : null}
          <button type="button" className="tcc-btn" onClick={() => setTab('research')}>
            <i className="bi bi-broadcast" aria-hidden="true" />
            Run deep research
          </button>
        </div>
      </div>

      {notice ? (
        <p className="osp-notice" role="status">
          <i className="bi bi-check2-circle" aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="osp-tabs" role="tablist" aria-label="Sonar Research">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`osp-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`osp-panel-${t.id}`}
            className={`osp-tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'research' && running ? (
              <span className="osp-tabdot tcc-mono" aria-label="A run is open">
                1
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="osp-panel-reports"
        aria-labelledby="osp-tab-reports"
        hidden={tab !== 'reports'}
      >
        {tab === 'reports' ? (
          <ReportsTab
            data={data}
            filters={filters}
            setFilters={setFilters}
            onTab={setTab}
            onSettings={() => setSettingsOpen(true)}
            viewer={viewer}
          />
        ) : null}
      </div>
      {/* Research stays mounted once opened, so a run keeps going while another tab shows. */}
      <div
        role="tabpanel"
        id="osp-panel-research"
        aria-labelledby="osp-tab-research"
        hidden={tab !== 'research'}
      >
        {visited.research ? (
          <ResearchTab
            budgetState={data.budget}
            pitchesState={data.pitches}
            onRetryBudget={data.retry.budget}
            prefill={prefill}
            sampleActive={data.sampleActive}
            running={running}
            setRunning={setRunning}
          />
        ) : null}
      </div>
      <div
        role="tabpanel"
        id="osp-panel-analytics"
        aria-labelledby="osp-tab-analytics"
        hidden={tab !== 'analytics'}
      >
        {tab === 'analytics' ? (
          <AnalyticsTab
            data={data}
            windowDays={windowDays}
            setWindowDays={setWindowDays}
            onTicker={onTicker}
            onStatus={(s) => {
              setFilters((f) => ({ ...f, status: s }));
              setTab('reports');
            }}
            onSettings={() => setSettingsOpen(true)}
          />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="osp-panel-intelligence"
        aria-labelledby="osp-tab-intelligence"
        hidden={tab !== 'intelligence'}
      >
        {tab === 'intelligence' ? <CouncilIntelligenceTab /> : null}
      </div>

      <BudgetSettingsDialog
        open={settingsOpen && canManage}
        budget={data.budget.data}
        sampleActive={data.sampleActive}
        onSave={data.act}
        onClose={(res) => {
          setSettingsOpen(false);
          if (res?.ok)
            setNotice(
              res.sample ? 'Budget saved. Sample content: this is not saved.' : 'Budget saved.',
            );
        }}
      />
    </div>
  );
}
