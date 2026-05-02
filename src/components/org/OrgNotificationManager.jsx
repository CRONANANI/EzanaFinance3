'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { getManageableOrgPeers } from '@/lib/orgMockData';
import { supabase } from '@/lib/supabase';

const NOTIFICATION_KEYS = [
  { key: 'position_flags', label: 'Position flags', desc: 'Red/green flags on portfolio positions' },
  { key: 'team_messages', label: 'Team messages', desc: 'Direct messages from org members' },
  { key: 'content_shares', label: 'Content shares', desc: 'News, charts, models shared by teammates' },
  { key: 'earnings_alerts', label: 'Earnings alerts', desc: 'Upcoming earnings for covered tickers' },
  { key: 'market_events', label: 'Market events', desc: 'High-impact economic events' },
  { key: 'task_reminders', label: 'Task reminders', desc: 'Upcoming deadlines and assigned tasks' },
  { key: 'weekly_digest', label: 'Weekly digest', desc: 'Weekly summary email of team activity' },
];

export function OrgNotificationManager() {
  const { orgData, hasPermission } = useOrg();
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [prefs, setPrefs] = useState({});
  const [orgPeers, setOrgPeers] = useState([]);

  useEffect(() => {
    if (!orgData?.org?.id) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('org_members')
        .select('id, display_name, role, sub_role, team_id')
        .eq('org_id', orgData.org.id)
        .eq('is_active', true);
      if (!cancelled && !error) setOrgPeers(data || []);
    })();
    return () => { cancelled = true; };
  }, [orgData?.org?.id]);

  const manageableMembers = useMemo(
    () => (orgData?.member ? getManageableOrgPeers(orgData.member, orgPeers) : []),
    [orgData?.member, orgPeers]
  );

  const canManageOthers =
    hasPermission('manage_subordinate_notifications') && manageableMembers.length > 0;

  useEffect(() => {
    if (!selectedMemberId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/org/notification-prefs?member_id=${selectedMemberId}`);
        const d = r.ok ? await r.json() : { prefs: {} };
        if (!cancelled) setPrefs(d.prefs || {});
      } catch {
        if (!cancelled) setPrefs({});
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMemberId]);

  useEffect(() => {
    if (!orgData?.member?.id) return;
    setSelectedMemberId(orgData.member.id);
  }, [orgData?.member?.id]);

  const togglePref = async (key) => {
    const current = prefs[key] ?? true;
    const updated = !current;
    setPrefs((p) => ({ ...p, [key]: updated }));

    const isOwnPref = selectedMemberId === orgData?.member?.id;

    try {
      const res = await fetch('/api/org/notification-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_member_id: selectedMemberId,
          notification_key: key,
          enabled: updated,
          managed_by: isOwnPref ? null : orgData?.member?.id,
        }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      setPrefs((p) => ({ ...p, [key]: current }));
    }
  };

  const selectedRow = orgPeers.find((p) => p.id === selectedMemberId);
  const selectedMember =
    selectedRow ||
    (selectedMemberId === orgData?.member?.id ? orgData.member : null);
  const selectedLabel =
    selectedRow?.display_name || orgData?.member?.display_name || 'Member';

  return (
    <div className="ot-team-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f0f6fc' }}>
            <i className="bi bi-bell" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
            Notification Settings
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#8b949e' }}>
            {canManageOthers
              ? 'Manage your own toggles or set them for your reports.'
              : 'Manage your notification preferences.'}
          </p>
        </div>
      </div>

      {canManageOthers && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`ot-btn-secondary ${selectedMemberId === orgData?.member?.id ? 'is-active' : ''}`}
            style={
              selectedMemberId === orgData?.member?.id
                ? {
                    background: 'rgba(99,102,241,0.18)',
                    borderColor: 'rgba(99,102,241,0.4)',
                    color: '#f0f6fc',
                  }
                : {}
            }
            onClick={() => setSelectedMemberId(orgData?.member?.id)}
          >
            My Settings
          </button>
          {manageableMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`ot-btn-secondary ${selectedMemberId === m.id ? 'is-active' : ''}`}
              style={
                selectedMemberId === m.id
                  ? {
                      background: 'rgba(99,102,241,0.18)',
                      borderColor: 'rgba(99,102,241,0.4)',
                      color: '#f0f6fc',
                    }
                  : {}
              }
              onClick={() => setSelectedMemberId(m.id)}
            >
              {m.display_name || 'Member'}
            </button>
          ))}
        </div>
      )}

      {selectedMember && selectedMemberId !== orgData?.member?.id && (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            background: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 4,
            marginBottom: '1rem',
            fontSize: '0.75rem',
            color: '#c9d1d9',
          }}
        >
          <strong style={{ color: '#f59e0b' }}>Managing for {selectedLabel}</strong> (
          {selectedRow?.sub_role || selectedMember.sub_role || selectedMember.role}).
          Changes you make here will override their defaults. They can still adjust their own toggles — your overrides
          take precedence until updated.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {NOTIFICATION_KEYS.map((nk) => {
          const enabled = prefs[nk.key] ?? true;
          return (
            <div
              key={nk.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.85rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f0f6fc' }}>{nk.label}</div>
                <div style={{ fontSize: '0.65rem', color: '#8b949e' }}>{nk.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => togglePref(nk.key)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: enabled ? '#6366f1' : 'rgba(255,255,255,0.08)',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                aria-pressed={enabled}
                aria-label={`${enabled ? 'Disable' : 'Enable'} ${nk.label}`}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: enabled ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
