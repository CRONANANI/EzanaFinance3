'use client';

/**
 * Assignments (/org-team-hub/assignments): where a council hands out work
 * and follows it to a grade. An analyst sees what they owe and by when. A
 * portfolio manager, executive or faculty advisor sees who is behind, what
 * waits for review and what each piece of work scored.
 *
 * One layout for every role. What a member sees and can do follows the
 * existing rules: only executives and portfolio managers assign, review,
 * return, approve and grade; everyone a piece of work was given to (by name,
 * team, cohort, role or the whole council) can start and submit it. The
 * server checks every request again.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  NA,
  TAB_KEYS,
  filterByTab,
  fmtPoints,
  fmtRate,
  searchAssignments,
  todayOf,
} from '@/lib/org-assignments-model';
import { Skel, TextToggle } from '@/components/org/command-center/parts';
import { useAssignmentsData } from './useAssignmentsData';
import { AssignmentList } from './AssignmentList';
import { FullCalendar } from './Calendars';
import { SideColumn } from './SideColumn';
import { Workload } from './Workload';
import { ExportMenu } from './ExportMenu';
import { AssignmentDetail } from './AssignmentDetail';
import { NewAssignmentDialog } from './NewAssignmentDialog';
import '@/components/org/command-center/command-center.css';
import './assignments.css';
import '@/styles/home-canvas.css';

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon${tone ? ` tcc-${tone}` : ''}`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`}>
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page oas-page">
      <VisuallyHidden>
        <h1>Assignments</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

const cleanTab = (t) => (TAB_KEYS.includes(t) ? t : 'all');
const cleanView = (v) => (v === 'calendar' ? 'calendar' : 'list');

/** Keep view, tab and the open assignment in the page address, so one can be linked. */
function writeAddress({ view, tab, openId }) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('view', view === 'calendar' ? 'calendar' : null);
  set('tab', tab === 'all' ? null : tab);
  set('a', openId || null);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

