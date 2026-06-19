'use client';

import { useState, useEffect, useCallback } from 'react';
import { CREATOR_TIER_LIST } from '@/lib/creator-tiers';
import './partner-management-panel.css';

export function PartnerManagementPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);

  useEffect(() => {
    fetch('/api/admin/users/list', { method: 'OPTIONS' })
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, []);

  const loadUsers = useCallback(async (searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const url = searchTerm
        ? `/api/admin/users/list?q=${encodeURIComponent(searchTerm)}&limit=50`
        : '/api/admin/users/list?limit=50';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load');
        return;
      }
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => loadUsers(query), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [isAdmin, query, loadUsers]);

  const togglePartner = async (userId, currentValue) => {
    setPendingUserId(userId);
    try {
      const res = await fetch('/api/admin/users/partner-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isPartner: !currentValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Toggle failed');
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                is_partner: !currentValue,
                creator_tier: !currentValue ? u.creator_tier || 'creator' : null,
              }
            : u,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingUserId(null);
    }
  };

  const setTier = async (userId, tier) => {
    setPendingUserId(userId);
    try {
      const res = await fetch('/api/admin/users/partner-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isPartner: true, creatorTier: tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update failed');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_partner: true, creator_tier: tier } : u)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="pmp-panel">
        <h2 className="pmp-title">Partner Management</h2>
        <div className="pmp-empty">Admin access required.</div>
      </div>
    );
  }

  const partnerCount = users.filter((u) => u.is_partner).length;

  return (
    <div className="pmp-panel">
      <header className="pmp-header">
        <h2 className="pmp-title">Partner Management</h2>
        <p className="pmp-subtitle">
          Toggle partner status on any user, then set their creator tier. Every partner is a
          verified Creator; promote standout voices to Featured (discovery placement) or Signature
          (marquee). The designation shows on their posts and profile across the community.
        </p>
        <div className="pmp-summary">
          <span className="pmp-summary-stat">
            <strong>{partnerCount}</strong> {partnerCount === 1 ? 'partner' : 'partners'} in current
            view
          </span>
        </div>
      </header>

      <div className="pmp-search">
        <i className="bi bi-search pmp-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username…"
          className="pmp-search-input"
        />
      </div>

      {error && <div className="pmp-error">{error}</div>}

      {loading && <div className="pmp-empty">Loading…</div>}

      {!loading && users.length === 0 && (
        <div className="pmp-empty">{query ? 'No users match that search.' : 'No users found.'}</div>
      )}

      {!loading && users.length > 0 && (
        <ul className="pmp-list">
          {users.map((u) => (
            <li key={u.id} className={`pmp-row ${u.is_partner ? 'is-partner' : ''}`}>
              <div className="pmp-user">
                <div className={`pmp-avatar ${u.is_partner ? 'pmp-avatar--partner' : ''}`}>
                  {(u.full_name || u.username || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="pmp-user-text">
                  <div className="pmp-user-name">
                    {u.full_name || u.username || 'Unnamed'}
                    {u.is_partner && (
                      <span className="pmp-badge">
                        <i className="bi bi-check-circle-fill" /> Partner
                      </span>
                    )}
                  </div>
                  <div className="pmp-user-meta">@{u.username || u.id.slice(0, 8)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {u.is_partner && (
                  <select
                    className="pmp-tier-select"
                    value={u.creator_tier || 'creator'}
                    onChange={(e) => setTier(u.id, e.target.value)}
                    disabled={pendingUserId === u.id}
                    aria-label={`Creator tier for ${u.full_name || u.username}`}
                    style={{
                      background: 'var(--bg-tertiary, #161b22)',
                      color: 'inherit',
                      border: '1px solid var(--border-secondary, #30363d)',
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {CREATOR_TIER_LIST.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className={`pmp-toggle ${u.is_partner ? 'is-on' : ''}`}
                  onClick={() => togglePartner(u.id, u.is_partner)}
                  disabled={pendingUserId === u.id}
                  aria-label={`Toggle partner status for ${u.full_name || u.username}`}
                >
                  <span className="pmp-toggle-knob" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
