'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
  MOCK_TEAMS,
  getOrgMemberReportsTo,
  getOrgMemberDirectReports,
  getOrgMemberTopInteractions,
  getMockMemberActivitySummary,
} from '@/lib/orgMockData';

function roleColor(role) {
  if (role === 'executive') return '#f59e0b';
  if (role === 'portfolio_manager') return '#6366f1';
  return '#10b981';
}

function AvatarCircle({ name, role, size = 48 }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${roleColor(role)}33, ${roleColor(role)}88)`,
        border: `2px solid ${roleColor(role)}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        color: roleColor(role),
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p
      style={{
        color: '#9ca3af',
        fontSize: '0.5625rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin: '0 0 0.5rem',
      }}
    >
      {children}
    </p>
  );
}

export function OrgMemberProfileModal({ member, isOpen, onClose, viewerMemberId }) {
  const { toast } = useToast();
  const [messageBody, setMessageBody] = useState('');

  const handleClose = useCallback(() => {
    setMessageBody('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !member) return null;

  const team = MOCK_TEAMS.find((t) => t.id === member.team_id);
  const reportsTo = getOrgMemberReportsTo(member);
  const directReports = getOrgMemberDirectReports(member);
  const topInteractions = getOrgMemberTopInteractions(member.id);
  const activity = getMockMemberActivitySummary(member.id);
  const isSelf = viewerMemberId && member.id === viewerMemberId;

  const sendMessage = () => {
    const trimmed = messageBody.trim();
    if (!trimmed) {
      toast.warning('Write a message before sending.');
      return;
    }
    if (isSelf) {
      toast.info('You cannot message yourself.');
      return;
    }
    toast.success(`Message sent to ${member.name}`);
    setMessageBody('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-member-profile-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="db-card"
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: 'min(90vh, 720px)',
          overflow: 'auto',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1rem 0',
            borderBottom: '1px solid rgba(99,102,241,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AvatarCircle name={member.name} role={member.role} size={52} />
            <div>
              <h2 id="org-member-profile-title" style={{ color: '#f0f6fc', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {member.name}
              </h2>
              <p style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 600, margin: '4px 0 0' }}>
                {member.sub_role || member.role.replace('_', ' ')}
                {team ? ` · ${team.name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close profile"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#9ca3af',
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div style={{ padding: '1rem' }}>
          <SectionTitle>Contact</SectionTitle>
          <p style={{ color: '#d1d5db', fontSize: '0.8125rem', margin: '0 0 1rem' }}>
            <i className="bi bi-envelope" style={{ marginRight: 6, opacity: 0.7 }} />
            {member.email || '—'}
          </p>

          <SectionTitle>Platform activity (demo)</SectionTitle>
          <ul style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '0 0 1rem', paddingLeft: '1.1rem', lineHeight: 1.6 }}>
            <li>Last active: {activity.lastActive}</li>
            <li>Active tasks: {activity.activeTasks} · Completed: {activity.completedTasks}</li>
            {member.role !== 'analyst' && <li>Tasks delegated to others: {activity.tasksDelegated}</li>}
            <li>Team discussion posts: {activity.teamPosts}</li>
            <li>Learning sessions (30d): {activity.learningSessions}</li>
          </ul>

          <SectionTitle>Reports to</SectionTitle>
          {reportsTo ? (
            <p style={{ color: '#e5e7eb', fontSize: '0.8125rem', margin: '0 0 1rem' }}>
              {reportsTo.name}
              <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                {' '}
                ({reportsTo.sub_role || reportsTo.role.replace('_', ' ')})
              </span>
            </p>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1rem' }}>
              Council-level role — no direct report above in this chart.
            </p>
          )}

          {(member.role === 'executive' || member.role === 'portfolio_manager') && directReports.length > 0 && (
            <>
              <SectionTitle>{member.role === 'executive' ? 'Direct oversight' : 'Analysts on team'}</SectionTitle>
              <ul style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '0 0 1rem', paddingLeft: '1.1rem' }}>
                {directReports.slice(0, 8).map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
                {directReports.length > 8 && <li style={{ color: '#6b7280' }}>+{directReports.length - 8} more</li>}
              </ul>
            </>
          )}

          <SectionTitle>Interacts with most (demo)</SectionTitle>
          <div style={{ marginBottom: '1rem' }}>
            {topInteractions.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: 0 }}>No interaction data yet.</p>
            ) : (
              topInteractions.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0',
                    borderBottom: '1px solid rgba(99,102,241,0.06)',
                  }}
                >
                  <span style={{ color: '#e5e7eb', fontSize: '0.8125rem' }}>{m.name}</span>
                  <span style={{ color: '#6366f1', fontSize: '0.65rem', fontWeight: 700 }}>#{i + 1}</span>
                </div>
              ))
            )}
          </div>

          <SectionTitle>Send message</SectionTitle>
          {isSelf ? (
            <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>This is your profile.</p>
          ) : (
            <>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={`Message ${member.name}…`}
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: 88,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(99,102,241,0.25)',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#f0f6fc',
                  fontSize: '0.8125rem',
                  marginBottom: '0.6rem',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <i className="bi bi-send-fill" />
                Send message
              </button>
              <p style={{ color: '#52525b', fontSize: '0.65rem', margin: '0.5rem 0 0', textAlign: 'center' }}>
                Demo: message is not persisted; in production this would use org messaging.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
