'use client';

/**
 * Org chart (/org-team-hub/org-chart): the council's structure on one page.
 * It answers three questions: is every sector team staffed and led, is every
 * sector covered by a named member, and does each member hold the right rank.
 * Those answers decide who receives position flags, who votes on pitches and
 * who sees whose work.
 *
 * One layout for every role. What a member can change follows the existing
 * checks: member details and sector coverage need an executive or portfolio
 * manager role (the chart route), a rank change follows the rank rules (the
 * rank route), and inviting is an executive's council setting. The server
 * checks every request again.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { NA, fmtMoney, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import {
  buildStructure,
  changeRows,
  councilCounts,
  coverageMap,
  flagRoutingRows,
  memberName,
  placementOf,
  rankLabel,
  rosterRows,
  scopeNote,
  successionRows,
  teamTableRows,
} from '@/lib/org-chart-model';
import { Skel } from '@/components/org/command-center/parts';
import { useOrgChartData } from './useOrgChartData';
import {
  FlagRouting,
  RecentChanges,
  Roster,
  SectorCoverage,
  Structure,
  Succession,
  TeamsTable,
} from './Sections';
import { MemberPanel } from './MemberPanel';
import { ChangeRankDialog, CoverageDialog } from './Dialogs';
import '@/components/org/command-center/command-center.css';
import './org-chart.css';
import '@/styles/home-canvas.css';

/* Where invitations really happen: the Organization tab of Settings, which
   only executives have. */
