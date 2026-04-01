'use client';

import { useOrg } from '@/contexts/OrgContext';
import {
  getAnalystCoverage,
  getSkillDevelopment,
  getTasksByRole,
  getMemberByEmail,
  MOCK_MEMBERS,
} from '@/lib/orgMockData';

export function MyCoverageCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || orgRole !== 'analyst') return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const coverage = getAnalystCoverage(currentMember.id);

  if (coverage.length === 0) {
    return (
      <div className="db-card">
        <div className="db-card-header">
          <h3>
            <i className="bi bi-star" style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
            My Coverage
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>No stocks assigned yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-star" style={{ marginRight: '0.5rem', color: '#f59e0b' }} />
          My Coverage
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {coverage.map((stock) => {
          const ratingColor = stock.rating === 'Buy' ? '#10b981' : '#818cf8';

          return (
            <div
              key={stock.ticker}
              style={{
                padding: '0.75rem',
                marginBottom: '0.75rem',
                borderRadius: '6px',
                background: 'rgba(99,102,241,0.04)',
                border: '1px solid rgba(99,102,241,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>{stock.ticker}</span>
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
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                <span>Target: ${stock.targetPrice}</span>
                <span>Updated: {new Date(stock.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                <i className="bi bi-calendar-event" style={{ marginRight: '0.25rem' }} />
                Next Earnings: {new Date(stock.nextEarnings).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResearchDeliverablesCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || orgRole !== 'analyst') return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const tasks = getTasksByRole('analyst', currentMember.id).filter(
    (t) => (t.category === 'research' || t.category === 'modeling') && t.status !== 'completed',
  ).slice(0, 5);

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-file-earmark-text" style={{ marginRight: '0.5rem', color: '#818cf8' }} />
          Research Deliverables
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {tasks.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.85rem' }}>No pending deliverables.</p>
        ) : (
          tasks.map((task) => {
            const daysUntil = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={task.id}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(99,102,241,0.04)',
                  border: '1px solid rgba(99,102,241,0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <i className={`bi bi-${task.category === 'modeling' ? 'calculator' : 'search'}`} style={{ color: '#818cf8', fontSize: '0.875rem', marginTop: '0.125rem' }} />
                  <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0, flex: 1 }}>
                    {task.title}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                  <span style={{ color: '#6b7280' }}>
                    {task.category === 'modeling' ? 'Model' : 'Research'}
                  </span>
                  <span style={{ color: daysUntil <= 2 ? '#f59e0b' : '#9ca3af' }}>
                    Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SkillDevelopmentCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();

  if (!isOrgUser || orgRole !== 'analyst') return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const skills = getSkillDevelopment(currentMember.id);

  if (!skills) {
    return (
      <div className="db-card">
        <div className="db-card-header">
          <h3>
            <i className="bi bi-mortarboard" style={{ marginRight: '0.5rem', color: '#10b981' }} />
            Skill Development
          </h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>No development data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>
          <i className="bi bi-mortarboard" style={{ marginRight: '0.5rem', color: '#10b981' }} />
          Skill Development
        </h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.15))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.625rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
            NEXT MILESTONE
          </p>
          <p style={{ color: '#10b981', fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>
            {skills.nextMilestone}
          </p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.625rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>
            Skill Ratings
          </p>
          {Object.entries(skills.skillRatings).map(([skill, rating]) => (
            <div key={skill} style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#e5e7eb', fontSize: '0.75rem', textTransform: 'capitalize' }}>{skill}</span>
                <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 600 }}>{rating}%</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(99,102,241,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${rating}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, #6366f1)' }} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <p style={{ color: '#9ca3af', fontSize: '0.625rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>
            In Progress
          </p>
          {skills.inProgressCourses.map((course, i) => (
            <div key={i} style={{ padding: '0.5rem', background: 'rgba(99,102,241,0.06)', borderRadius: '4px', marginBottom: '0.5rem' }}>
              <p style={{ color: '#e5e7eb', fontSize: '0.75rem', margin: 0 }}>
                <i className="bi bi-book" style={{ marginRight: '0.375rem', color: '#818cf8' }} />
                {course}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
