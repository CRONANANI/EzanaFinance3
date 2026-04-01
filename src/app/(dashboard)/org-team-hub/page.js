'use client';

import { useOrg } from '@/contexts/OrgContext';
import { useEffect, useState } from 'react';
import { OrgHierarchyCard } from '@/components/org/OrgHierarchyCard';
import { PerformanceMetricsCard } from '@/components/org/PerformanceMetricsCard';
import { UpcomingDeadlinesCard } from '@/components/org/UpcomingDeadlinesCard';
import {
  StrategicOverviewCard,
  TeamPerformanceComparisonCard,
  ResourceAllocationCard,
} from '@/components/org/ExecutiveCards';
import {
  TeamPortfolioSummaryCard,
  AnalystWorkloadCard,
  CoveragePipelineCard,
} from '@/components/org/PortfolioManagerCards';
import {
  MyCoverageCard,
  ResearchDeliverablesCard,
  SkillDevelopmentCard,
} from '@/components/org/AnalystCards';
import { getTasksByRole, getMemberByEmail, MOCK_MEMBERS } from '@/lib/orgMockData';
import '../../../../app-legacy/assets/css/theme.css';

export default function OrgTeamHubPage() {
  const { isOrgUser, orgRole, orgData, isLoading } = useOrg();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!isOrgUser || !orgData) return;

    const emailMatch = getMemberByEmail(orgData?.member?.email);
    const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];
    const roleTasks = getTasksByRole(orgRole, currentMember.id);
    setTasks(roleTasks);
  }, [isOrgUser, orgData, orgRole]);

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Team Hub...</div>;
  if (!isOrgUser)
    return <div style={{ padding: '2rem', color: '#888' }}>This page is for organizational members only.</div>;

  const isExecutive = orgRole === 'executive';
  const isPortfolioManager = orgRole === 'portfolio_manager';
  const isAnalyst = orgRole === 'analyst';

  return (
    <div className="dashboard-page-inset">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <i className="bi bi-mortarboard-fill" style={{ color: '#6366f1', fontSize: '1.5rem' }} />
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Team Hub</h1>
          <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>
            {orgData?.org?.name} · {orgRole?.replace('_', ' ')}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isAnalyst ? '1fr 1fr' : '2fr 1fr',
          gap: '1.5rem',
        }}
      >
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="db-card">
            <div className="db-card-header">
              <h3>
                <i className="bi bi-list-task" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                {isAnalyst ? 'My Tasks' : 'Task Management'}
              </h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {tasks.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No tasks yet.</p>
              ) : (
                tasks
                  .slice(0, 8)
                  .map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '0.75rem 0',
                        borderBottom: '1px solid rgba(99,102,241,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
                          {t.title}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '2px 0 0' }}>
                          {t.status} · {t.priority} priority
                          {t.category && ` · ${t.category}`}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '0.5625rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            t.status === 'completed'
                              ? 'rgba(16,185,129,0.15)'
                              : t.status === 'in_progress'
                                ? 'rgba(99,102,241,0.15)'
                                : 'rgba(107,114,128,0.15)',
                          color:
                            t.status === 'completed'
                              ? '#10b981'
                              : t.status === 'in_progress'
                                ? '#6366f1'
                                : '#9ca3af',
                        }}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <PerformanceMetricsCard />

          {isExecutive && <StrategicOverviewCard />}
          {isPortfolioManager && <TeamPortfolioSummaryCard />}
          {isAnalyst && <MyCoverageCard />}

          {isExecutive && <TeamPerformanceComparisonCard />}
          {isPortfolioManager && <AnalystWorkloadCard />}
          {isAnalyst && <ResearchDeliverablesCard />}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <OrgHierarchyCard />

          <UpcomingDeadlinesCard />

          {isExecutive && <ResourceAllocationCard />}
          {isPortfolioManager && <CoveragePipelineCard />}
          {isAnalyst && <SkillDevelopmentCard />}
        </div>
      </div>
    </div>
  );
}