const INVITE_HREF = '/settings?tab=organization';

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem">
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`} title={title}>
        {loading ? <Skel w={56} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ooc-page">
      <VisuallyHidden>
        <h1>Org chart</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

export function OrgChart({ initialData = null, sampleViewer = false }) {
  const { isOrgUser, isLoading, isExecutive } = useOrg();
  /* The layout has already checked membership on the server, so a page that
     arrived with data does not wait for the member context to load. */
  const enabled = Boolean(initialData) || Boolean(isOrgUser && !isLoading);
  const data = useOrgChartData({ enabled, initialData, sampleViewer });
  const { resource, retry, sampleActive } = data;
  const chart = resource('chart');
  const summary = resource('summary');

  const [filter, setFilter] = useState('all');
  const [panelId, setPanelId] = useState(null);
  const [rankFor, setRankFor] = useState(null); // { id, back }
  const [coverFor, setCoverFor] = useState(null);
  const [notice, setNotice] = useState(null);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  /* Switching between sample and council data starts the page over. */
  useEffect(() => {
    setPanelId(null);
    setRankFor(null);
    setCoverFor(null);
    setNotice(null);
    setFilter('all');
  }, [sampleActive]);

  const members = useMemo(() => chart.data?.members || [], [chart.data]);
  const teams = chart.data?.teams;
  const viewer = chart.data?.viewer || null;
  const viewerId = viewer?.memberId || null;
  const model = useMemo(() => {
    const structure = buildStructure({ members, teams: teams || [] });
    return {
      structure,
      byId: new Map(members.map((m) => [m.id, m])),
      counts: councilCounts(members, structure),
      coverage: coverageMap(members),
      routing: flagRoutingRows(members, structure),
      succession: successionRows(members),
      changes: changeRows(chart.data?.changes, members),
    };
  }, [members, teams, chart.data?.changes]);
  const { structure, byId, counts } = model;
  const table = useMemo(
    () => teamTableRows(structure, summary.status === 'ready' ? summary.data?.sectors || [] : null),
    [structure, summary],
  );
  const roster = useMemo(
    () => rosterRows(members, structure, filter),
    [members, structure, filter],
  );

  const retryChart = useCallback(() => retry('chart'), [retry]);
  const retrySummary = useCallback(() => retry('summary'), [retry]);
  const openMember = useCallback((id) => {
    setRankFor(null);
    setCoverFor(null);
    setPanelId(id);
  }, []);
  const openRank = useCallback(
    (id) => {
      setRankFor({ id, back: panelId === id });
      setPanelId(null);
    },
    [panelId],
  );
  const closeRank = () => {
    if (rankFor?.back) setPanelId(rankFor.id);
    setRankFor(null);
  };

  const saveRank = async (memberId, tierId) => {
    const target = byId.get(memberId);
    const res = await data.changeRank(memberId, tierId);
    if (!res.ok) return res;
    setNotice({
      tone: 'ok',
      text: `${memberName(target)} is now ${rankLabel(tierId)}.${res.sample ? ' Sample content: not saved.' : ''}`,
    });
    if (rankFor?.back) setPanelId(memberId);
    setRankFor(null);
    return res;
  };
  const saveCoverage = async (bodies) => {
    const res = await data.saveMembers(bodies);
    if (!res.ok) return res;
    setNotice({
      tone: 'ok',
      text: `Coverage for ${coverFor} was updated.${res.sample ? ' Sample content: not saved.' : ''}`,
    });
    setCoverFor(null);
    return res;
  };

  if (!initialData && isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>The org chart is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading the org chart</span>
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

  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  const moneyLoading = summary.status === 'loading';
  const perf = summary.status === 'ready' ? summary.data?.performance || null : null;
  const canManage = Boolean(viewer?.canManage);
  /* In sample content the viewer keeps their own role, so the same check holds. */
  const canInvite = Boolean(isExecutive);
  const count = (v) => (failed ? NA : String(v));
  const teamsMissing = chart.status === 'ready' && teams === null;
  const panelMember = panelId ? byId.get(panelId) || null : null;
  const rankMember = rankFor ? byId.get(rankFor.id) || null : null;

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ooc-page">
      <VisuallyHidden>
        <h1>Org chart</h1>
      </VisuallyHidden>

      {/* Row 1: the council's figures and the page actions */}
      <div className="tcc-top ooc-top">
        <div className="tcc-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip" role="list" aria-label="Council figures">
            <Kpi icon="bi-people" label="Members" loading={loading} tone={failed ? 'na' : ''}>
              {count(counts.members)}
            </Kpi>
            <Kpi
              icon="bi-diagram-3"
              label="Sector teams"
              loading={loading}
              tone={failed ? 'na' : ''}
            >
              {count(counts.teams)}
            </Kpi>
            <Kpi
              icon="bi-star"
              label="Leadership"
              loading={loading}
              tone={failed ? 'na' : ''}
              title="Members in the executive group"
            >
              {count(counts.leadership)}
            </Kpi>
            <Kpi
              icon="bi-check2-square"
              label="IC voters"
              loading={loading}
              tone={failed ? 'na' : ''}
              title="Investment committee: executives and portfolio managers vote on pitches"
            >
              {count(counts.committee)}
            </Kpi>
            <Kpi
              icon={counts.noSectorHead > 0 ? 'bi-exclamation-triangle' : 'bi-person-check'}
              label="No sector head"
              loading={loading}
              tone={failed ? 'na' : counts.noSectorHead > 0 ? 'warn' : ''}
              title="Sector teams with no portfolio manager. Flags on their holdings have no sector head to go to"
            >
              {failed ? NA : `${counts.noSectorHead} of ${counts.teams}`}
            </Kpi>
            <Kpi
              icon="bi-grid-3x3-gap"
              label="Sectors covered"
              loading={loading}
              tone={failed ? 'na' : ''}
              title="Standard market sectors with at least one covering member"
            >
              {failed ? NA : `${counts.sectorsCovered} of ${counts.sectorCount}`}
            </Kpi>
            <Kpi
              icon="bi-wallet2"
              label="Fund value"
              loading={moneyLoading}
              tone={perf?.total_value == null ? 'na' : ''}
              title="The fund book at the last close on file"
            >
              {fmtMoney(perf?.total_value)}
            </Kpi>
            <Kpi
              icon="bi-graph-up-arrow"
              label="Fund return"
              loading={moneyLoading}
              tone={toneOf(perf?.return_pct)}
              title="Gain on cost of the holdings"
            >
              {fmtSignedPct(perf?.return_pct)}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions">
          {(sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {sampleActive && <span className="tcc-sample">Sample content</span>}
              <button
                type="button"
                className="tcc-textbtn ooc-inline"
                onClick={() => data.setShowSample((v) => !v)}
              >
                {sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            </div>
          )}
          {canInvite && (
            <Link href={INVITE_HREF} className="tcc-btn ooc-invite">
              <i className="bi bi-person-plus" aria-hidden="true" />
              Invite members
            </Link>
          )}
        </div>
      </div>

      {(notice || teamsMissing) && (
        <div className="ooc-notes">
          {notice && (
            <p className="ooc-ok" role="status">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>{notice.text}</span>
              <button
                type="button"
                className="tcc-textbtn ooc-inline"
                onClick={() => setNotice(null)}
              >
                Dismiss
              </button>
            </p>
          )}
          {teamsMissing && (
            <p className="tcc-state tcc-state--error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>Could not load sector teams, so members are listed without them.</span>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent ooc-inline"
                onClick={retryChart}
              >
                Retry
              </button>
            </p>
          )}
        </div>
      )}

      {/* Row 2 */}
      <div className="tcc-row ooc-row--tree">
        <Structure
          chart={chart}
          structure={structure}
          byId={byId}
          viewerId={viewerId}
          note={scopeNote(viewer, members)}
          onOpen={openMember}
          onRetry={retryChart}
          inviteHref={canInvite ? INVITE_HREF : null}
        />
        <span className="tcc-vrule" aria-hidden="true" />
        <SectorCoverage
          chart={chart}
          coverage={model.coverage}
          counts={counts}
          canManage={canManage}
          onAssign={setCoverFor}
          onOpen={openMember}
          onRetry={retryChart}
        />
      </div>

      {/* Row 3 */}
      <div className="tcc-row tcc-row--wide">
        <TeamsTable
          chart={chart}
          summary={summary}
          table={table}
          structure={structure}
          onOpen={openMember}
          onRetry={retryChart}
          onRetrySummary={retrySummary}
          settingsHref={canInvite ? INVITE_HREF : null}
        />
        <span className="tcc-vrule" aria-hidden="true" />
        <FlagRouting chart={chart} rows={model.routing} onOpen={openMember} onRetry={retryChart} />
      </div>

      {/* Row 4 */}
      <div className="tcc-row tcc-row--single">
        <Roster
          chart={chart}
          rows={roster}
          total={members.length}
          filter={filter}
          setFilter={setFilter}
          viewerId={viewerId}
          onOpen={openMember}
          onRank={openRank}
          onRetry={retryChart}
          inviteHref={canInvite ? INVITE_HREF : null}
        />
      </div>

      {/* Row 5 */}
      <div className="tcc-row tcc-row--narrow">
        <Succession
          chart={chart}
          rows={model.succession}
          canManage={canManage}
          onOpen={openMember}
          onRetry={retryChart}
        />
        <span className="tcc-vrule" aria-hidden="true" />
        <RecentChanges
          chart={chart}
          rows={model.changes}
          logFailed={chart.status === 'ready' && chart.data?.changes === null}
          onRetry={retryChart}
        />
      </div>

      <MemberPanel
        member={panelMember}
        members={members}
        teamLabel={panelMember ? placementOf(panelMember, structure).label : ''}
        viewer={viewer}
        sampleActive={sampleActive}
        sampleScorecard={panelMember ? data.sampleScorecard(panelMember.id) : undefined}
        sampleBadges={panelMember ? data.sampleBadges(panelMember.id) : undefined}
        onOpen={openMember}
        onRank={openRank}
        onSave={data.saveMembers}
        onClose={() => setPanelId(null)}
      />
      <ChangeRankDialog
        member={rankMember}
        viewer={viewer}
        sampleActive={sampleActive}
        onSave={saveRank}
        onClose={closeRank}
      />
      <CoverageDialog
        sector={coverFor}
        members={members}
        sampleActive={sampleActive}
        onSave={saveCoverage}
        onClose={() => setCoverFor(null)}
      />
    </div>
  );
}

export default OrgChart;
