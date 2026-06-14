'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/contexts/OrgContext';

// Council-relevant notifications, filtered by role tier.
const ALL = [
  { key: 'pitch_submitted_my_team', label: 'A pitch is submitted to my team' },
  { key: 'committee_vote_opened', label: 'A committee vote opens' },
  { key: 'mention', label: 'I am @mentioned' },
  { key: 'recognition_received', label: 'I receive recognition' },
  { key: 'meeting_scheduled', label: 'A meeting is scheduled' },
];
const MANAGER = [
  { key: 'position_flagged', label: 'A position is flagged for review' },
  { key: 'ips_violation', label: 'An IPS violation is detected' },
  { key: 'new_member_joined', label: 'A new member joins the council' },
  { key: 'cohort_archived', label: 'A cohort is archived' },
];
const ADVISOR = [{ key: 'assignment_submitted_grading', label: 'An assignment is submitted for grading' }];

export function OrgNotificationPrefs() {
  const { isOrgUser, canManage, isExecutive, orgData } = useOrg();
  const isAdvisor = isExecutive && orgData?.member?.sub_role === 'Faculty Advisor';

  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOrgUser) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/notification-prefs', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (alive && res.ok) setPrefs(data.prefs || {});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isOrgUser]);

  const toggle = useCallback(
    async (key) => {
      const next = !(prefs[key] ?? true);
      setPrefs((p) => ({ ...p, [key]: next }));
      const res = await fetch('/api/org/notification-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_key: key, enabled: next }),
      });
      if (!res.ok) setPrefs((p) => ({ ...p, [key]: !next })); // rollback
    },
    [prefs],
  );

  if (!isOrgUser) return null;

  const items = [...ALL, ...(canManage ? MANAGER : []), ...(isAdvisor ? ADVISOR : [])];

  return (
    <div className="settings-section" style={{ marginTop: 24 }}>
      <div className="settings-section-title">Council notifications</div>
      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        Alerts specific to your investment council role.
      </p>
      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((it) => {
            const on = prefs[it.key] ?? true;
            return (
              <label
                key={it.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1, color: '#e2e8f0', fontSize: '0.84rem' }}>{it.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(it.key)}
                  style={{
                    width: 38,
                    height: 22,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: on ? '#10b981' : 'rgba(255,255,255,0.14)',
                    position: 'relative',
                    transition: 'background 0.12s ease',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: on ? 18 : 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.12s ease',
                    }}
                  />
                </button>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
