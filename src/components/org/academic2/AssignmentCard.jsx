'use client';

import { stripDemoLabel } from '@/lib/org-display';

/* Shared type + status metadata (single source of truth for the surface).
   `icon` is a Bootstrap Icons class name; consumers render it as
   <i className={`bi ${icon}`} aria-hidden="true" />. */
export const TYPE_META = {
  pitch: { label: 'Pitch', icon: 'bi-graph-up-arrow' },
  research: { label: 'Research', icon: 'bi-binoculars' },
  coverage: { label: 'Coverage', icon: 'bi-eye' },
  reading: { label: 'Reading', icon: 'bi-book' },
  model: { label: 'Model', icon: 'bi-calculator' },
  meeting_prep: { label: 'Meeting prep', icon: 'bi-easel' },
  other: { label: 'Other', icon: 'bi-file-earmark-text' },
};

export const STATUS_LABEL = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  submitted: 'Submitted',
  under_review: 'Under review',
  returned: 'Returned',
  complete: 'Complete',
  graded: 'Graded',
  overdue: 'Overdue',
};

export function typeMeta(t) {
  return TYPE_META[t] || TYPE_META.other;
}

export function fmtDue(iso, overdue) {
  if (!iso) return 'No due date';
  const d = new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${overdue ? 'Overdue' : 'Due'} ${d}`;
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

function AvatarStack({ assignees }) {
  if (!assignees?.length) return null;
  const shown = assignees.slice(0, 3);
  const extra = assignees.length - shown.length;
  return (
    <span
      className="asg2-avatars"
      aria-label={`${assignees.length} assignee${assignees.length === 1 ? '' : 's'}`}
    >
      {shown.map((a) => (
        <span key={a.member_id || a.user_id} className="asg2-avatar" title={a.name}>
          {initials(a.name)}
        </span>
      ))}
      {extra > 0 && <span className="asg2-avatar asg2-avatar--more">+{extra}</span>}
    </span>
  );
}

/* The contextual verb: what THIS viewer can do next on this assignment. */
export function verbFor(a, viewer) {
  const isAssignee = a.mine;
  const canReview = viewer?.canAssign;
  if (isAssignee && a.status === 'assigned')
    return { key: 'start', label: 'Start', icon: 'bi-play-fill', next: 'in_progress' };
  if (isAssignee && (a.status === 'in_progress' || a.status === 'returned'))
    return { key: 'submit', label: 'Submit', icon: 'bi-send', submit: true };
  if (canReview && a.status === 'submitted')
    return { key: 'review', label: 'Review', icon: 'bi-eye', review: true };
  if (canReview && a.status === 'under_review')
    return { key: 'review', label: 'Review', icon: 'bi-eye', review: true };
  if (canReview && a.status === 'returned')
    return {
      key: 'revise',
      label: 'Awaiting revision',
      icon: 'bi-arrow-counterclockwise',
      review: true,
    };
  return null;
}

export function AssignmentCard({ a, viewer, variant = 'compact', onOpen, onVerb }) {
  const { label, icon } = typeMeta(a.type || a.assignment_type);
  const status = a.overdue ? 'overdue' : a.status;
  const verb = variant === 'full' ? verbFor(a, viewer) : null;

  return (
    <button
      type="button"
      className={`asg2-card${a.overdue ? ' is-overdue' : ''}`}
      onClick={() => onOpen?.(a)}
    >
      <div className="asg2-card-top">
        <span className="asg2-type" data-type={a.type || a.assignment_type}>
          <i className={`bi ${icon}`} aria-hidden="true" /> {label}
        </span>
        <span className="asg2-status" data-status={status}>
          {STATUS_LABEL[status] || status}
        </span>
      </div>

      <div className="asg2-card-title">{stripDemoLabel(a.title)}</div>

      <div className="asg2-card-meta">
        <AvatarStack assignees={a.assignees} />
        <span className={`asg2-due${a.overdue ? '' : ''}`}>
          <i className="bi bi-clock" aria-hidden="true" />
          <span className="asg2-num">{fmtDue(a.due_date, a.overdue)}</span>
        </span>
        {a.attachment_count > 0 && (
          <span className="asg2-due" title={`${a.attachment_count} attachment(s)`}>
            <i className="bi bi-paperclip" aria-hidden="true" />
            <span className="asg2-num">{a.attachment_count}</span>
          </span>
        )}
        {a.comment_count > 0 && (
          <span className="asg2-due" title={`${a.comment_count} comment(s)`}>
            <i className="bi bi-chat-square" aria-hidden="true" />
            <span className="asg2-num">{a.comment_count}</span>
          </span>
        )}
      </div>

      {variant === 'full' && (
        <>
          {typeof a.progress_pct === 'number' && a.status !== 'assigned' && (
            <div className="asg2-progress" aria-label={`Progress ${a.progress_pct}%`}>
              <span style={{ width: `${Math.max(0, Math.min(100, a.progress_pct))}%` }} />
            </div>
          )}
          {verb && (
            <div className="asg2-card-foot">
              <span className="asg2-card-meta" style={{ fontSize: '0.68rem' }}>
                {a.assignee_name &&
                  `${a.assignees?.length || 1} assignee${(a.assignees?.length || 1) === 1 ? '' : 's'}`}
              </span>
              <span
                className="asg2-verb"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onVerb?.(a, verb);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    onVerb?.(a, verb);
                  }
                }}
              >
                <i className={`bi ${verb.icon}`} aria-hidden="true" /> {verb.label}
              </span>
            </div>
          )}
          {!verb && a.status === 'graded' && a.rubric_score != null && a.rubric_max != null && (
            <div className="asg2-card-foot">
              <span className="asg2-card-meta">
                <i
                  className="bi bi-check-circle"
                  aria-hidden="true"
                  style={{ color: 'var(--gold)' }}
                />{' '}
                Grade
              </span>
              <span className="asg2-num asg2-status" data-status="graded">
                {a.rubric_score}/{a.rubric_max}
              </span>
            </div>
          )}
        </>
      )}
    </button>
  );
}
