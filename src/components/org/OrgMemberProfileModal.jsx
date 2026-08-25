'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/components/ThemeProvider';
import { useOrg } from '@/contexts/OrgContext';
import { AnalystScorecard } from '@/components/org/analytics2/AnalystScorecard';
import { CompetitionTrophies } from '@/components/org/competitions/CompetitionTrophies';

const UUID_RE = /^[0-9a-f-]{36}$/i;

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

function SectionTitle({ children, isDark }) {
  return (
    <p
      style={{
        color: isDark ? '#9ca3af' : '#64748b',
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

export function OrgMemberProfileModal({ member, isOpen, onClose, viewerMemberId, onSendToTeam }) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { orgData } = useOrg();
  const isDark = theme === 'dark';
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [chart, setChart] = useState(null);

  // Real reporting lines + coverage come from the org chart (org_members
  // reports_to / org_sector_coverage) — never mock helpers keyed by mock ids.
  const memberIsUuid = UUID_RE.test(member?.id || '');
  useEffect(() => {
    if (!isOpen || !memberIsUuid) {
      setChart(null);
      return undefined;
    }
    let alive = true;
    fetch('/api/org/chart')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setChart(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isOpen, memberIsUuid, member?.id]);

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

  // Real relationships from the chart payload (falls back to empty until loaded).
  const chartMembers = chart?.members || [];
  const chartSelf = chartMembers.find((m) => m.id === member.id) || null;
  const reportsToId = chartSelf?.reports_to ?? member.reports_to ?? null;
  const reportsTo = reportsToId ? chartMembers.find((m) => m.id === reportsToId) : null;
  const directReports = chartMembers.filter((m) => m.reports_to === member.id);
  const coverageSectors = (chartSelf?.sectors || []).map((s) => s.sector);
  const team = (orgData?.teams || []).find((t) => t.id === member.team_id) || null;
  const memberName = (m) => m?.display_name || m?.name || 'Member';
  const isSelf = viewerMemberId && member.id === viewerMemberId;

  const cardBg = isDark ? '#0d1117' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(99,102,241,0.2)' : '1px solid #e5e7eb';
  const heading = isDark ? '#f0f6fc' : '#111827';
  const body = isDark ? '#d1d5db' : '#374151';
  const bodySecondary = isDark ? '#cbd5e1' : '#4b5563';
  const muted = isDark ? '#8b949e' : '#6b7280';
  const meta = muted;
  const closeBtnBg = 'transparent';
  const closeBtnBorder = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb';
  const textareaBg = isDark ? 'rgba(0,0,0,0.25)' : '#f9fafb';
  const textareaColor = isDark ? '#f0f6fc' : '#111827';

  const sendMessage = async () => {
    const trimmed = messageBody.trim();
    if (!trimmed) {
      toast.warning('Write a message before sending.');
      return;
    }
    if (isSelf) {
      toast.info('You cannot message yourself.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/org/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_member_id: member.id,
          subject: 'Direct message',
          body: trimmed,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }
      toast.success(`Message sent to ${member.name}`);
      setMessageBody('');
    } catch (e) {
      toast.error(e.message || 'Could not send message. Try again.');
    } finally {
      setSending(false);
    }
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
        // No scrim/blur — the page behind stays crisp; the modal's own elevation
        // (shadow + border) separates it from the canvas instead of dimming it.
        background: 'transparent',
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
          background: cardBg,
          border: cardBorder,
          boxShadow: isDark ? '0 24px 48px rgba(0,0,0,0.45)' : '0 24px 48px rgba(0,0,0,0.12)',
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
            borderBottom: isDark ? '1px solid rgba(99,102,241,0.1)' : '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AvatarCircle name={member.name} role={member.role} size={52} />
            <div>
              <h2
                id="org-member-profile-title"
                style={{ color: heading, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}
              >
                {member.name}
              </h2>
              <p
                style={{
                  color: '#818cf8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  margin: '4px 0 0',
                }}
              >
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
              background: closeBtnBg,
              border: closeBtnBorder,
              borderRadius: '8px',
              color: muted,
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
          {/^[0-9a-f-]{36}$/i.test(member.id || '') && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowScorecard((s) => !s)}
                style={{
                  font: 'inherit',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.45rem 0.85rem',
                  borderRadius: 9,
                  border: '1px solid rgba(16,185,129,0.4)',
                  background: showScorecard ? '#10b981' : 'transparent',
                  color: showScorecard ? '#04130d' : '#10b981',
                  cursor: 'pointer',
                }}
              >
                <i className="bi bi-clipboard-data" style={{ marginRight: 6 }} />
                {showScorecard ? 'Hide scorecard' : 'View analyst scorecard'}
              </button>
              {showScorecard && (
                <div style={{ marginTop: '0.85rem' }}>
                  <AnalystScorecard memberId={member.id} embedded />
                </div>
              )}
            </div>
          )}

          {/^[0-9a-f-]{36}$/i.test(member.id || '') && <CompetitionTrophies memberId={member.id} />}

          <SectionTitle isDark={isDark}>Contact</SectionTitle>
          <p style={{ color: body, fontSize: '0.8125rem', margin: '0 0 1rem' }}>
            <i className="bi bi-envelope" style={{ marginRight: 6, opacity: 0.7 }} />
            {member.email || '—'}
          </p>

          {coverageSectors.length > 0 && (
            <>
              <SectionTitle isDark={isDark}>Sector coverage</SectionTitle>
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0 0 1rem' }}
              >
                {coverageSectors.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '0.6875rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'var(--info-bg, rgba(99,102,241,0.1))',
                      color: 'var(--info)',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          <SectionTitle isDark={isDark}>Reports to</SectionTitle>
          {reportsTo ? (
            <p
              style={{
                color: isDark ? '#e5e7eb' : '#374151',
                fontSize: '0.8125rem',
                margin: '0 0 1rem',
              }}
            >
              {memberName(reportsTo)}
              <span style={{ color: meta, fontSize: '0.7rem' }}>
                {' '}
                ({reportsTo.sub_role || (reportsTo.role || '').replace('_', ' ')})
              </span>
            </p>
          ) : (
            <p style={{ color: meta, fontSize: '0.8125rem', margin: '0 0 1rem' }}>
              Council-level role — no direct report above in this chart.
            </p>
          )}

          {(member.role === 'executive' || member.role === 'portfolio_manager') &&
            directReports.length > 0 && (
              <>
                <SectionTitle isDark={isDark}>
                  {member.role === 'executive' ? 'Direct oversight' : 'Analysts on team'}
                </SectionTitle>
                <ul
                  style={{
                    color: bodySecondary,
                    fontSize: '0.78rem',
                    margin: '0 0 1rem',
                    paddingLeft: '1.1rem',
                  }}
                >
                  {directReports.slice(0, 8).map((m) => (
                    <li key={m.id}>{memberName(m)}</li>
                  ))}
                  {directReports.length > 8 && (
                    <li style={{ color: meta }}>+{directReports.length - 8} more</li>
                  )}
                </ul>
              </>
            )}

          <SectionTitle isDark={isDark}>Send message</SectionTitle>
          {isSelf ? (
            <p style={{ color: meta, fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>
              This is your profile.
            </p>
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
                  background: textareaBg,
                  color: textareaColor,
                  fontSize: '0.8125rem',
                  marginBottom: '0.6rem',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !messageBody.trim() || isSelf}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--emerald)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: sending || !messageBody.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !messageBody.trim() ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <i className="bi bi-send-fill" />
                {sending ? 'Sending…' : 'Send'}
              </button>
              {onSendToTeam && (
                <button
                  type="button"
                  onClick={() => onSendToTeam(member)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    marginTop: '0.5rem',
                    background: 'var(--emerald-bg)',
                    border: '1px solid var(--emerald-border)',
                    borderRadius: 6,
                    color: 'var(--emerald)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <i className="bi bi-share" />
                  Send Chart, News, or Model to {member.name.split(' ')[0]}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
