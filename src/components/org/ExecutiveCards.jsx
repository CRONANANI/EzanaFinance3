'use client';

import { useOrg } from '@/contexts/OrgContext';
import { STRATEGIC_OVERVIEW, MOCK_TEAM_PERFORMANCE, RESOURCE_ALLOCATION } from '@/lib/orgMockData';

export function StrategicOverviewCard() {
  const { isOrgUser, orgRole } = useOrg();

  if (!isOrgUser || orgRole !== 'executive') return null;

  const data = STRATEGIC_OVERVIEW;
  const aumProgress = (data.totalAUM / data.targetAUM) * 100;
  const headcountProgress = (data.headcount / data.targetHeadcount) * 100;

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-compass" style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
          Strategic Overview
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>AUM Progress</span>
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
              ${(data.totalAUM / 1000).toFixed(0)}K / ${(data.targetAUM / 1000).toFixed(0)}K
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(99,102,241,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${aumProgress}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Headcount</span>
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
              {data.headcount} / {data.targetHeadcount}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(99,102,241,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${headcountProgress}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #6366f1)' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
              AVG RETURN
            </p>
            <p style={{ color: '#10b981', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
              {data.avgPortfolioReturn}%
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.5625rem', margin: '0.25rem 0 0' }}>
              vs {data.benchmarkReturn}% benchmark
            </p>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
              SHARPE RATIO
            </p>
            <p style={{ color: '#818cf8', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
              {data.riskAdjustedReturn}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.5625rem', margin: '0.25rem 0 0' }}>
              {data.teamUtilization}% utilization
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: '0.75rem' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.625rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>
            Key Milestones
          </p>
          {data.upcomingMilestones.slice(0, 3).map((milestone, i) => (
            <div key={i} style={{ marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(99,102,241,0.3)' }}>
              <p style={{ color: '#e5e7eb', fontSize: '0.75rem', margin: '0 0 0.125rem', fontWeight: 600 }}>
                {milestone.title}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: 0 }}>
                {new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {milestone.owner}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamPerformanceComparisonCard() {
  const { isOrgUser, orgRole } = useOrg();

  if (!isOrgUser || orgRole !== 'executive') return null;

  const teams = [...MOCK_TEAM_PERFORMANCE].sort((a, b) => b.ytd_return - a.ytd_return);

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-trophy" style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
          Team Rankings
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {teams.map((team, index) => {
          const isTop = index === 0;
          const isBottom = index === teams.length - 1;
          const color = isTop ? '#10b981' : isBottom ? '#ef4444' : '#818cf8';

          return (
            <div
              key={team.team_id}
              style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                borderRadius: '6px',
                background: isTop ? 'rgba(16,185,129,0.08)' : isBottom ? 'rgba(239,68,68,0.06)' : 'rgba(99,102,241,0.04)',
                border: `1px solid ${isTop ? 'rgba(16,185,129,0.2)' : isBottom ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                }}>
                  {index + 1}
                </span>
                <span style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, flex: 1 }}>
                  {team.team_name}
                </span>
                <span style={{ color, fontSize: '0.875rem', fontWeight: 700 }}>
                  {team.ytd_return > 0 ? '+' : ''}{team.ytd_return}%
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.6875rem', color: '#6b7280' }}>
                <span>AUM: ${(team.value / 1000).toFixed(0)}K</span>
                <span>Today: <span style={{ color: team.change_pct > 0 ? '#10b981' : '#ef4444' }}>
                  {team.change_pct > 0 ? '+' : ''}{team.change_pct}%
                </span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResourceAllocationCard() {
  const { isOrgUser, orgRole } = useOrg();

  if (!isOrgUser || orgRole !== 'executive') return null;

  const data = RESOURCE_ALLOCATION;
  const budgetUtilization = (data.quarterlySpend / data.quarterlyBudget) * 100;

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-pie-chart" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
          Resource Allocation
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.15))',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.5rem', fontWeight: 600 }}>
            QUARTERLY BUDGET
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>
              ${(data.quarterlySpend / 1000).toFixed(0)}K
            </span>
            <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              / ${(data.quarterlyBudget / 1000).toFixed(0)}K
            </span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(99,102,241,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${budgetUtilization}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #6366f1)' }} />
          </div>
        </div>

        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {data.teams.map((team) => (
            <div
              key={team.name}
              style={{
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(99,102,241,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#e5e7eb', fontSize: '0.75rem', fontWeight: 600 }}>
                  {team.name}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '0.6875rem' }}>
                  {team.utilization}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#6b7280' }}>
                <span>{team.analysts} analyst{team.analysts !== 1 ? 's' : ''}</span>
                <span>${(team.budgetUsed / 1000).toFixed(0)}K / ${(team.budget / 1000).toFixed(0)}K</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
