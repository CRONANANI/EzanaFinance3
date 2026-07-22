'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CalendarDays, List, Plus } from 'lucide-react';
import './assignments2.css';
import { AssignmentMetricsStrip } from './AssignmentMetricsStrip';
import { AssignmentCalendar } from './AssignmentCalendar';
import { AssignmentTabs } from './AssignmentTabs';
import { AssignmentExport } from './AssignmentExport';

/* AssignmentDrawer (drawerOpen) and AssignmentReviewModal (reviewId) only mount
   on interaction — defer their code until opened. Overlays: null fallback safe. */
const AssignmentDrawer = dynamic(
  () => import('./AssignmentDrawer').then((m) => ({ default: m.AssignmentDrawer })),
  { loading: () => null },
);
const AssignmentReviewModal = dynamic(
  () => import('./AssignmentReviewModal').then((m) => ({ default: m.AssignmentReviewModal })),
  { loading: () => null },
);

const emptyData = {
  orgName: 'Organization',
  assignments: [],
  metrics: {},
  tab_counts: {},
  roster: [],
  teams: [],
  cohorts: [],
  roles: [],
  templates: [],
  viewer: { canAssign: false, userId: null },
};

/* Orchestrator for the Assignments 2a surface (calendar + tabbed list).
   `initialData` (optional) is the server-rendered payload from
   GET /api/org/assignments; when present we seed state and skip the mount
   fetch. When absent (non-member / SSR unavailable) the client fetch below
   runs unchanged as the authoritative fallback. */
export function AssignmentBoard({ initialData = null }) {
  const [data, setData] = useState(initialData ? { ...emptyData, ...initialData } : emptyData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [view, setView] = useState('calendar'); // 2a: calendar active by default
  const [tab, setTab] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewId, setReviewId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/assignments', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load assignments.');
        return;
      }
      setData({ ...emptyData, ...json });
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Seeded from the server → skip the initial fetch. `load` is still used by
    // the drawer/review-modal refresh callbacks below.
    if (initialData) return;
    load();
  }, [initialData, load]);

  const { viewer } = data;

  if (loading) {
    return (
      <div className="asg2-root">
        <div className="asg2-metrics">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="asg2-skel" style={{ height: 80 }} />
          ))}
        </div>
        <div className="asg2-skel" style={{ height: 320 }} />
      </div>
    );
  }
  if (error) return <div className="asg2-root asg2-state asg2-error">{error}</div>;

  return (
    <div className="asg2-root">
      <div className="asg2-header">
        <div>
          <p className="asg2-eyebrow">Academic · {data.orgName}</p>
          <h1 className="asg2-title">Assignments</h1>
        </div>
        <div className="asg2-header-actions">
          <div className="asg2-seg" role="group" aria-label="View">
            <button
              type="button"
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              <List size={14} aria-hidden="true" /> List
            </button>
            <button
              type="button"
              className={view === 'calendar' ? 'is-active' : ''}
              onClick={() => setView('calendar')}
              aria-pressed={view === 'calendar'}
            >
              <CalendarDays size={14} aria-hidden="true" /> Calendar
            </button>
          </div>
          <AssignmentExport assignments={data.assignments} />
          {viewer.canAssign && (
            <button
              type="button"
              className="asg2-btn asg2-btn--primary"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus size={15} aria-hidden="true" /> New assignment
            </button>
          )}
        </div>
      </div>

      {data.scope_label && <p className="asg2-scope-note">{data.scope_label}</p>}

      <AssignmentMetricsStrip metrics={data.metrics} />

      {view === 'calendar' ? (
        <div className="asg2-body">
          <AssignmentCalendar assignments={data.assignments} onOpen={(a) => setReviewId(a.id)} />
          <AssignmentTabs
            assignments={data.assignments}
            activeTab={tab}
            onTab={setTab}
            viewer={viewer}
            onOpen={(a) => setReviewId(a.id)}
            variant="compact"
          />
        </div>
      ) : (
        <AssignmentTabs
          assignments={data.assignments}
          activeTab={tab}
          onTab={setTab}
          viewer={viewer}
          onOpen={(a) => setReviewId(a.id)}
          variant="full"
        />
      )}

      {drawerOpen && (
        <AssignmentDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onCreated={load}
          roster={data.roster}
          teams={data.teams}
          cohorts={data.cohorts}
          roles={data.roles}
          templates={data.templates}
          viewer={viewer}
        />
      )}

      {reviewId && (
        <AssignmentReviewModal
          assignmentId={reviewId}
          onClose={() => setReviewId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
