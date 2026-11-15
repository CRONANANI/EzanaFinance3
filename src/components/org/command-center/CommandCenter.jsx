'use client';

/**
 * Command Center: the Team Hub home (/org-team-hub).
 *
 * One layout for every role, built from the same sections. What a member sees
 * follows the existing permission checks: fund data health needs analytics
 * access, the breach figures and the New task button need a manager role, and
 * the attention list is scoped to the member's role. The server checks every
 * request again.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Dropdown, MenuItem, VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { useCommandCenterData } from './useCommandCenterData';
import { FundPerformance } from './FundPerformance';
import { AttentionList } from './AttentionList';
import { NewTaskDialog } from './NewTaskDialog';
import {
  CouncilSnapshot,
  FundDataHealth,
  KpiStrips,
  SectorTeams,
  SetupChecklist,
  SevenDayDigest,
  UpcomingDates,
} from './Sections';
import './command-center.css';
import '@/styles/home-canvas.css';

/** Council switcher: only for members of two or more councils. Choosing one
 *  reloads the app against that council. */
function CouncilSwitcher() {
  const { memberships, switchOrg } = useOrg();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!Array.isArray(memberships) || memberships.length < 2) return null;
  const current = memberships.find((m) => m.current) || memberships[0];

  const choose = async (orgId) => {
    if (!orgId || orgId === current.orgId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await switchOrg(orgId);
    } catch {
      setError('Could not switch organization. Try again.');
      setBusy(false);
    }
  };

  return (
    <span className="tcc-switch">
      <Dropdown
        align="right"
        trigger={
          <span className="tcc-textbtn tcc-switch__trigger" aria-busy={busy || undefined}>
            <VisuallyHidden>Organization: </VisuallyHidden>
            {current.name}
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </span>
        }
      >
        {memberships.map((m) => (
          <MenuItem
            key={m.orgId}
            icon={m.orgId === current.orgId ? 'bi-check-lg' : 'bi-building'}
            aria-current={m.orgId === current.orgId ? 'true' : undefined}
            onClick={() => choose(m.orgId)}
          >
            {m.name}
          </MenuItem>
        ))}
      </Dropdown>
      {error && (
        <span className="tcc-switch__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function CommandCenter() {
  const { isOrgUser, orgRole, orgData, isLoading, canManage, hasPermission } = useOrg();
  const member = orgData?.member || null;
  const canSeeHealth = orgRole === 'executive' || hasPermission('view_analytics');

  const data = useCommandCenterData({
    enabled: Boolean(isOrgUser && !isLoading),
    wantHealth: canSeeHealth,
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  /* Never leave a member on a silent wait: after 10 seconds, say so and
     offer a retry. */
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const { resource, retry, loadRoster } = data;
  const summary = resource('summary');
  const tasks = resource('tasks');
  const meetings = resource('meetings');
  const assignments = resource('assignments');
  const digest = resource('digest');
  const setup = resource('setup');
  const health = resource('health');

  const retrySummary = useCallback(() => retry('summary'), [retry]);
  const retryDates = useCallback(() => retry('tasks', 'meetings', 'assignments'), [retry]);

  if (isLoading) {
    return (
      <div className="dashboard-page-inset ez-canvas tcc-page">
        <p className="tcc-state" role="status">
          {slow ? (
            <>
              <span>Team Hub is taking longer than expected to load.</span>
              <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
                Retry
              </button>
            </>
          ) : (
            <span>Loading Team Hub</span>
          )}
        </p>
      </div>
    );
  }
  if (!isOrgUser) {
    return (
      <div className="dashboard-page-inset ez-canvas tcc-page">
        <p className="tcc-state">
          <span>This page is for members of an investment council.</span>
          <Link href="/home" className="tcc-link">
            Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </p>
      </div>
    );
  }

  const cohort = summary.data?.statStrip?.cohort || null;
  const setupDone = setup.status === 'ready' && setup.data?.complete;
  const showSetup = !setupDone;
  const showHealth = canSeeHealth && health.status !== 'forbidden';
  const viewerId = tasks.data?.viewer?.userId || member?.user_id || null;
  const mayCreate = canManage && (tasks.data?.viewer?.canManage ?? true);

  const snapshot = <CouncilSnapshot summary={summary} role={orgRole} onRetry={retrySummary} />;

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page">
      <VisuallyHidden>
        <h1>Command Center</h1>
      </VisuallyHidden>

      {/* Row 1: KPI strips and the page actions */}
      <div className="tcc-top">
        <KpiStrips
          summary={summary}
          tasks={tasks}
          meetings={meetings}
          assignments={assignments}
          showBreaches={canManage}
        />
        <div className="tcc-actions">
          <div className="tcc-actions__context">
            {cohort && <span className="tcc-cohort">{cohort}</span>}
            {data.sampleActive && <span className="tcc-sample">Sample content</span>}
            {data.sampleAvailable && (
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() => data.setShowSample((v) => !v)}
              >
                {data.sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            )}
          </div>
          <CouncilSwitcher />
          <Link href="/org-team-hub/meetings" className="tcc-link">
            Fund calendar
          </Link>
          {mayCreate && (
            <button type="button" className="tcc-btn" onClick={() => setDialogOpen(true)}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New task
            </button>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="tcc-row tcc-row--wide">
        <FundPerformance summary={summary} onRetry={retrySummary} />
        <span className="tcc-vrule" aria-hidden="true" />
        <AttentionList
          role={orgRole}
          userId={viewerId}
          teamId={member?.team_id || null}
          canManage={canManage}
          tasks={tasks}
          assignments={assignments}
          meetings={meetings}
          summary={summary}
          onRetry={() => retry('tasks')}
          onStatusChange={data.changeTaskStatus}
          taskError={data.taskError}
          onDismissError={data.clearTaskError}
        />
      </div>

      {/* Row 3 */}
      <div className="tcc-row tcc-row--wide">
        <UpcomingDates
          summary={summary}
          tasks={tasks}
          meetings={meetings}
          assignments={assignments}
          onRetry={retryDates}
        />
        <span className="tcc-vrule" aria-hidden="true" />
        <SevenDayDigest digest={digest} onRetry={() => retry('digest')} />
      </div>

      {/* Row 4: the checklist leaves once every step is done, and the council
          snapshot takes its place. */}
      <div className="tcc-row tcc-row--wide">
        <SectorTeams summary={summary} onRetry={retrySummary} />
        <span className="tcc-vrule" aria-hidden="true" />
        {showSetup ? (
          <SetupChecklist setup={setup} canAct={canManage} onRetry={() => retry('setup')} />
        ) : (
          snapshot
        )}
      </div>

      {/* Row 5 */}
      {showHealth && showSetup && (
        <div className="tcc-row tcc-row--narrow">
          <FundDataHealth health={health} onRetry={() => retry('health')} />
          <span className="tcc-vrule" aria-hidden="true" />
          {snapshot}
        </div>
      )}
      {showHealth && !showSetup && (
        <div className="tcc-row tcc-row--single">
          <FundDataHealth health={health} onRetry={() => retry('health')} />
        </div>
      )}
      {!showHealth && showSetup && <div className="tcc-row tcc-row--single">{snapshot}</div>}

      {mayCreate && (
        <NewTaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreate={data.createTask}
          roster={data.roster}
          onLoadRoster={loadRoster}
          viewerId={viewerId}
          sample={data.sampleActive}
        />
      )}
    </div>
  );
}

export default CommandCenter;
