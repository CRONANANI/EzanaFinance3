// src/components/org/OrgHomeCards.jsx
'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import Link from 'next/link';

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function statusColor(status) {
  if (status === 'completed' || status === 'uploaded') return 'var(--emerald)';
  if (status === 'in_progress') return 'var(--info)';
  if (status === 'review') return 'var(--warning)';
  return 'var(--text-muted)';
}
function statusBg(status) {
  if (status === 'completed' || status === 'uploaded') return 'var(--emerald-bg, rgba(16,185,129,0.12))';
  if (status === 'in_progress') return 'var(--info-bg, rgba(99,102,241,0.12))';
  if (status === 'review') return 'var(--warning-bg, rgba(245,158,11,0.12))';
  return 'var(--surface-input, rgba(107,114,128,0.12))';
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
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
function fmtMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtSignedPct(n, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}
/* Upcoming meetings/events from the meetings library, honest-empty. */
function upcomingFrom(meetings, limit = 4, teamId = null) {
  const now = Date.now();
  return (meetings?.meetings || [])
    .filter((m) => m.scheduled_at && Date.parse(m.scheduled_at) >= now && m.status !== 'cancelled')
    .filter((m) => (teamId ? m.team_id === teamId || m.team_id == null : true))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
    .slice(0, limit);
}

/* Today's fund delta from the last two snapshots (same rule as the desk). */
function snapshotDelta(summary) {
  const snaps = summary?.snapshots || [];
  if (snaps.length < 2) return { dollar: null, pct: null };
  const prev = snaps[snaps.length - 2].value;
  const dollar = snaps[snaps.length - 1].value - prev;
  return { dollar, pct: prev ? (dollar / prev) * 100 : null };
}

function teamSlugFor(orgData, teamId) {
  const t = (orgData?.teams || []).find((x) => x.id === teamId);
  return t?.slug || null;
}

/* ═══════════════════════════════════════════
   EXECUTIVE
   ═══════════════════════════════════════════ */
function ExecutiveHomeCards({ summary, meetings, orgData }) {
  const perf = summary?.performance || null;
  const you = summary?.organization?.you || summary?.viewer || null;
  const orgName = summary?.org?.name || orgData?.org?.name || 'Organization';
  const counts = summary?.counts || {};
  const sectors = (summary?.sectors || []).filter((s) => s.value > 0);
  const { dollar: todayDollar, pct: todayPct } = snapshotDelta(summary);
  const upcoming = upcomingFrom(meetings, 4);

  return (
    <>
      <div className="hts-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Council Portfolio Overview</h3>
          </div>
          <div className="hts-card-body">
            {you?.name && (
              <p className="hts-label" style={{ marginBottom: '0.35rem' }}>
                Signed in as {you.name}
                {you.title ? ` · ${you.title}` : ''}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <div>
                <p className="hts-label">{orgName} · Total AUM</p>
                <div className="hts-stat-lg">{fmtMoney(perf?.total_value)}</div>
                {todayDollar == null ? (
                  <div className="hts-change-row">—</div>
                ) : (
                  <div className={`hts-change-row ${todayDollar >= 0 ? 'positive' : 'negative'}`}>
                    {todayDollar >= 0 ? '▲' : '▼'} {todayDollar >= 0 ? '+' : ''}
                    {fmtMoney(todayDollar)} ({fmtSignedPct(todayPct, 2)}) today
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="hts-label">{counts.teams ?? 0} Sector Teams</p>
                <p style={{ color: 'var(--info)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                  {counts.members ?? 0} Members
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {sectors.length > 0 && (
        <div className="hts-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '1.25rem' }}>
          {sectors.map((team) => {
            const slug = teamSlugFor(orgData, team.teamId);
            return (
              <div key={team.teamId} className="db-card hts-card">
                <div className="db-card-header">
                  <h3>{team.name}</h3>
                </div>
                <div className="hts-card-body">
                  <div className="hts-stat-lg">{fmtMoney(team.value)}</div>
                  <div className={`hts-change-row ${(team.roiPct ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                    ROI {fmtSignedPct(team.roiPct)}
                  </div>
                  {(team.tickers || []).length > 0 && (
                    <>
                      <p className="hts-label" style={{ marginTop: '0.5rem' }}>Top Holdings</p>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {team.tickers.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '0.6875rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--info-bg, rgba(99,102,241,0.1))',
                              color: 'var(--info)',
                              fontWeight: 600,
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  <Link href={`/org-team-hub?team=${slug || team.teamId}`} className="hts-card-link">
                    View Team <i className="bi bi-arrow-right" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hts-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Upcoming Events</h3>
          </div>
          <div className="hts-card-body">
            {upcoming.length === 0 ? (
              <p className="hts-caption">No upcoming events scheduled.</p>
            ) : (
              upcoming.map((ev) => (
                <div key={ev.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{ev.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', margin: '2px 0 0' }}>{formatDate(ev.scheduled_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <Link href="/org-team-hub/meetings" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              Manage Events <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   PORTFOLIO MANAGER
   ═══════════════════════════════════════════ */
function PMHomeCards({ summary, tasks, meetings, orgData }) {
  const teamId = orgData?.member?.team_id || null;
  const sector = (summary?.sectors || []).find((s) => s.teamId === teamId) || null;
  const slug = teamSlugFor(orgData, teamId);
  const org = summary?.organization || {};
  const teamEvents = upcomingFrom(meetings, 3, teamId);
  const myTasks = (tasks?.tasks || []).filter((t) => t.status !== 'completed').slice(0, 6);

  return (
    <>
      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>{sector?.name || 'Team'} Portfolio</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">Team Portfolio Value</p>
            <div className="hts-stat-lg">{fmtMoney(sector?.value)}</div>
            <div className={`hts-change-row ${(sector?.roiPct ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              ROI {fmtSignedPct(sector?.roiPct)}
            </div>
            {(sector?.tickers || []).length > 0 && (
              <>
                <p className="hts-label" style={{ marginTop: '0.5rem' }}>Top Holdings</p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {sector.tickers.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--info-bg, rgba(99,102,241,0.1))',
                        color: 'var(--info)',
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
            <p className="hts-caption">
              {org.analystCount ?? (org.oversee?.length || 0)} analyst
              {(org.analystCount ?? (org.oversee?.length || 0)) !== 1 ? 's' : ''} on your team
            </p>
            <Link href={`/org-team-hub?team=${slug || teamId || ''}`} className="hts-card-link">
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
              teamEvents.map((ev) => (
                <div key={ev.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border-secondary)' }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{ev.title}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', margin: '2px 0 0' }}>{formatDate(ev.scheduled_at)}</p>
                </div>
              ))
            )}
            <Link href="/org-team-hub/meetings" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              View All Events <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>Team Tasks</h3>
          </div>
          <div className="hts-card-body">
            {myTasks.length === 0 ? (
              <p className="hts-caption">No open tasks.</p>
            ) : (
              myTasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{t.title}</p>
                    {t.due_date && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.625rem', margin: '2px 0 0' }}>
                        Due {daysUntil(t.due_date)}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: statusBg(t.status), color: statusColor(t.status) }}>
                    {String(t.status || 'pending').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))
            )}
            <Link href="/org-team-hub/assignments" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              Manage Tasks <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   ANALYST
   ═══════════════════════════════════════════ */
function AnalystHomeCards({ summary, tasks, meetings, orgData }) {
  const teamId = orgData?.member?.team_id || null;
  const sector = (summary?.sectors || []).find((s) => s.teamId === teamId) || null;
  const orgName = summary?.org?.name || orgData?.org?.name || 'your council';
  const slug = teamSlugFor(orgData, teamId);
  const myTasks = (tasks?.tasks || []).filter((t) => t.mine && t.status !== 'completed');
  const myOpenDue = myTasks.filter((t) => t.due_date).slice(0, 6);
  const teamEvents = upcomingFrom(meetings, 3, teamId);

  return (
    <>
      <div className="hts-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>{sector?.name || 'Team'} Portfolio</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">Team Portfolio Value</p>
            <div className="hts-stat-lg">{fmtMoney(sector?.value)}</div>
            <div className={`hts-change-row ${(sector?.roiPct ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              ROI {fmtSignedPct(sector?.roiPct)}
            </div>
            <Link href={`/org-team-hub?team=${slug || teamId || ''}`} className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              View Details <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>My Assignments</h3>
          </div>
          <div className="hts-card-body">
            {myOpenDue.length === 0 ? (
              <p className="hts-caption">Nothing due — you&apos;re clear.</p>
            ) : (
              myOpenDue.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{t.title}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.625rem', margin: '2px 0 0' }}>Due {daysUntil(t.due_date)}</p>
                  </div>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: statusBg(t.status), color: statusColor(t.status) }}>
                    {String(t.status || 'pending').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))
            )}
            <Link href="/org-team-hub/assignments" className="hts-card-link" style={{ marginTop: '0.5rem' }}>
              All Assignments <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>

      <div className="hts-row" style={{ gridTemplateColumns: '1fr', marginBottom: '1.25rem' }}>
        <div className="db-card hts-card">
          <div className="db-card-header">
            <h3>This Week on {orgName}</h3>
          </div>
          <div className="hts-card-body">
            {teamEvents.length === 0 ? (
              <p className="hts-caption">No upcoming events for your team.</p>
            ) : (
              teamEvents.map((ev) => (
                <div key={ev.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-secondary)' }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{ev.title}</p>
                  <p style={{ color: 'var(--info)', fontSize: '0.625rem', margin: '2px 0 0' }}>{formatDate(ev.scheduled_at)}</p>
                </div>
              ))
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
  const [state, setState] = useState({ summary: null, tasks: null, meetings: null, loading: true });

  useEffect(() => {
    if (!isOrgUser || isLoading) return undefined;
    let alive = true;
    Promise.allSettled([
      fetch('/api/org/team-hub/summary').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/org/tasks').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/org/meetings').then((r) => (r.ok ? r.json() : null)),
    ]).then((res) => {
      if (!alive) return;
      const [s, t, m] = res.map((x) => (x.status === 'fulfilled' ? x.value : null));
      setState({ summary: s, tasks: t, meetings: m, loading: false });
    });
    return () => {
      alive = false;
    };
  }, [isOrgUser, isLoading]);

  if (!isOrgUser || isLoading) return null;
  if (state.loading) {
    return (
      <div className="hts-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="db-card hts-card">
          <div className="hts-card-body">
            <p className="hts-caption">Loading your council overview…</p>
          </div>
        </div>
      </div>
    );
  }

  const shared = { summary: state.summary, tasks: state.tasks, meetings: state.meetings, orgData };
  return (
    <div>
      {orgRole === 'executive' && <ExecutiveHomeCards {...shared} />}
      {orgRole === 'portfolio_manager' && <PMHomeCards {...shared} />}
      {orgRole === 'analyst' && <AnalystHomeCards {...shared} />}
    </div>
  );
}
