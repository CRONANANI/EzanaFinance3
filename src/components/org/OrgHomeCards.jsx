// src/components/org/OrgHomeCards.jsx
'use client';

import { useOrg } from '@/contexts/OrgContext';
import Link from 'next/link';
import {
  ORG_NAME,
  ORG_SHORT,
  MOCK_TEAMS,
  MOCK_MEMBERS,
  MOCK_EVENTS,
  MOCK_TASKS,
  MOCK_DISCUSSIONS,
  MOCK_TEAM_PERFORMANCE,
  getMembersByTeam,
  getEventsForTeam,
  getTasksForMember,
  getTasksAssignedBy,
  getTotalPortfolioValue,
  getMemberByEmail,
} from '@/lib/orgMockData';

/** Map Supabase team row (UUID + slug) to mock sector id (t1…t7) for demo data */
function resolveMockTeamId(orgData) {
  const slug = orgData?.team?.slug;
  if (slug) {
    const hit = MOCK_TEAMS.find((t) => t.slug === slug);
    if (hit) return hit.id;
  }
  const rawId = orgData?.team?.id;
  if (rawId && MOCK_TEAMS.some((t) => t.id === rawId)) return rawId;
  return 't7';
}

/* ═══════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════ */
function statusColor(status) {
  if (status === 'completed' || status === 'uploaded') return '#10b981';
  if (status === 'in_progress') return '#6366f1';
  if (status === 'review') return '#f59e0b';
  return '#6b7280';
}

