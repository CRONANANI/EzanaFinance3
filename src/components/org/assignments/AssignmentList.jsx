'use client';

import { useId } from 'react';
import { stripDemoLabel } from '@/lib/org-display';
import {
  NA,
  TABS,
  assigneeSummary,
  filterByTab,
  fmtDay,
  fmtDayYear,
  gradeText,
  groupAssignments,
  nextAction,
  progressText,
  typeMeta,
  typeOf,
  waitingOnViewer,
} from '@/lib/org-assignments-model';
import { Skel, SectionError } from '@/components/org/command-center/parts';

/** Type as an icon in the type colour and a word. Never a filled chip. */
export function TypeMark({ a, label = true }) {
  const type = typeOf(a);
  const meta = typeMeta(type);
  return (
    <span className="oas-type" data-type={type}>
      <i className={`bi ${meta.icon}`} aria-hidden="true" />
      {label ? <span>{meta.label}</span> : <span className="tcc-sr">{meta.label}</span>}
    </span>
  );
}

/** Due date. Overdue carries the word and an icon, not colour alone. */
export function DueText({ a }) {
  if (!a.due_date) return <span className="tcc-na">No due date</span>;
  if (a.overdue) {
    return (
      <span className="oas-overdue" title={`Was due ${fmtDayYear(a.due_date)}`}>
        <span className="oas-overdue__word">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          Overdue
        </span>
        <span className="tcc-mono">{fmtDay(a.due_date)}</span>
      </span>
    );
  }
  return (
    <span className="tcc-mono" title={`Due ${fmtDayYear(a.due_date)}`}>
      {fmtDay(a.due_date)}
    </span>
  );
}

