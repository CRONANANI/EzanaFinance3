'use client';

import { useOrg } from '@/contexts/OrgContext';
import { getTasksByRole, getMemberByEmail, MOCK_MEMBERS } from '@/lib/orgMockData';

export function UpcomingDeadlinesCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || !orgData) return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];
  const allTasks = getTasksByRole(orgRole, currentMember.id);

  // Filter and sort by due date
  const upcomingTasks = allTasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 6);

  const getPriorityColor = (priority) => {
    if (priority === 'urgent') return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    if (priority === 'high') return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
    if (priority === 'medium') return { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' };
    return { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.toDateString());
    const todayOnly = new Date(today.toDateString());
    const tomorrowOnly = new Date(tomorrow.toDateString());

    if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow';

    const diff = Math.ceil((dateOnly - todayOnly) / (1000 * 60 * 60 * 24));
    if (diff < 7) return `${diff} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-calendar-event" style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
          Upcoming Deadlines
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {upcomingTasks.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
            No upcoming deadlines
          </p>
        ) : (
          upcomingTasks.map((task) => {
            const priorityStyle = getPriorityColor(task.priority);
            const daysUntil = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntil < 0;
            const isUrgent = daysUntil <= 2 && daysUntil >= 0;

            return (
              <div
                key={task.id}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  borderRadius: '6px',
                  background: isOverdue ? 'rgba(239,68,68,0.08)' : isUrgent ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.04)',
                  border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : isUrgent ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.1)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0, flex: 1 }}>
                    {task.title}
                  </p>
                  <span
                    style={{
                      fontSize: '0.5625rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: priorityStyle.bg,
                      color: priorityStyle.color,
                      whiteSpace: 'nowrap',
                      marginLeft: '0.5rem',
                    }}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <i className="bi bi-clock" style={{ fontSize: '0.6875rem', color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#818cf8' }} />
                    <span style={{ color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#9ca3af', fontSize: '0.6875rem' }}>
                      {isOverdue ? 'Overdue' : formatDate(task.due_date)}
                    </span>
                  </div>

                  {task.category && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <i className="bi bi-tag" style={{ fontSize: '0.6875rem', color: '#6b7280' }} />
                      <span style={{ color: '#6b7280', fontSize: '0.6875rem', textTransform: 'capitalize' }}>
                        {task.category}
                      </span>
                    </div>
                  )}
                </div>

                {task.status === 'in_progress' && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ 
                      width: '100%',
                      height: '3px',
                      background: 'rgba(99,102,241,0.15)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '60%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #818cf8, #6366f1)',
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