export function AssignmentsPage({
  initialData = null,
  sampleViewer = false,
  initialView = 'list',
  initialTab = 'all',
  initialOpen = null,
}) {
  const { isOrgUser, isLoading } = useOrg();
  /* The layout has already checked membership on the server, so a page that
     arrived with data does not wait for the member context to load. */
  const enabled = Boolean(initialData) || Boolean(isOrgUser && !isLoading);
  const data = useAssignmentsData({ enabled, initialData, sampleViewer });
  const { board, sampleActive, act } = data;

  const [view, setView] = useState(() => cleanView(initialView));
  const [tab, setTab] = useState(() => cleanTab(initialTab));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(() => (initialOpen ? { id: initialOpen, tab: null } : null));
  const [form, setForm] = useState(null); // { template } while the form is open
  const [cursor, setCursor] = useState(() => todayOf().cursor);
  const [notice, setNotice] = useState(null);
  const [busyRow, setBusyRow] = useState(null);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    writeAddress({ view, tab, openId: open?.id });
  }, [view, tab, open?.id]);

  /* Switching between sample and council data starts the page over: a sample
     row does not exist in the council's records, and the other way round. */
  const toggleSample = () => {
    setNotice(null);
    setForm(null);
    setQuery('');
    setOpen(null);
    data.setShowSample((v) => !v);
  };

  const d = board.data;
  const viewer = d?.viewer || { canAssign: false };
  const canAssign = Boolean(viewer.canAssign);
  const refs = useMemo(
    () => ({ roster: d?.roster || [], teams: d?.teams || [], cohorts: d?.cohorts || [] }),
    [d],
  );
  const all = useMemo(() => d?.assignments || [], [d]);
  const inTab = useMemo(() => filterByTab(all, tab), [all, tab]);
  const shown = useMemo(() => searchAssignments(inTab, query, refs), [inTab, query, refs]);

  const openDetail = useCallback((a, at = null) => setOpen({ id: a.id, tab: at }), []);

  const onRowAction = useCallback(
    async (a, action) => {
      if (action.run) {
        setBusyRow(a.id);
        setNotice(null);
        const res = await act({ type: action.run, id: a.id });
        setBusyRow(null);
        if (!res.ok) {
          setNotice({
            tone: 'error',
            text: `${action.label} did not go through for "${a.title}". Nothing was changed.`,
          });
          return;
        }
        if (!action.open) {
          setNotice({
            tone: 'ok',
            text: sampleActive
              ? `"${a.title}" is now in progress. Sample content: this is not saved.`
              : `"${a.title}" is now in progress.`,
          });
        }
      }
      if (action.open) setOpen({ id: a.id, tab: action.open });
    },
    [act, sampleActive],
  );

  if (!initialData && isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>Assignments is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading assignments</span>
        )}
      </Notice>
    );
  }
  if ((!initialData && !isOrgUser) || board.status === 'forbidden') {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const loading = board.status === 'loading';
  const failed = board.status === 'error';
  const m = d?.metrics || {};
  const delta = fmtPoints(m.completion_delta_pct);
  const num = (v) => (failed || v == null ? NA : String(v));
  const openRow = open ? all.find((a) => a.id === open.id) || null : null;

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page oas-page">
      <VisuallyHidden>
        <h1>Assignments</h1>
      </VisuallyHidden>

      {/* Row 1: the four figures and the page actions */}
      <div className="tcc-top oas-top">
        <div className="tcc-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip" role="list" aria-label="Assignment figures">
            <Kpi
              icon="bi-folder2-open"
              label="Open"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Work you can see that is not complete or graded"
            >
              {num(m.open ?? 0)}
            </Kpi>
            <Kpi
              icon="bi-exclamation-triangle"
              label="Overdue"
              loading={loading}
              tone={failed ? 'na' : m.overdue > 0 ? 'neg' : undefined}
              title="Past the due date and not complete or graded"
            >
              {num(m.overdue ?? 0)}
            </Kpi>
            <Kpi
              icon="bi-people"
              label="Awaiting review"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Submitted or under review"
            >
              {num(m.awaiting_review ?? 0)}
            </Kpi>
            <Kpi
              icon="bi-bullseye"
              label="Term completion"
              loading={loading}
              tone={failed || m.completion_rate_pct == null ? 'na' : undefined}
              title="Share of this term's work that is complete or graded, and the change from last term in percentage points"
            >
              {failed ? NA : fmtRate(m.completion_rate_pct)}
              {!failed && delta && (
                <span
                  className={`oas-delta ${m.completion_delta_pct >= 0 ? 'tcc-pos' : 'tcc-neg'}`}
                >
                  {delta}
                </span>
              )}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions oas-actions">
          {(sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {sampleActive && <span className="tcc-sample">Sample content</span>}
              {data.sampleAvailable && (
                <button type="button" className="tcc-textbtn oas-action" onClick={toggleSample}>
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              )}
            </div>
          )}
          <div className="tcc-toggles oas-views" role="group" aria-label="View">
            <TextToggle pressed={view === 'list'} onClick={() => setView('list')}>
              <i className="bi bi-list-ul" aria-hidden="true" />
              List
            </TextToggle>
            <TextToggle pressed={view === 'calendar'} onClick={() => setView('calendar')}>
              <i className="bi bi-calendar3" aria-hidden="true" />
              Calendar
            </TextToggle>
          </div>
          <ExportMenu assignments={all} disabled={loading || failed || all.length === 0} />
          {canAssign && (
            <button type="button" className="tcc-btn" onClick={() => setForm({ template: null })}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New assignment
            </button>
          )}
        </div>
      </div>

      {notice && (
        <p
          className={`oas-notice${notice.tone === 'error' ? ' oas-notice--error' : ''}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          <i
            className={`bi ${notice.tone === 'error' ? 'bi-exclamation-circle' : 'bi-check2-circle'}`}
            aria-hidden="true"
          />
          <span>{notice.text}</span>
          <button type="button" className="tcc-textbtn oas-action" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      )}

      {/* Row 2: the work, beside the calendar, the review queue and templates */}
      <div className="oas-body">
        <div className="oas-main">
          <AssignmentList
            status={board.status}
            view={view}
            all={all}
            shown={shown}
            inTabCount={inTab.length}
            tab={tab}
            onTab={setTab}
            query={query}
            onQuery={setQuery}
            viewer={viewer}
            refs={refs}
            scopeLabel={d?.scope_label || null}
            busyRow={busyRow}
            onOpen={openDetail}
            onAction={onRowAction}
            onRetry={data.retry}
            onNew={canAssign ? () => setForm({ template: null }) : null}
          >
            {view === 'calendar' && (
              <FullCalendar
                assignments={shown}
                cursor={cursor}
                onCursor={setCursor}
                onOpen={openDetail}
              />
            )}
          </AssignmentList>

          {canAssign && board.status === 'ready' && <Workload assignments={all} refs={refs} />}
        </div>
        <span className="tcc-vrule oas-vrule" aria-hidden="true" />
        <SideColumn
          status={board.status}
          view={view}
          assignments={shown}
          all={all}
          templates={d?.templates || []}
          canAssign={canAssign}
          cursor={cursor}
          onCursor={setCursor}
          onOpen={openDetail}
          onUseTemplate={(template) => setForm({ template })}
          onNew={() => setForm({ template: null })}
          onRetry={data.retry}
          onShowQueue={() => {
            setView('list');
            setTab('all');
            setQuery('');
          }}
        />
      </div>

      {open && board.status !== 'loading' && (
        <AssignmentDetail
          key={`${open.id}:${sampleActive ? 's' : 'l'}`}
          id={open.id}
          initialTab={open.tab}
          row={openRow}
          refs={refs}
          sample={sampleActive}
          loadDetail={data.loadDetail}
          act={act}
          onClose={() => setOpen(null)}
        />
      )}

      {form && (
        <NewAssignmentDialog
          open
          template={form.template}
          board={d}
          sample={sampleActive}
          act={act}
          onClose={() => setForm(null)}
          onCreated={(title) =>
            setNotice({
              tone: 'ok',
              text: sampleActive
                ? `"${title}" was added to the page. Sample content: it is not saved.`
                : `"${title}" was assigned.`,
            })
          }
        />
      )}
    </div>
  );
}
