'use client';

/**
 * Fund Analytics (/org-team-hub/fund-analytics): the council's performance
 * and accountability page. It answers four questions: is the fund ahead of
 * its benchmark, which sectors are over the policy cap, which holdings are
 * helping or hurting, and whose pitches are working.
 *
 * One layout for every role. What a member sees follows the existing checks:
 * exporting a report needs an executive or portfolio manager role, the team
 * attention map and fund data health need analytics access, and a scorecard
 * follows the council's privacy setting. The server checks every request
 * again.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  NA,
  benchmarkInfo,
  fmtDate,
  fmtMoney,
  fmtSignedPct,
  toneOf,
} from '@/lib/org-command-center';
import {
  FUND_PERIODS,
  composeInsight,
  coverageNote,
  headlineOf,
  periodLabel,
} from '@/lib/org-fund-analytics-model';
import { Skel, TextToggle } from '@/components/org/command-center/parts';
import { FundDataHealth } from '@/components/org/command-center/Sections';
import { useFundAnalyticsData } from './useFundAnalyticsData';
import { Performance } from './Performance';
import { ScorecardDialog } from './ScorecardDialog';
import {
  AttentionMap,
  CouncilStanding,
  CoverageGaps,
  HoldingAttribution,
  Leaderboard,
  PitchFunnel,
  PitchOutcomes,
  SectorTable,
  SinceLastMeeting,
} from './Sections';
import '@/components/org/command-center/command-center.css';
import './fund-analytics.css';
import '@/styles/home-canvas.css';

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem">
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`} title={title}>
        {loading ? <Skel w={64} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ofa-page">
      <VisuallyHidden>
        <h1>Fund Analytics</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

export function FundAnalytics({ initialData = null, sampleViewer = false }) {
  const { isOrgUser, orgRole, isLoading, hasPermission, fundName, universityName } = useOrg();
  const canSeeHealth = orgRole === 'executive' || Boolean(hasPermission?.('view_analytics'));
  /* The layout has already checked membership on the server, so a page that
     arrived with data does not wait for the member context to load. */
  const enabled = Boolean(initialData) || Boolean(isOrgUser && !isLoading);

  const data = useFundAnalyticsData({
    enabled,
    initialData,
    sampleViewer,
    wantHealth: canSeeHealth,
  });
  const { period, resource, retry, sampleActive } = data;
  const fund = resource('fund');
  const attention = resource('attention');
  const health = resource('health');
  const standing = resource('standing');

  const [scoreFor, setScoreFor] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  /* Switching between sample and council data starts the page over. */
  useEffect(() => {
    setScoreFor(null);
    setNotice(null);
  }, [sampleActive]);

  const retryFund = useCallback(() => retry('fund'), [retry]);

  const d = fund.data;
  const headline = headlineOf(d);
  const bench = benchmarkInfo(d?.performance);
  const rangeText =
    headline.source === 'records' ? `${fmtDate(headline.start)} to ${fmtDate(headline.end)}` : null;

  const onExport = async () => {
    if (exporting) return;
    if (sampleActive) {
      setNotice({
        tone: 'info',
        text: 'Export is off while sample content shows. Switch to council data to save a report.',
      });
      return;
    }
    setExporting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/org/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_label: rangeText
            ? `Fund Analytics, ${periodLabel(period)} (${rangeText})`
            : `Fund Analytics, ${periodLabel(period)}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.report?.id) throw new Error('export failed');
      const href = `/api/org/reports/${json.report.id}/pdf`;
      window.open(href, '_blank', 'noopener');
      setNotice({
        tone: 'ok',
        text: 'The report was saved and a printable version opened in a new tab.',
        href,
      });
    } catch {
      setNotice({
        tone: 'error',
        text: 'Could not save the report. Nothing was exported.',
      });
    } finally {
      setExporting(false);
    }
  };

  if (!initialData && isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>Fund Analytics is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading Fund Analytics</span>
        )}
      </Notice>
    );
  }
  if (!initialData && !isOrgUser) {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const loading = fund.status === 'loading';
  const failed = fund.status === 'error';
  const canReport = Boolean(d?.viewer?.canReport);
  const conc = d?.concentration || null;
  const hasCap = conc?.source === 'ips';
  const holdings = d?.holdingsCount ?? d?.performance?.positions ?? null;
  const insight =
    fund.status === 'ready' && !fund.refreshing
      ? composeInsight({ headline, concentration: conc, benchLabel: bench.label })
      : null;
  const note = fund.status === 'ready' && !fund.refreshing ? coverageNote(headline, period) : null;
  const showHealth = canSeeHealth && health.status !== 'forbidden';
  const name = sampleActive ? data.sampleFundName : fundName || universityName || null;
  const kpiBusy = loading || Boolean(fund.refreshing);

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ofa-page">
      <VisuallyHidden>
        <h1>Fund Analytics</h1>
      </VisuallyHidden>

      {/* Row 1: the headline figures (each appears once, here) and the page actions */}
      <div className="tcc-top ofa-top">
        <div className="tcc-kpis" aria-busy={kpiBusy || undefined}>
          <div
            className={`tcc-kpistrip ofa-kpistrip${fund.refreshing ? ' ofa-refreshing' : ''}`}
            role="list"
            aria-label="Fund figures"
          >
            <Kpi
              icon="bi-wallet2"
              label="Fund value"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="The latest daily fund record"
            >
              {fmtMoney(headline.fundValue)}
            </Kpi>
            <Kpi
              icon="bi-graph-up-arrow"
              label="Return"
              loading={loading}
              tone={toneOf(headline.returnPct)}
              title={
                headline.rebased
                  ? 'Change in the return on cost over the period, in points'
                  : 'Gain on cost of the holdings'
              }
            >
              {fmtSignedPct(headline.returnPct)}
            </Kpi>
            <Kpi
              icon="bi-bar-chart-line"
              label={bench.estimated ? 'Pitch benchmark (est.)' : 'Benchmark'}
              loading={loading}
              title={loading ? undefined : bench.sourceText}
            >
              {bench.estimated || bench.label === NA ? null : (
                <span className="tcc-kpi__sym">{bench.label}</span>
              )}
              {headline.benchmarkPct != null ? (
                <span className={`tcc-${toneOf(headline.benchmarkPct)}`}>
                  {fmtSignedPct(headline.benchmarkPct)}
                </span>
              ) : (
                <span className="tcc-na">{NA}</span>
              )}
            </Kpi>
            <Kpi
              icon="bi-plus-slash-minus"
              label="Alpha"
              loading={loading}
              tone={toneOf(headline.alphaPct)}
              title="Fund return less benchmark return, in points"
            >
              {fmtSignedPct(headline.alphaPct)}
            </Kpi>
            <Kpi
              icon="bi-collection"
              label="Holdings"
              loading={loading}
              tone={holdings == null ? 'na' : undefined}
              title="Positions the fund holds today"
            >
              {holdings == null ? NA : String(holdings)}
            </Kpi>
            <Kpi
              icon={hasCap && conc.breach ? 'bi-exclamation-triangle' : 'bi-shield-check'}
              label="Sectors over cap"
              loading={loading}
              tone={!hasCap ? 'na' : conc.breach ? 'warn' : undefined}
              title={
                hasCap
                  ? `Sectors above the council's ${Number(conc.limit_pct).toFixed(2)}% sector cap`
                  : 'The council has no sector cap rule'
              }
            >
              {hasCap && conc.sector_count != null
                ? `${conc.over_count ?? 0} of ${conc.sector_count}`
                : NA}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions ofa-actions">
          <div className="tcc-actions__context">
            {name && <span className="tcc-cohort">{name}</span>}
            {sampleActive && <span className="tcc-sample">Sample content</span>}
            {data.sampleAvailable && (
              <button
                type="button"
                className="tcc-textbtn ofa-action"
                onClick={() => data.setShowSample((v) => !v)}
              >
                {sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            )}
          </div>
          <div className="ofa-period">
            <div className="tcc-toggles" role="group" aria-label="Period">
              {FUND_PERIODS.map((p) => (
                <TextToggle
                  key={p.value}
                  mono
                  pressed={period === p.value}
                  onClick={() => data.choosePeriod(p.value)}
                >
                  <span aria-hidden="true">{p.code}</span>
                  <span className="tcc-sr">{p.label}</span>
                </TextToggle>
              ))}
            </div>
            <span className="ofa-range tcc-mono" aria-live="polite">
              {loading ? (
                <Skel w={168} h={11} />
              ) : failed ? (
                ''
              ) : (
                rangeText || 'No daily records yet'
              )}
            </span>
          </div>
          {canReport && (
            <button
              type="button"
              className="tcc-textbtn ofa-action"
              onClick={onExport}
              disabled={exporting}
              title="Saves a stakeholder report to Reports and opens a printable version in a new tab"
            >
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              {exporting ? 'Saving report' : 'Save and open report'}
            </button>
          )}
        </div>
      </div>

      {(insight || note || notice) && (
        <div className="ofa-notes">
          {notice && (
            <p
              className={`ofa-notice${notice.tone === 'error' ? ' ofa-notice--error' : ''}`}
              role={notice.tone === 'error' ? 'alert' : 'status'}
            >
              <i
                className={`bi ${notice.tone === 'error' ? 'bi-exclamation-circle' : notice.tone === 'ok' ? 'bi-check2-circle' : 'bi-info-circle'}`}
                aria-hidden="true"
              />
              <span>{notice.text}</span>
              {notice.href && (
                <a
                  className="tcc-link"
                  href={notice.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open printable version
                </a>
              )}
              {notice.tone === 'ok' && (
                <Link href="/org-team-hub/reports" className="tcc-link">
                  Open reports <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              )}
              <button
                type="button"
                className="tcc-textbtn ofa-action"
                onClick={() => setNotice(null)}
              >
                Dismiss
              </button>
            </p>
          )}
          {insight && (
            <p className={`ofa-insight${insight.tone === 'warning' ? ' ofa-insight--warn' : ''}`}>
              <i
                className={`bi ${insight.tone === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'}`}
                aria-hidden="true"
              />
              <span>{insight.text}</span>
            </p>
          )}
          {note && <p className="ofa-note">{note}</p>}
        </div>
      )}

      {/* Row 2 */}
      <div className="tcc-row tcc-row--wide">
        <Performance
          fund={fund}
          bench={bench}
          headline={headline}
          rangeText={rangeText}
          onRetry={retryFund}
        />
        <span className="tcc-vrule" aria-hidden="true" />
        <SectorTable fund={fund} onRetry={retryFund} />
      </div>

      {/* Row 3 */}
      <div className="tcc-row ofa-row--board">
        <Leaderboard fund={fund} onOpen={setScoreFor} onRetry={retryFund} />
        <span className="tcc-vrule" aria-hidden="true" />
        <div className="ofa-stack">
          <CoverageGaps fund={fund} onRetry={retryFund} />
          <span className="ofa-hrule" aria-hidden="true" />
          <PitchFunnel fund={fund} onRetry={retryFund} />
        </div>
      </div>

      {/* Row 4 */}
      <div className="tcc-row tcc-row--single">
        <HoldingAttribution fund={fund} onRetry={retryFund} />
      </div>

      {/* Row 5 */}
      <div className="tcc-row tcc-row--single">
        <PitchOutcomes fund={fund} onRetry={retryFund} />
      </div>

      {/* Row 6: executives and permitted managers only (it hides itself otherwise) */}
      <AttentionMap attention={attention} onRetry={() => retry('attention')} />

      {/* Row 7 */}
      <div className={`tcc-row ofa-row--${showHealth ? 'three' : 'two'}`}>
        <CouncilStanding standing={standing} onRetry={() => retry('standing')} />
        <span className="tcc-vrule" aria-hidden="true" />
        {showHealth && (
          <>
            <FundDataHealth health={health} onRetry={() => retry('health')} />
            <span className="tcc-vrule" aria-hidden="true" />
          </>
        )}
        <SinceLastMeeting fund={fund} onRetry={retryFund} />
      </div>

      <ScorecardDialog
        member={scoreFor}
        sample={scoreFor ? data.sampleScorecard(scoreFor.member_id) : undefined}
        onClose={() => setScoreFor(null)}
      />
    </div>
  );
}

export default FundAnalytics;
