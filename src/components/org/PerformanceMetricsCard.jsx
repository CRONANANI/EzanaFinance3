'use client';

import { useOrg } from '@/contexts/OrgContext';
import { getPerformanceMetrics, getMemberByEmail, MOCK_MEMBERS } from '@/lib/orgMockData';

export function PerformanceMetricsCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || !orgData) return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];
  const metrics = getPerformanceMetrics(orgRole, currentMember.id);

  if (!metrics) return null;

  const isExec = orgRole === 'executive';
  const isPM = orgRole === 'portfolio_manager';
  const isAnalyst = orgRole === 'analyst';

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-graph-up" style={{ marginRight: '0.5rem', color: '#10b981' }} />
          Performance Metrics
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {isExec && (
          <>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.15))',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <p style={{ color: '#6b7280', fontSize: '0.6875rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Organization Portfolio
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>
                  ${(metrics.orgPortfolioValue / 1000).toFixed(0)}K
                </span>
                <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
                  {metrics.orgChange}
                </span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
                +${metrics.orgChangeDollar.toLocaleString()} today
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
                  AVG TEAM RETURN
                </p>
                <p style={{ color: '#818cf8', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {metrics.avgTeamReturn}%
                </p>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
                  PRESENTATIONS
                </p>
                <p style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {metrics.upcomingPresentations}
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Tasks Assigned This Week</span>
                <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{metrics.tasksAssignedThisWeek}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Tasks Completed This Week</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>{metrics.tasksCompletedThisWeek}</span>
              </div>
            </div>
          </>
        )}

        {isPM && (
          <>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.15))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <p style={{ color: '#9ca3af', fontSize: '0.6875rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Team Portfolio Value
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>
                  ${(metrics.portfolioValue / 1000).toFixed(0)}K
                </span>
                <span style={{ color: metrics.change.startsWith('+') ? '#10b981' : '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>
                  {metrics.change}
                </span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
                YTD: {metrics.ytdReturn}%
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
                  POSITIONS
                </p>
                <p style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {metrics.activePositions}
                </p>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
                  ANALYSTS
                </p>
                <p style={{ color: '#818cf8', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {metrics.analystCount}
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Tasks Active</span>
                <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 600 }}>{metrics.tasksActive}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Tasks Completed</span>
                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>{metrics.tasksCompleted}</span>
              </div>
            </div>
          </>
        )}

        {isAnalyst && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>Stocks Covered</span>
                <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>{metrics.stocksCovered}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>Active Tasks</span>
                <span style={{ color: '#818cf8', fontSize: '1.5rem', fontWeight: 800 }}>{metrics.activeTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>Completed Tasks</span>
                <span style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 800 }}>{metrics.completedTasks}</span>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(99,102,241,0.08)',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
                AVG COMPLETION TIME
              </p>
              <p style={{ color: '#818cf8', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                {metrics.avgTaskCompletionTime}
              </p>
            </div>

            <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: '0.75rem' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Coverage Ratings
              </p>
              <p style={{ color: '#e5e7eb', fontSize: '0.75rem', margin: 0 }}>
                {metrics.coverageRating}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