function Row({ a, viewer, refs, busy, onOpen, onAction }) {
  const who = assigneeSummary(a, refs);
  const action = nextAction(a, viewer);
  const grade = gradeText(a);
  const title = stripDemoLabel(a.title) || 'Untitled';
  const type = typeMeta(typeOf(a)).label;
  return (
    <div className="oas-row" role="row">
      <span className="oas-row__icon" role="cell">
        <TypeMark a={a} label={false} />
      </span>
      <span className="oas-row__title" role="cell">
        <button type="button" className="oas-open" onClick={() => onOpen(a)} title={title}>
          {title}
        </button>
        <span className="oas-row__sub">
          <span>{type}</span>
          {a.ticker && <span className="tcc-mono oas-ticker">{a.ticker}</span>}
          {a.sector && <span>{a.sector}</span>}
        </span>
      </span>
      <span className="oas-row__who" role="cell" title={who.full}>
        <i className={`bi ${who.group ? 'bi-people' : 'bi-person'}`} aria-hidden="true" />
        <span className="oas-clip">{who.text}</span>
      </span>
      <span className="oas-row__due" role="cell">
        <DueText a={a} />
      </span>
      <span className="oas-row__progress" role="cell">
        {progressText(a)}
      </span>
      <span
        className="oas-row__count tcc-mono"
        role="cell"
        title={`${a.attachment_count || 0} files`}
      >
        <i className="bi bi-paperclip" aria-hidden="true" />
        <span className="tcc-sr">Files </span>
        {a.attachment_count || 0}
      </span>
      <span
        className="oas-row__count tcc-mono"
        role="cell"
        title={`${a.comment_count || 0} comments`}
      >
        <i className="bi bi-chat" aria-hidden="true" />
        <span className="tcc-sr">Comments </span>
        {a.comment_count || 0}
      </span>
      <span className="oas-row__next" role="cell">
        {action ? (
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent oas-next"
            disabled={busy}
            onClick={() => onAction(a, action)}
            aria-label={`${action.label}: ${title}`}
          >
            {action.label}
          </button>
        ) : grade ? (
          <span className="oas-grade tcc-mono" title="Score out of maximum">
            {grade}
          </span>
        ) : a.status === 'returned' ? (
          <span className="tcc-na">Awaiting revision</span>
        ) : (
          <span className="tcc-sr">No step is open to you</span>
        )}
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="oas-skel" aria-hidden="true">
      {[0, 1].map((g) => (
        <div key={g}>
          <Skel w={120} h={14} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="oas-row oas-row--skel">
              <Skel w={16} h={16} />
              <span className="oas-row__title">
                <Skel w="70%" h={13} />
                <Skel w="40%" h={10} />
              </span>
              <Skel w={90} h={12} />
              <Skel w={48} h={12} />
              <Skel w={76} h={12} />
              <Skel w={20} h={12} />
              <Skel w={20} h={12} />
              <Skel w={52} h={12} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The work: search and tabs, then either the grouped list or (as children)
 * the month calendar. The tabs filter both, and every count equals the rows
 * its tab shows.
 */
export function AssignmentList({
  status,
  view,
  all,
  shown,
  inTabCount,
  tab,
  onTab,
  query,
  onQuery,
  viewer,
  refs,
  scopeLabel,
  busyRow,
  onOpen,
  onAction,
  onRetry,
  onNew,
  children,
}) {
  const headId = useId();
  const searchId = useId();
  const loading = status === 'loading';
  const failed = status === 'error';
  const groups = groupAssignments(shown, viewer);
  const waiting = waitingOnViewer(shown, viewer);
  const searching = Boolean(query.trim());

  return (
    <section
      className="tcc-section oas-work"
      aria-labelledby={headId}
      aria-busy={loading || undefined}
    >
      <div className="tcc-head oas-workhead">
        <h2 className="tcc-title" id={headId}>
          Assigned work
        </h2>
        {status === 'ready' && (
          <span className="oas-waiting" aria-live="polite">
            <span className="tcc-mono">{waiting}</span> waiting on you
            {searching || tab !== 'all' ? ' in this view' : ''}
          </span>
        )}
      </div>
      {loading ? (
        <p className="oas-scope">
          <Skel w={300} h={11} />
        </p>
      ) : (
        scopeLabel && !failed && <p className="oas-scope">{scopeLabel}</p>
      )}

      <div className="oas-filters">
        <label className="oas-search" htmlFor={searchId}>
          <i className="bi bi-search" aria-hidden="true" />
          <span className="tcc-sr">Search assignments</span>
          <input
            id={searchId}
            type="search"
            className="oas-search__input"
            placeholder="Search assignments, tickers, people"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            disabled={loading || failed}
            autoComplete="off"
          />
        </label>
        <div className="tcc-toggles oas-tabs" role="tablist" aria-label="Assignment filters">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tcc-toggle${tab === t.key ? ' is-on' : ''}`}
              onClick={() => onTab(t.key)}
            >
              {t.label}
              <span className="tcc-mono oas-tabcount">
                {loading ? <Skel w={12} h={10} /> : failed ? NA : filterByTab(all, t.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : failed ? (
        <SectionError message="Assignments could not be loaded." onRetry={onRetry} />
      ) : shown.length === 0 ? (
        <p className="tcc-state">
          <span>
            {searching
              ? `No assignments match "${query.trim()}" in this view.`
              : tab === 'archive'
                ? 'Nothing is complete or graded yet.'
                : inTabCount === 0 && tab !== 'all'
                  ? 'Nothing in this view.'
                  : 'No open assignments.'}
          </span>
          {searching ? (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => onQuery('')}
            >
              Clear search
            </button>
          ) : tab !== 'all' ? (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => onTab('all')}
            >
              {tab === 'archive' ? 'View open work' : 'Browse all assignments'}
            </button>
          ) : onNew ? (
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onNew}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New assignment
            </button>
          ) : null}
        </p>
      ) : view === 'calendar' ? (
        children
      ) : (
        <div className="oas-table" role="table" aria-label="Assignments">
          <div className="oas-row oas-row--head" role="row">
            <span role="columnheader">
              <span className="tcc-sr">Type</span>
            </span>
            <span role="columnheader">Assignment</span>
            <span role="columnheader">Assignees</span>
            <span role="columnheader">Due date</span>
            <span role="columnheader">Progress</span>
            <span role="columnheader" className="oas-row__count">
              Files
            </span>
            <span role="columnheader" className="oas-row__count" title="Comments">
              <i className="bi bi-chat" aria-hidden="true" />
              <span className="tcc-sr">Comments</span>
            </span>
            <span role="columnheader" className="oas-row__next">
              Next action
            </span>
          </div>
          {groups.map((g) => (
            <div key={g.key} className="oas-group" role="rowgroup" aria-label={g.title}>
              <h3 className="oas-group__title">
                {g.title} <span className="tcc-mono oas-group__count">({g.rows.length})</span>
              </h3>
              {g.rows.map((a) => (
                <Row
                  key={a.id}
                  a={a}
                  viewer={viewer}
                  refs={refs}
                  busy={busyRow === a.id}
                  onOpen={onOpen}
                  onAction={onAction}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
