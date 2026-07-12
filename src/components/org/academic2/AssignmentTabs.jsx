'use client';

import { Inbox, CalendarClock } from 'lucide-react';
import { AssignmentCard } from './AssignmentCard';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'team', label: 'Team' },
  { key: 'by_me', label: 'By me' },
  { key: 'archive', label: 'Archive' },
];

function filterByTab(assignments, tab) {
  switch (tab) {
    case 'mine':
      return assignments.filter((a) => a.mine && !a.archived);
    case 'team':
      return assignments.filter((a) => a.team && !a.archived);
    case 'by_me':
      return assignments.filter((a) => a.by_me && !a.archived);
    case 'archive':
      return assignments.filter((a) => a.archived);
    case 'all':
    default:
      return assignments.filter((a) => !a.archived);
  }
}

/* Tab row (live counts) + independently-scrolling compact list. */
export function AssignmentTabs({
  assignments,
  tabCounts,
  activeTab,
  onTab,
  viewer,
  onOpen,
  variant = 'compact',
}) {
  const list = filterByTab(assignments || [], activeTab);
  const counts = tabCounts || {};

  return (
    <div className="asg2-rail">
      <div className="asg2-tabs" role="tablist" aria-label="Assignment filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={`asg2-tab${activeTab === t.key ? ' is-active' : ''}`}
            onClick={() => onTab(t.key)}
          >
            {t.label}
            <span className="asg2-tab-count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="asg2-empty">
          <Inbox size={26} className="asg2-empty-icon" aria-hidden="true" />
          <div className="asg2-empty-title">
            {activeTab === 'archive' ? 'Nothing archived yet' : 'Nothing here'}
          </div>
          <div className="asg2-empty-sub">
            {activeTab === 'archive'
              ? 'Completed and graded work will collect here at the end of the term.'
              : 'When work lands in this view it will show up here.'}
          </div>
          {activeTab === 'archive' ? (
            <button type="button" className="asg2-btn asg2-btn--sm" onClick={() => onTab('all')}>
              <CalendarClock size={13} aria-hidden="true" /> View upcoming
            </button>
          ) : (
            activeTab !== 'all' && (
              <button type="button" className="asg2-btn asg2-btn--sm" onClick={() => onTab('all')}>
                Browse all assignments
              </button>
            )
          )}
        </div>
      ) : (
        <div className="asg2-list">
          {list.map((a) => (
            <AssignmentCard
              key={a.id}
              a={a}
              viewer={viewer}
              variant={variant}
              onOpen={onOpen}
              onVerb={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
