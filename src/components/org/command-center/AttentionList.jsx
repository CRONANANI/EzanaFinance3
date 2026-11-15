'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Dropdown, MenuItem } from '@/components/ds';
import {
  ATTENTION_FILTERS,
  NA,
  ROLE_VIEW_LABEL,
  TASK_STATUSES,
  TASK_STATUS_BY_VALUE,
  attentionCounts,
  buildAttentionRows,
  fmtDate,
  shortName,
} from '@/lib/org-command-center';
import { Empty, Section, SectionError, Skel, TextToggle } from './parts';

const VISIBLE = 4;

const EMPTY_COPY = {
  pending: 'Nothing is waiting on you.',
  in_progress: 'No tasks are in progress.',
  completed: 'No tasks have been completed yet.',
};

function StatusControl({ row, onChange }) {
  const st = TASK_STATUS_BY_VALUE[row.status] || TASK_STATUS_BY_VALUE.pending;
  const tone = row.tone === 'neg' ? ' tcc-neg' : row.status === 'completed' ? ' tcc-pos' : '';
  if (!row.canChange) {
    return (
      <span
        className={`tcc-status${tone}`}
        title={row.owner ? `Assigned to ${row.owner}` : undefined}
      >
        <i className={`bi ${st.icon}`} aria-hidden="true" />
        {st.label}
      </span>
    );
  }
  return (
    <Dropdown
      align="right"
      className="tcc-statusmenu"
      trigger={
        <span className={`tcc-status tcc-status--menu${tone}`}>
          <i className={`bi ${st.icon}`} aria-hidden="true" />
          <span className="tcc-sr">Status of {row.subtitle}: </span>
          {st.label}
          <i className="bi bi-chevron-down tcc-status__chev" aria-hidden="true" />
        </span>
      }
    >
      {TASK_STATUSES.map((s) => (
        <MenuItem
          key={s.value}
          icon={s.value === row.status ? 'bi-check-lg' : s.icon}
          aria-current={s.value === row.status ? 'true' : undefined}
          onClick={() => {
            if (s.value !== row.status) onChange(row.taskId, s.value);
          }}
        >
          {s.label}
        </MenuItem>
      ))}
    </Dropdown>
  );
}

/**
 * Needs your attention: the member's task list for their role, with a real
 * status control, plus what else is waiting on them (their assignments, the
 * grading queue, open breaches and the next meeting).
 */
export function AttentionList({
  role,
  userId,
  teamId,
  canManage,
  tasks,
  assignments,
  meetings,
  summary,
  onRetry,
  onStatusChange,
  taskError,
  onDismissError,
}) {
  const [filter, setFilter] = useState('pending');
  const [showAll, setShowAll] = useState(false);
  const loading = tasks.status === 'loading';
  const failed = tasks.status === 'error';
  const list = tasks.data?.tasks;
  const scope = useMemo(() => ({ role, userId, teamId }), [role, userId, teamId]);

  const rows = useMemo(
    () =>
      buildAttentionRows({
        filter,
        ...scope,
        canManage,
        tasks: list,
        assignments: assignments.data?.assignments,
        awaitingReview: assignments.data?.metrics?.awaiting_review,
        meetings: meetings.data?.meetings,
        openBreaches: summary.data?.statStrip?.openViolations,
      }),
    [filter, scope, canManage, list, assignments.data, meetings.data, summary.data],
  );
  const counts = useMemo(() => attentionCounts(list, scope), [list, scope]);
  const shown = showAll ? rows : rows.slice(0, VISIBLE);

  return (
    <Section
      id="tcc-attn"
      title="Needs your attention"
      className="tcc-attn"
      aside={<span className="tcc-meta">{ROLE_VIEW_LABEL[role] || 'Member view'}</span>}
    >
      <div className="tcc-toggles tcc-attn__filters" role="group" aria-label="Task status">
        {ATTENTION_FILTERS.map((f) => (
          <TextToggle
            key={f.value}
            pressed={filter === f.value}
            onClick={() => {
              setFilter(f.value);
              setShowAll(false);
            }}
          >
            {f.label}
            {!loading && !failed ? <span className="tcc-mono">{counts[f.value]}</span> : null}
          </TextToggle>
        ))}
      </div>

      {taskError && (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{taskError}</span>
          <button type="button" className="tcc-textbtn" onClick={onDismissError}>
            Dismiss
          </button>
        </p>
      )}

      {failed ? (
        <SectionError message="Could not load tasks." onRetry={onRetry} />
      ) : loading ? (
        <ul className="tcc-rows" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="tcc-attn__row">
              <Skel w={17} h={17} />
              <span className="tcc-attn__main">
                <Skel w="70%" h={13} />
                <Skel w="50%" h={11} />
              </span>
              <Skel w={64} h={12} />
              <Skel w={84} h={12} />
              <Skel w={72} h={12} />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <Empty href="/org-team-hub/assignments" action="Open assignments">
          {EMPTY_COPY[filter]}
        </Empty>
      ) : (
        <>
          <ul className="tcc-rows">
            {shown.map((row) => {
              const text = (
                <>
                  <span className="tcc-attn__kind">{row.title}</span>
                  <span className="tcc-attn__sub" title={row.detail || row.subtitle}>
                    {row.subtitle}
                  </span>
                </>
              );
              return (
                <li key={row.id} className="tcc-attn__row">
                  <i
                    className={`bi ${row.icon} tcc-attn__icon${row.tone === 'neg' ? ' tcc-neg' : ''}`}
                    aria-hidden="true"
                  />
                  {row.href ? (
                    <Link href={row.href} className="tcc-attn__main tcc-rowlink">
                      {text}
                    </Link>
                  ) : (
                    <span className="tcc-attn__main">{text}</span>
                  )}
                  <span className="tcc-attn__owner" title={row.owner || undefined}>
                    {row.owner
                      ? row.kind === 'task' || row.kind === 'assignment'
                        ? shortName(row.owner)
                        : row.owner
                      : ''}
                  </span>
                  <span className={`tcc-mono tcc-attn__date${row.date ? '' : ' tcc-na'}`}>
                    {row.date ? fmtDate(row.date) : NA}
                  </span>
                  <span className="tcc-attn__status">
                    {row.kind === 'task' ? (
                      <StatusControl row={row} onChange={onStatusChange} />
                    ) : (
                      <span className={`tcc-status tcc-${row.statusTone}`}>
                        <i className={`bi ${row.statusIcon}`} aria-hidden="true" />
                        {row.statusText}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {rows.length > VISIBLE && (
            <button
              type="button"
              className="tcc-textbtn tcc-more"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}
