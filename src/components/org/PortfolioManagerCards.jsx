'use client';

import { useOrg } from '@/contexts/OrgContext';
import {
  MOCK_TMT_HOLDINGS,
  getMembersByTeam,
  getCoveragePipeline,
  getMemberByEmail,
  MOCK_MEMBERS,
} from '@/lib/orgMockData';

export function TeamPortfolioSummaryCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || orgRole !== 'portfolio_manager') return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const holdings = currentMember.team_id === 't7' ? MOCK_TMT_HOLDINGS.slice(0, 6) : [];

  if (holdings.length === 0) {
    return (
      <div className="db-card">
        <div className="db-card-header">
          <h3>
            <i className="bi bi-briefcase" style={{ marginRight: '0.5rem', color: '#10b981' }} />
            Team Portfolio
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>No holdings data available for this team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-briefcase" style={{ marginRight: '0.5rem', color: '#10b981' }} />
          Team Portfolio
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {holdings.map((holding) => {
          const gainLoss = ((holding.current_price - holding.avg_cost) / holding.avg_cost) * 100;
          const totalValue = holding.shares * holding.current_price;

          return (
            <div
              key={holding.ticker}
              style={{
                padding: '0.75rem',
                marginBottom: '0.75rem',
                borderRadius: '6px',
                background: 'rgba(99,102,241,0.04)',
                border: '1px solid rgba(99,102,241,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>{holding.ticker}</span>
                  <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.125rem 0 0' }}>
                    {holding.sector}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: gainLoss >= 0 ? '#10b981' : '#ef4444', fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
                    {gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(1)}%
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.125rem 0 0' }}>
                    ${totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#6b7280' }}>
                <span>{holding.shares} shares @ ${holding.avg_cost.toFixed(2)}</span>
                <span>Current: ${holding.current_price.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalystWorkloadCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || orgRole !== 'portfolio_manager') return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const analysts = getMembersByTeam(currentMember.team_id).filter((m) => m.role === 'analyst');

  const workloadData = analysts.map((analyst) => {
    const seed = analyst.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      ...analyst,
      activeTasks: 3 + (seed % 5),
      completedThisWeek: 2 + (seed % 4),
      utilization: 65 + (seed % 30),
    };
  });

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-people" style={{ marginRight: '0.5rem', color: '#818cf8' }} />
          Analyst Workload
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {workloadData.map((analyst) => (
          <div
            key={analyst.id}
            style={{
              padding: '0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '6px',
              background: 'rgba(99,102,241,0.04)',
              border: '1px solid rgba(99,102,241,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div>
                <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
                  {analyst.name}
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.125rem 0 0' }}>
                  {analyst.sub_role}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: `conic-gradient(#818cf8 ${analyst.utilization}%, rgba(99,102,241,0.15) 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#0a0f0a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#818cf8',
                }}>
                  {analyst.utilization}%
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.6875rem', color: '#6b7280' }}>
              <span>Active: {analyst.activeTasks}</span>
              <span>Done this week: {analyst.completedThisWeek}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoveragePipelineCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || orgRole !== 'portfolio_manager') return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const pipeline = getCoveragePipeline(currentMember.team_id);

  if (pipeline.length === 0) {
    return (
      <div className="db-card">
        <div className="db-card-header">
          <h3>
            <i className="bi bi-list-check" style={{ marginRight: '0.5rem', color: '#10b981' }} />
            Coverage Pipeline
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>No coverage data available for this team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-list-check" style={{ marginRight: '0.5rem', color: '#10b981' }} />
          Coverage Pipeline
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {pipeline.map((stock) => {
          const ratingColor = stock.rating === 'Buy' ? '#10b981' : stock.rating === 'Hold' ? '#818cf8' : '#6b7280';

          return (
            <div
              key={stock.ticker}
              style={{
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(99,102,241,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
                  {stock.ticker}
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.125rem 0 0' }}>
                  {stock.analyst}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${ratingColor}20`,
                  color: ratingColor,
                }}>
                  {stock.rating}
                </span>
                <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.25rem 0 0' }}>
                  {new Date(stock.nextUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
