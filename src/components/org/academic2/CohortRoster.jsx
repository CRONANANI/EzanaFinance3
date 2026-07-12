'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  X,
  Star,
  GraduationCap,
  UserMinus,
  Users,
} from 'lucide-react';
import './cohort2.css';

const STATUS_LABEL = {
  active: 'Active',
  onboarding: 'Onboarding',
  on_leave: 'On leave',
  graduating: 'Graduating',
  alumni: 'Alumni',
  departed: 'Departed',
};

function Pill({ status }) {
  return <span className={`c2-pill c2-pill--${status}`}>{STATUS_LABEL[status] || status}</span>;
}

function StatStrip({ stats }) {
  const tiles = [
    { label: 'Active', value: stats?.active ?? '—' },
    { label: 'Retention', value: stats?.retention_pct == null ? '—' : `${stats.retention_pct}%` },
    { label: 'Avg rating', value: stats?.avg_rating ?? '—' },
    { label: 'Sectors covered', value: stats?.sectors_covered ?? '—' },
  ];
  return (
    <div className="c2-stats">
      {tiles.map((t) => (
        <div key={t.label} className="c2-stat">
          <div className="c2-stat-label">{t.label}</div>
          <div className="c2-stat-value">{t.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CohortRoster({ cohortId, canManage, onCount, onGoRecruit }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('grid');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [role, setRole] = useState('');
  const [openId, setOpenId] = useState(null);
  const [sort, setSort] = useState({ key: 'display_name', dir: 1 });

  const load = useCallback(async () => {
    if (!cohortId) return;
    try {
      const res = await fetch(`/api/org/cohorts/${cohortId}/roster`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load roster.');
        return;
      }
      setData(json);
      setError('');
      onCount?.(json.members?.length || 0);
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [cohortId, onCount]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const members = data?.members || [];
  const sectors = useMemo(() => {
    const set = new Set();
    for (const m of members) for (const s of m.sectors) set.add(s.sector);
    return [...set].sort();
  }, [members]);
  const roles = useMemo(() => [...new Set(members.map((m) => m.role))].sort(), [members]);

  const filtered = useMemo(() => {
    let rows = members.filter((m) => {
      if (q && !m.display_name.toLowerCase().includes(q.toLowerCase())) return false;
      if (status && m.lifecycle_status !== status) return false;
      if (role && m.role !== role) return false;
      if (sector && !m.sectors.some((s) => s.sector === sector)) return false;
      return true;
    });
    const { key, dir } = sort;
    rows = [...rows].sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      if (typeof av === 'number' || typeof bv === 'number') return ((av || 0) - (bv || 0)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [members, q, status, role, sector, sort]);

  if (loading) return <div className="c2-state">Loading roster…</div>;
  if (error) return <div className="c2-state c2-error">{error}</div>;

  const openMember = members.find((m) => m.id === openId) || null;
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));

  return (
    <div>
      <StatStrip stats={data?.stats} />

      <div className="c2-toolbar">
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }}
          />
          <input
            className="c2-input"
            placeholder="Search members"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        <select className="c2-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABEL).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select className="c2-select" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="c2-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>
        <div className="c2-spacer" />
        <div className="c2-toggle-group" role="group" aria-label="View mode">
          <button
            className={view === 'grid' ? 'is-on' : ''}
            onClick={() => setView('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={view === 'table' ? 'is-on' : ''}
            onClick={() => setView('table')}
            aria-label="Table view"
          >
            <TableIcon size={15} />
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="c2-empty">
          <Users size={28} />
          <p>No members in this cohort yet.</p>
          <button type="button" className="c2-btn c2-btn--primary" onClick={onGoRecruit}>
            Go to Recruitment
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="c2-grid">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="c2-mcard"
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(m.id)}
              onKeyDown={(e) => e.key === 'Enter' && setOpenId(m.id)}
            >
              <div className="c2-mcard-head">
                <span className="c2-avatar">{initials(m.display_name)}</span>
                <div>
                  <div className="c2-card-name">{m.display_name}</div>
                  <div className="c2-card-meta">{m.title || m.role?.replace('_', ' ')}</div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <Pill status={m.lifecycle_status} />
              </div>
              <div className="c2-mcard-stats">
                <div>
                  <b>{m.rating != null ? m.rating : '—'}</b>rating
                </div>
                <div>
                  <b>{m.pitch_count}</b>pitches
                </div>
                <div>
                  <b>{m.sectors.length}</b>sectors
                </div>
              </div>
              <div className="c2-card-meta" style={{ marginTop: '0.4rem' }}>
                {m.joined_at ? `Since ${new Date(m.joined_at).toLocaleDateString()}` : 'Since —'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="c2-table-wrap">
          <table className="c2-table">
            <thead>
              <tr>
                {[
                  ['display_name', 'Name'],
                  ['role', 'Role'],
                  ['lifecycle_status', 'Status'],
                  ['rating', 'Rating'],
                  ['pitch_count', 'Pitches'],
                  ['joined_at', 'Joined'],
                ].map(([k, label]) => (
                  <th key={k} onClick={() => toggleSort(k)}>
                    {label} {sort.key === k ? (sort.dir === 1 ? '↑' : '↓') : ''}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  tabIndex={0}
                  onClick={() => setOpenId(m.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {m.display_name}
                  </td>
                  <td>{m.role?.replace('_', ' ')}</td>
                  <td>
                    <Pill status={m.lifecycle_status} />
                  </td>
                  <td className="c2-num">{m.rating ?? '—'}</td>
                  <td className="c2-num">{m.pitch_count}</td>
                  <td className="c2-num">
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="c2-btn c2-btn--sm"
                      onClick={(e) => (e.stopPropagation(), setOpenId(m.id))}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openMember && (
        <MemberSlideOver
          member={openMember}
          canManage={canManage}
          cohortId={cohortId}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function MemberSlideOver({ member, canManage, cohortId, onClose, onChanged }) {
  const m = member;
  const [busy, setBusy] = useState(false);

  const setLifecycle = async (lifecycle_status, extra = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/cohorts/${cohortId}/lifecycle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: m.id, lifecycle_status, ...extra }),
      });
      if (res.ok) {
        await onChanged?.();
        onClose();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const depart = () => {
    const reason = window.prompt('Departure reason:', '');
    if (reason === null) return;
    setLifecycle('departed', { departure_reason: reason });
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="c2-slideover" role="dialog" aria-modal="true" aria-label="Member detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div className="c2-mcard-head">
            <span className="c2-avatar">{initials(m.display_name)}</span>
            <div>
              <div className="c2-modal-title" style={{ fontSize: '1.05rem' }}>
                {m.display_name}
              </div>
              <div className="c2-card-meta">{m.title || m.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button type="button" className="c2-btn c2-btn--sm" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div style={{ marginTop: '0.6rem' }}>
          <Pill status={m.lifecycle_status} />
        </div>

        <div className="c2-mcard-stats" style={{ marginTop: '0.9rem' }}>
          <div>
            <b>
              <Star size={12} style={{ verticalAlign: 'middle' }} /> {m.rating ?? '—'}
            </b>
            rating {m.rating_provisional ? '(prov.)' : ''}
          </div>
          <div>
            <b>{m.pitch_count}</b>pitches
          </div>
        </div>

        <div className="c2-label">Sectors</div>
        <div className="c2-card-row">
          {m.sectors.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>None assigned.</span>
          ) : (
            m.sectors.map((s) => (
              <span key={s.sector} className="c2-chip">
                {s.sector}
                {s.isPrimary ? ' ★' : ''}
              </span>
            ))
          )}
        </div>

        <div className="c2-label">Mentor</div>
        <div style={{ fontSize: '0.85rem' }}>{m.mentor_name || 'Unpaired'}</div>

        {m.departed_at && (
          <div className="c2-note c2-note--warn" style={{ marginTop: '0.8rem' }}>
            Departed {new Date(m.departed_at).toLocaleDateString()}
            {m.departure_reason ? ` — ${m.departure_reason}` : ''}
          </div>
        )}

        {canManage && m.lifecycle_status !== 'alumni' && m.lifecycle_status !== 'departed' && (
          <>
            <div className="c2-label">Lifecycle actions</div>
            <div className="c2-card-row">
              {m.lifecycle_status === 'onboarding' && (
                <button
                  type="button"
                  className="c2-btn"
                  onClick={() => setLifecycle('active')}
                  disabled={busy}
                >
                  Promote to active
                </button>
              )}
              {m.lifecycle_status === 'active' && (
                <button
                  type="button"
                  className="c2-btn"
                  onClick={() => setLifecycle('on_leave')}
                  disabled={busy}
                >
                  Mark on leave
                </button>
              )}
              {m.lifecycle_status === 'on_leave' && (
                <button
                  type="button"
                  className="c2-btn"
                  onClick={() => setLifecycle('active')}
                  disabled={busy}
                >
                  Return to active
                </button>
              )}
              <button
                type="button"
                className="c2-btn c2-btn--gold"
                onClick={() => setLifecycle('graduating')}
                disabled={busy}
              >
                <GraduationCap size={14} /> Begin graduation
              </button>
              <button
                type="button"
                className="c2-btn c2-btn--danger"
                onClick={depart}
                disabled={busy}
              >
                <UserMinus size={14} /> Depart
              </button>
            </div>
            <p className="c2-sub" style={{ marginTop: '0.5rem' }}>
              &quot;Begin graduation&quot; flags the member so the cohort archive/graduation flow
              moves them to alumni.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function initials(name) {
  const p = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!p.length) return '—';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
