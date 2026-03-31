'use client';

import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import '../../../../app-legacy/assets/css/theme.css';

export default function OrgTeamHubPage() {
  const { user } = useAuth();
  const { isOrgUser, orgRole, orgData, isLoading } = useOrg();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!isOrgUser || !orgData) return;
    const orgId = orgData.org.id;

    supabase
      .from('org_tasks')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setTasks(data || []));

    supabase
      .from('org_events')
      .select('*')
      .eq('org_id', orgId)
      .order('event_date', { ascending: true })
      .limit(10)
      .then(({ data }) => setEvents(data || []));

    supabase
      .from('org_posts')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setPosts(data || []));
  }, [isOrgUser, orgData]);

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Team Hub...</div>;
  if (!isOrgUser)
    return <div style={{ padding: '2rem', color: '#888' }}>This page is for organizational members only.</div>;

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
          gridTemplateColumns: orgRole === 'analyst' ? '1fr' : '2fr 1fr',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="db-card">
            <div className="db-card-header">
              <h3>{orgRole === 'analyst' ? 'My Tasks' : 'Task Management'}</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {tasks.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No tasks yet.</p>
              ) : (
                tasks
                  .filter((t) => (orgRole === 'analyst' ? t.assigned_to === user?.id : true))
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

          <div className="db-card">
            <div className="db-card-header">
              <h3>Team Discussion</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {posts.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No posts yet. Start a discussion!</p>
              ) : (
                posts.slice(0, 5).map((p) => (
                  <div key={p.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <p style={{ color: '#e5e7eb', fontSize: '0.8125rem', margin: 0 }}>{p.content}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '4px 0 0' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="db-card">
            <div className="db-card-header">
              <h3>Upcoming Events</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {events.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No upcoming events.</p>
              ) : (
                events.slice(0, 5).map((e) => (
                  <div key={e.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{e.title}</p>
                    <p style={{ color: '#6366f1', fontSize: '0.625rem', margin: '2px 0 0' }}>
                      {new Date(e.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {orgRole === 'analyst' && (
            <div className="db-card">
              <div className="db-card-header">
                <h3>Assigned Learning</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <p style={{ color: '#666', fontSize: '0.85rem' }}>Check the Learning Center for assigned content.</p>
                <Link href="/learning-center" style={{ color: '#6366f1', fontSize: '0.8125rem', textDecoration: 'none' }}>
                  Go to Learning Center →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