function statusBg(status) {
  if (status === 'completed' || status === 'uploaded') return 'rgba(16,185,129,0.12)';
  if (status === 'in_progress') return 'rgba(99,102,241,0.12)';
  if (status === 'review') return 'rgba(245,158,11,0.12)';
  return 'rgba(107,114,128,0.12)';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ═══════════════════════════════════════════
   EXECUTIVE HOME CARDS
   ═══════════════════════════════════════════ */
function ExecutiveHomeCards({ orgData }) {
  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentExecutive =
    emailMatch && emailMatch.role === 'executive'
      ? emailMatch
      : MOCK_MEMBERS.find((m) => m.role === 'executive') || MOCK_MEMBERS[0];

  const totalValue = getTotalPortfolioValue();
  const totalDayChange = MOCK_TEAM_PERFORMANCE.reduce((s, t) => s + t.change_dollar, 0);
  const totalDayPct = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;
  const upcomingEvents = MOCK_EVENTS.filter((e) => e.status === 'upcoming').slice(0, 4);
  const pendingDeliverables = MOCK_EVENTS.reduce(
    (count, e) => count + e.deliverables.filter((d) => d.status !== 'uploaded').length,
    0,
  );

  return (
    <>
      <div className="hts-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Council Portfolio Overview</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label" style={{ marginBottom: '0.35rem' }}>
              Signed in as {currentExecutive.name} · {currentExecutive.sub_role}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <div>
                <p className="hts-label">{ORG_SHORT} · Total AUM</p>
                <div className="hts-stat-lg">{fmtMoney(totalValue)}</div>
                <div className={`hts-change-row ${totalDayChange >= 0 ? 'positive' : 'negative'}`}>
                  {totalDayChange >= 0 ? '▲' : '▼'} {totalDayChange >= 0 ? '+' : ''}
                  {fmtMoney(totalDayChange)} ({totalDayPct >= 0 ? '+' : ''}{totalDayPct.toFixed(2)}%) today
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="hts-label">7 Sector Teams</p>
                <p style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{MOCK_MEMBERS.length} Members</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '1.25rem' }}>
        {MOCK_TEAM_PERFORMANCE.map((team) => {
          const pm = MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === team.team_id);
          const analystCount = MOCK_MEMBERS.filter((m) => m.role === 'analyst' && m.team_id === team.team_id).length;
          return (
            <div key={team.team_id} className="db-card hts-card">
              <div className="db-card-header">
                <h3>{team.team_name}</h3>
              </div>
              <div className="hts-card-body">
                <div className="hts-stat-lg">{fmtMoney(team.value)}</div>
                <div className={`hts-change-row ${team.change_pct >= 0 ? 'positive' : 'negative'}`}>
                  {team.change_pct >= 0 ? '▲' : '▼'} {team.change_pct >= 0 ? '+' : ''}
                  {team.change_pct.toFixed(1)}% today · YTD {team.ytd_return >= 0 ? '+' : ''}
                  {team.ytd_return.toFixed(1)}%
                </div>
                <p className="hts-label" style={{ marginTop: '0.5rem' }}>
                  Top Holdings
                </p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {team.top_holdings.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(99,102,241,0.1)',
                        color: '#818cf8',
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="hts-caption">{pm ? `PM: ${pm.name}` : 'No PM assigned'} · {analystCount} analyst{analystCount !== 1 ? 's' : ''}</p>
                <Link href={`/org-team-hub?team=${MOCK_TEAMS.find((t) => t.id === team.team_id)?.slug || ''}`} className="hts-card-link">
                  View Team <i className="bi bi-arrow-right" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Upcoming Events & Delegation</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">{pendingDeliverables} deliverables still pending across all events</p>
            {upcomingEvents.map((ev) => {
              const pending = ev.deliverables.filter((d) => d.status !== 'uploaded').length;
              const total = ev.deliverables.length;
              return (
                <div key={ev.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{ev.title}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '2px 0 0' }}>{ev.team_name} · {formatDate(ev.date)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {ev.deadline && (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: statusColor(pending > 0 ? 'pending' : 'completed'),
                            background: statusBg(pending > 0 ? 'pending' : 'completed'),
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {pending > 0 ? `${pending}/${total} pending` : 'All uploaded'}
                        </span>
                      )}
                      {ev.deadline && <p style={{ color: '#9ca3af', fontSize: '0.5625rem', margin: '2px 0 0' }}>Deadline: {daysUntil(ev.deadline)}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <Link href="/org-team-hub" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              Manage Events <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Council Activity</h3>
          </div>
          <div className="hts-card-body">
            {MOCK_DISCUSSIONS.slice(0, 5).map((d) => (
              <div key={d.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8' }}>{d.author_name}</span>
                  <span style={{ fontSize: '0.5625rem', color: '#6b7280' }}>{d.time}</span>
                  {d.type === 'announcement' && (
                    <span style={{ fontSize: '0.5rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700 }}>
                      ANNOUNCEMENT
                    </span>
                  )}
                </div>
                <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, lineHeight: 1.4 }}>{d.content.length > 120 ? d.content.slice(0, 120) + '…' : d.content}</p>
                {d.replies > 0 && <p style={{ color: '#6b7280', fontSize: '0.5625rem', margin: '2px 0 0' }}>{d.replies} replies</p>}
              </div>
            ))}
            <Link href="/community" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              View All Discussions <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   PORTFOLIO MANAGER HOME CARDS
   ═══════════════════════════════════════════ */
function PMHomeCards({ orgData }) {
  const teamId = resolveMockTeamId(orgData);
  const teamSlug = orgData?.team?.slug || MOCK_TEAMS.find((t) => t.id === teamId)?.slug || 'tmt';
  const teamPerf = MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === teamId) || MOCK_TEAM_PERFORMANCE[6];
  const teamEvents = getEventsForTeam(teamId).filter((e) => e.status === 'upcoming').slice(0, 3);
  const currentPM =
    MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === teamId) || MOCK_MEMBERS[2];
  const delegatedTasks = MOCK_TASKS.filter((t) => t.assigned_by === currentPM.id);
  const teamDiscussions = MOCK_DISCUSSIONS.filter((d) => d.team_id === teamId || d.team_id === null).slice(0, 4);

  return (
    <>
      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>{teamPerf.team_name} Portfolio</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">Team Portfolio Value</p>
            <div className="hts-stat-lg">{fmtMoney(teamPerf.value)}</div>
            <div className={`hts-change-row ${teamPerf.change_pct >= 0 ? 'positive' : 'negative'}`}>
              {teamPerf.change_pct >= 0 ? '▲' : '▼'} {teamPerf.change_pct >= 0 ? '+' : ''}
              {teamPerf.change_pct.toFixed(1)}% today · YTD {teamPerf.ytd_return >= 0 ? '+' : ''}
              {teamPerf.ytd_return.toFixed(1)}%
            </div>
            <p className="hts-label" style={{ marginTop: '0.5rem' }}>
              Top Holdings
            </p>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {teamPerf.top_holdings.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99,102,241,0.1)',
                    color: '#818cf8',
                    fontWeight: 600,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <Link href={`/org-team-hub?team=${teamSlug}`} className="hts-card-link">
              Team Hub <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Upcoming Events & Deadlines</h3>
          </div>
          <div className="hts-card-body">
            {teamEvents.length === 0 ? (
              <p className="hts-caption">No upcoming events for your team.</p>
            ) : (
              teamEvents.map((ev) => {
                const pending = ev.deliverables.filter((d) => d.status !== 'uploaded').length;
                return (
                  <div key={ev.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{ev.title}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.6875rem', margin: '2px 0 0' }}>{formatDate(ev.date)}</p>
                    {ev.deadline && (
                      <p style={{ color: '#f59e0b', fontSize: '0.625rem', fontWeight: 600, margin: '2px 0 0' }}>
                        ⏰ Deliverable deadline: {daysUntil(ev.deadline)} · {pending} pending
                      </p>
                    )}
                  </div>
                );
              })
            )}
            <Link href="/org-team-hub" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              View All Events <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Delegated Tasks</h3>
          </div>
          <div className="hts-card-body">
            {delegatedTasks.length === 0 ? (
              <p className="hts-caption">No tasks delegated yet.</p>
            ) : (
              delegatedTasks.map((t) => {
                const assignee = MOCK_MEMBERS.find((m) => m.id === t.assigned_to);
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid rgba(99,102,241,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{t.title}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '2px 0 0' }}>Assigned to {assignee?.name || 'Unknown'} · Due {t.due_date}</p>
                    </div>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: statusBg(t.status), color: statusColor(t.status) }}>
                      {t.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
            <Link href="/org-team-hub" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              Manage Tasks <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Team Discussion</h3>
          </div>
          <div className="hts-card-body">
            {teamDiscussions.map((d) => (
              <div key={d.id} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8' }}>{d.author_name}</span>
                  <span style={{ fontSize: '0.5625rem', color: '#6b7280' }}>{d.time}</span>
                </div>
                <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0, lineHeight: 1.4 }}>{d.content.length > 100 ? d.content.slice(0, 100) + '…' : d.content}</p>
              </div>
            ))}
            <Link href="/community" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              View All <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   ANALYST HOME CARDS
   ═══════════════════════════════════════════ */
function AnalystHomeCards({ orgData }) {
  const teamId = resolveMockTeamId(orgData);
  const teamSlug = orgData?.team?.slug || MOCK_TEAMS.find((t) => t.id === teamId)?.slug || 'tmt';
  const teamPerf = MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === teamId) || MOCK_TEAM_PERFORMANCE[6];
  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const defaultTeamAnalyst = MOCK_MEMBERS.find((m) => m.role === 'analyst' && m.team_id === teamId);
  const currentAnalyst =
    emailMatch && emailMatch.role === 'analyst'
      ? emailMatch
      : defaultTeamAnalyst || MOCK_MEMBERS.find((m) => m.id === 'm10');
  const myTasks = MOCK_TASKS.filter((t) => t.assigned_to === currentAnalyst.id);
  const teamEvents = getEventsForTeam(teamId).filter((e) => e.status === 'upcoming').slice(0, 3);

  const teamMovers = [
    { ticker: teamPerf.top_holdings[0], pct: 4.2 },
    { ticker: teamPerf.top_holdings[1], pct: 1.3 },
    { ticker: teamPerf.top_holdings[2], pct: -2.1 },
    { ticker: teamPerf.top_holdings[3], pct: -0.5 },
  ];

  return (
    <>
      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>{teamPerf.team_name} Portfolio</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">Team Portfolio Value</p>
            <div className="hts-stat-lg">{fmtMoney(teamPerf.value)}</div>
            <div className={`hts-change-row ${teamPerf.change_pct >= 0 ? 'positive' : 'negative'}`}>
              {teamPerf.change_pct >= 0 ? '▲' : '▼'} {teamPerf.change_pct >= 0 ? '+' : ''}
              {fmtMoney(teamPerf.change_dollar)} ({teamPerf.change_pct >= 0 ? '+' : ''}{teamPerf.change_pct.toFixed(1)}%)
            </div>
            <div className="hts-progress-track" style={{ marginTop: '0.5rem' }}>
              <div className="hts-progress-fill" style={{ width: '82%' }} />
            </div>
            <p className="hts-caption">82% invested · YTD {teamPerf.ytd_return >= 0 ? '+' : ''}{teamPerf.ytd_return.toFixed(1)}%</p>
            <Link href={`/org-team-hub?team=${teamSlug}`} className="hts-card-link">
              View Details <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Your Movers Today</h3>
          </div>
          <div className="hts-card-body">
            {teamMovers.map((m) => (
              <div
                key={m.ticker}
                className="hts-mover-row"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.4rem 0',
                  borderBottom: '1px solid rgba(99,102,241,0.06)',
                }}
              >
                <span style={{ color: '#f0f6fc', fontWeight: 700, fontSize: '0.8125rem' }}>{m.ticker}</span>
                <span style={{ color: m.pct >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.8125rem' }}>
                  {m.pct >= 0 ? '▲' : '▼'} {m.pct >= 0 ? '+' : ''}{m.pct.toFixed(1)}%
                </span>
              </div>
            ))}
            <Link href="/watchlist" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              Team Watchlist <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Your Streak</h3>
          </div>
          <div className="hts-card-body">
            <div className="hts-activity-score" style={{ color: '#f59e0b' }}>
              🔥 12 days
            </div>
            <div className="hts-activity-bar">
              <span style={{ width: '65%' }} />
            </div>
            <div className="hts-activity-label">Active Analyst</div>
            <p className="hts-caption" style={{ marginTop: '0.5rem' }}>
              Best: 31 days · Keep it going!
            </p>
          </div>
        </div>
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>This Week on {ORG_SHORT}</h3>
          </div>
          <div className="hts-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <p className="hts-label">Market Performance</p>
                <p style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>S&amp;P 500 +1.2%</p>
                <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '2px 0' }}>NASDAQ -0.3%</p>
              </div>
              <div>
                <p className="hts-label">Council Highlights</p>
                <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0 }}>• TMT pitch prep underway</p>
                <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: '2px 0' }}>• Healthcare review in 5 days</p>
              </div>
              <div>
                <p className="hts-label">Your Progress</p>
                <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: 0 }}>• {myTasks.filter((t) => t.status === 'completed').length}/{myTasks.length} tasks completed</p>
                <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: '2px 0' }}>• 3 research sessions logged</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Upcoming Events</h3>
          </div>
          <div className="hts-card-body">
            {teamEvents.map((ev) => (
              <div key={ev.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{ev.title}</p>
                <p style={{ color: '#6366f1', fontSize: '0.625rem', margin: '2px 0 0' }}>{formatDate(ev.date)}</p>
                {ev.deadline && <p style={{ color: '#f59e0b', fontSize: '0.5625rem', margin: '2px 0 0' }}>Deliverable deadline: {daysUntil(ev.deadline)}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>My Tasks</h3>
          </div>
          <div className="hts-card-body">
            {myTasks.length === 0 ? (
              <p className="hts-caption">No tasks assigned to you yet.</p>
            ) : (
              myTasks.map((t) => {
                const assigner = MOCK_MEMBERS.find((m) => m.id === t.assigned_by);
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid rgba(99,102,241,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{t.title}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '2px 0 0' }}>From {assigner?.name || 'PM'} · Due {t.due_date}</p>
                    </div>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: statusBg(t.status), color: statusColor(t.status) }}>
                      {t.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════ */
export function OrgHomeCards() {
  const { isOrgUser, orgRole, orgData, isLoading } = useOrg();
  if (!isOrgUser || isLoading) return null;

  return (
    <div>
      {orgRole === 'executive' && <ExecutiveHomeCards orgData={orgData} />}
      {orgRole === 'portfolio_manager' && <PMHomeCards orgData={orgData} />}
      {orgRole === 'analyst' && <AnalystHomeCards orgData={orgData} />}
    </div>
  );
}
