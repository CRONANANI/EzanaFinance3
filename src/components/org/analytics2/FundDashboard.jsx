'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { PeriodSelector } from './PeriodSelector';
import { SinceLastMeetingStrip } from './SinceLastMeetingStrip';
import { PerformanceCard } from './PerformanceCard';
import { AnalystLeaderboard } from './AnalystLeaderboard';
import { ContributorsDetractors } from './ContributorsDetractors';
import { ConcentrationBanner } from './ConcentrationBanner';
import { InsightCallout, composeInsight } from './InsightCallout';
import { SectorVsTarget } from './SectorVsTarget';
import { PitchFunnel } from './PitchFunnel';
import { CoverageGaps } from './CoverageGaps';
import { CashTile } from './CashTile';
import { AttributionByPitch } from './AttributionByPitch';
import { AnalystScorecard } from './AnalystScorecard';
import './analytics.css';

function Skeleton() {
  return (
    <div className="an4-root">
      <div className="fa-headrow">
        <div>
          <div className="fa-skel" style={{ width: 180, height: 12, marginBottom: 8 }} />
          <div className="fa-skel" style={{ width: 220, height: 26 }} />
        </div>
        <div className="fa-skel" style={{ width: 260, height: 34, borderRadius: 9999 }} />
      </div>
      <div className="fa-skel" style={{ width: '100%', height: 58, marginBottom: 16 }} />
      <div className="fa-grid">
        <div className="fa-col">
          <div className="fa-skel" style={{ height: 250 }} />
          <div className="fa-skel" style={{ height: 220 }} />
        </div>
        <div className="fa-col">
          <div className="fa-skel" style={{ height: 64 }} />
          <div className="fa-skel" style={{ height: 150 }} />
          <div className="fa-skel" style={{ height: 120 }} />
        </div>
      </div>
    </div>
  );
}

export function FundDashboard({ initialData = null }) {
  const router = useRouter();
  const { fundName, universityName } = useOrg();
  const [period, setPeriod] = useState('semester');
  // Seed from the server-rendered payload (default period 'semester') so first
  // paint has data; the client fetch below stays the authoritative refetch path.
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState('');
  const [scorecardFor, setScorecardFor] = useState(null);
  const [exporting, setExporting] = useState(false);
  // When seeded, skip exactly the initial mount fetch; period changes still refetch.
  const skipInitialFetch = useRef(!!initialData);

  const load = useCallback(async (p, isRefetch) => {
    if (isRefetch) setRefetching(true);
    try {
      const res = await fetch(`/api/org/analytics/fund?period=${p}`, { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load analytics.');
        return;
      }
      setData(json);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    load(period, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPeriod = (p) => {
    setPeriod(p);
    load(p, true);
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/org/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_label: `Fund Analytics · ${period}` }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.report?.id) {
        window.open(`/api/org/reports/${json.report.id}/pdf`, '_blank', 'noopener');
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Skeleton />;
  if (error) return <div className="an4-state an4-error">{error}</div>;

  const eyebrow = `Analytics · ${fundName || universityName || 'Fund'}`;
  const latest = data.seriesLatest;
  const insight = composeInsight(latest, data.concentration);
  const canReport = !!data.viewer?.canReport;

  return (
    <div
      className="an4-root"
      style={refetching ? { opacity: 0.6, transition: 'opacity 0.15s' } : undefined}
    >
      {/* Header */}
      <div className="fa-headrow">
        <div>
          <p className="an4-eyebrow" style={{ margin: 0 }}>
            {eyebrow}
          </p>
          <h1 className="an4-title">Fund Analytics</h1>
        </div>
        <div className="fa-head-actions">
          <PeriodSelector value={period} onChange={onPeriod} disabled={refetching} />
          {canReport && (
            <button type="button" className="an4-btn" onClick={onExport} disabled={exporting}>
              <Download size={15} aria-hidden /> {exporting ? 'Exporting…' : 'Export'}
            </button>
          )}
        </div>
      </div>

      <SinceLastMeetingStrip data={data.sinceLastMeeting} />

      <div className="fa-grid">
        {/* LEFT — focal */}
        <div className="fa-col">
          <PerformanceCard latest={latest} series={data.series} />
          <AnalystLeaderboard data={data.analystLeaderboard} onSelect={setScorecardFor} />
          <ContributorsDetractors data={data.contributors} />
        </div>

        {/* RIGHT — risk & pipeline */}
        <div className="fa-col">
          <ConcentrationBanner data={data.concentration} />
          {insight && <InsightCallout variant={insight.variant}>{insight.text}</InsightCallout>}
          <SectorVsTarget data={data.sectorVsTarget} />
          <PitchFunnel data={data.pipeline} />
          <CoverageGaps
            data={data.pipeline?.coverage_gaps}
            onAssign={() => router.push('/org-team-hub/org-chart')}
          />
          <CashTile cash={data.cash} />
        </div>
      </div>

      {/* Detail — pitch outcomes, now with real names / Unassigned */}
      <div className="fa-card fa-card-pad" style={{ marginTop: '1rem' }}>
        <h3 className="fa-card-t" style={{ marginBottom: '0.6rem' }}>
          Pitch outcomes
        </h3>
        <AttributionByPitch data={data.attribution?.byPitch || []} />
      </div>

      {scorecardFor && (
        <div
          className="ac3-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg-overlay, rgba(0,0,0,0.6))',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '5vh 1rem',
            overflowY: 'auto',
          }}
          onClick={(e) => e.target === e.currentTarget && setScorecardFor(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: 'var(--bg-secondary, #0d1218)',
              border: '1px solid var(--border-primary)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
              <button type="button" className="an4-btn" onClick={() => setScorecardFor(null)}>
                Close
              </button>
            </div>
            <AnalystScorecard memberId={scorecardFor} embedded />
          </div>
        </div>
      )}
    </div>
  );
}
