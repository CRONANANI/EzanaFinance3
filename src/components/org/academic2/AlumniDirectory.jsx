'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Star, X, Download, GraduationCap, Briefcase } from 'lucide-react';
import './cohort2.css';

const INDUSTRY_LABEL = {
  ib: 'Investment Banking',
  pe: 'Private Equity',
  am: 'Asset Management',
  consulting: 'Consulting',
  other: 'Other',
};
const FLAG_LABEL = {
  guest_speaker: 'Guest Speaker',
  mentor: 'Mentor',
  recruiter: 'Recruiter',
  donor: 'Donor',
};

function StatStrip({ stats }) {
  const tiles = [
    { label: 'Total alumni', value: stats?.total ?? '—' },
    {
      label: 'Placement rate',
      value: stats?.placement_rate_pct == null ? '—' : `${stats.placement_rate_pct}%`,
    },
    { label: 'Top sector', value: stats?.top_sector || '—' },
    { label: 'Engaged', value: stats?.engaged ?? '—' },
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

export function AlumniDirectory({ cohortId, canManage, onCount }) {
  const [data, setData] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [industry, setIndustry] = useState('');
  const [flag, setFlag] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    if (!cohortId) return;
    try {
      const params = new URLSearchParams({ cohort_id: cohortId });
      if (industry) params.set('industry', industry);
      if (flag) params.set('flag', flag);
      const [res, pres] = await Promise.all([
        fetch(`/api/org/alumni?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/org/alumni/placement?cohort_id=${cohortId}`, { cache: 'no-store' }),
      ]);
      const json = await res.json().catch(() => ({}));
      const pjson = await pres.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load alumni.');
        return;
      }
      setData(json);
      setPlacement(pjson);
      setError('');
      onCount?.(json.alumni?.length || 0);
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [cohortId, industry, flag, onCount]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading) return <div className="c2-state">Loading alumni…</div>;
  if (error) return <div className="c2-state c2-error">{error}</div>;

  const alumni = data?.alumni || [];
  const openAlum = alumni.find((a) => a.id === openId) || null;
  const hasAny = (placement?.total || 0) > 0;

  return (
    <div>
      <StatStrip stats={data?.stats} />

      {/* Placement banner — GOLD, screenshot / print-to-PDF */}
      {hasAny && (
        <div className="c2-print-area">
          <div className="c2-banner">
            <div className="c2-banner-head">
              <div>
                <div className="c2-eyebrow" style={{ color: 'var(--gold-text)' }}>
                  <Award size={13} style={{ verticalAlign: 'middle' }} /> Placement outcomes
                </div>
                <div className="c2-banner-headline">
                  {placement.placement_rate_pct == null ? '—' : `${placement.placement_rate_pct}%`}{' '}
                  placed in finance within 6 months
                </div>
              </div>
              <button
                type="button"
                className="c2-btn c2-btn--gold c2-no-print"
                onClick={() => window.print()}
              >
                <Download size={14} /> Export PDF
              </button>
            </div>
            <div className="c2-banner-grid">
              {(placement.destinations || []).map((d) => (
                <div key={d.key} className="c2-dest">
                  <b className="c2-num">{d.count}</b>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="c2-toolbar">
        <select
          className="c2-select"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="">All industries</option>
          {Object.entries(INDUSTRY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="c2-select" value={flag} onChange={(e) => setFlag(e.target.value)}>
          <option value="">All engagement</option>
          {Object.entries(FLAG_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {alumni.length === 0 ? (
        <div className="c2-empty">
          <GraduationCap size={28} />
          <p>No alumni yet.</p>
          <p style={{ fontSize: '0.82rem' }}>
            When a cohort graduates, members are frozen into the alumni record here.
          </p>
        </div>
      ) : (
        <div className="c2-grid">
          {alumni.map((a) => (
            <div
              key={a.id}
              className="c2-mcard"
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(a.id)}
              onKeyDown={(e) => e.key === 'Enter' && setOpenId(a.id)}
            >
              <div className="c2-mcard-head">
                <span className="c2-avatar">{initials(a.display_name)}</span>
                <div>
                  <div className="c2-card-name">{a.display_name}</div>
                  <div className="c2-card-meta">{a.grad_term || '—'}</div>
                </div>
              </div>
              <div className="c2-card-meta" style={{ marginTop: '0.5rem' }}>
                Was: {a.was_role || '—'}
                {a.sectors.length > 0 ? ` · ${a.sectors.join(', ')}` : ''}
              </div>
              <div
                style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}
              >
                <Briefcase size={12} style={{ verticalAlign: 'middle' }} /> Now:{' '}
                {a.role_title || '—'}
                {a.employer ? ` @ ${a.employer}` : ''}
              </div>
              <div className="c2-frozen" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                <Star size={12} fill="currentColor" style={{ verticalAlign: 'middle' }} />{' '}
                <span className="c2-num">{a.final_rating ?? 'pending'}</span> ·{' '}
                <span className="c2-num">{a.final_pitch_count ?? 0}</span> pitches
                <span style={{ fontSize: '0.7rem', display: 'block', opacity: 0.8 }}>
                  frozen at graduation
                </span>
              </div>
              {a.engagement_flags.length > 0 && (
                <div className="c2-card-row">
                  {a.engagement_flags.map((f) => (
                    <span key={f} className="c2-chip">
                      {FLAG_LABEL[f] || f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openAlum && (
        <AlumDetail
          alum={openAlum}
          canManage={canManage}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function AlumDetail({ alum, canManage, onClose, onChanged }) {
  const a = alum;
  const [edit, setEdit] = useState({
    employer: a.employer || '',
    employer_industry: a.employer_industry || '',
    role_title: a.role_title || '',
    linkedin_url: a.linkedin_url || '',
    placed_within_6mo: !!a.placed_within_6mo,
    engagement_flags: a.engagement_flags || [],
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setEdit((s) => ({ ...s, [k]: v }));
  const toggleFlag = (f) =>
    setEdit((s) => ({
      ...s,
      engagement_flags: s.engagement_flags.includes(f)
        ? s.engagement_flags.filter((x) => x !== f)
        : [...s.engagement_flags, f],
    }));

  const save = async () => {
    setBusy(true);
    try {
      await fetch('/api/org/alumni', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, ...edit }),
      });
      await onChanged?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="c2-slideover" role="dialog" aria-modal="true" aria-label="Alumni detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div className="c2-mcard-head">
            <span className="c2-avatar">{initials(a.display_name)}</span>
            <div>
              <div className="c2-modal-title" style={{ fontSize: '1.05rem' }}>
                {a.display_name}
              </div>
              <div className="c2-card-meta">{a.grad_term || '—'}</div>
            </div>
          </div>
          <button type="button" className="c2-btn c2-btn--sm" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="c2-frozen" style={{ marginTop: '0.8rem' }}>
          <div className="c2-eyebrow" style={{ color: 'var(--gold-text)' }}>
            Frozen scorecard
          </div>
          <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.3rem' }}>
            <div>
              <div className="c2-num" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {a.final_rating ?? 'pending'}
              </div>
              <div style={{ fontSize: '0.7rem' }}>final rating</div>
            </div>
            <div>
              <div className="c2-num" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {a.final_pitch_count ?? 0}
              </div>
              <div style={{ fontSize: '0.7rem' }}>pitches</div>
            </div>
          </div>
          {a.final_rating == null && (
            <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', opacity: 0.8 }}>
              Rating pending — no Ezana Rating was frozen for this member.
            </div>
          )}
        </div>

        <div className="c2-label">Coverage while active</div>
        <div className="c2-card-row">
          {a.sectors.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>None recorded.</span>
          ) : (
            a.sectors.map((s) => (
              <span key={s} className="c2-chip">
                {s}
              </span>
            ))
          )}
        </div>

        {canManage ? (
          <>
            <div className="c2-label">Placement</div>
            <div className="c2-label" style={{ marginTop: '0.4rem' }}>
              Employer
            </div>
            <input
              className="c2-input"
              style={{ width: '100%' }}
              value={edit.employer}
              onChange={(e) => set('employer', e.target.value)}
            />
            <div className="c2-label">Industry</div>
            <select
              className="c2-select"
              style={{ width: '100%' }}
              value={edit.employer_industry}
              onChange={(e) => set('employer_industry', e.target.value)}
            >
              <option value="">—</option>
              {Object.entries(INDUSTRY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="c2-label">Role title</div>
            <input
              className="c2-input"
              style={{ width: '100%' }}
              value={edit.role_title}
              onChange={(e) => set('role_title', e.target.value)}
            />
            <div className="c2-label">LinkedIn</div>
            <input
              className="c2-input"
              style={{ width: '100%' }}
              value={edit.linkedin_url}
              onChange={(e) => set('linkedin_url', e.target.value)}
            />
            <label
              style={{
                display: 'flex',
                gap: '0.4rem',
                alignItems: 'center',
                margin: '0.6rem 0',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={edit.placed_within_6mo}
                onChange={(e) => set('placed_within_6mo', e.target.checked)}
              />
              Placed in finance within 6 months
            </label>
            <div className="c2-label">Engagement</div>
            <div className="c2-card-row">
              {Object.entries(FLAG_LABEL).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  className={`c2-btn c2-btn--sm ${edit.engagement_flags.includes(k) ? 'c2-btn--gold' : ''}`}
                  onClick={() => toggleFlag(k)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="c2-modal-actions">
              <button type="button" className="c2-btn" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="c2-btn c2-btn--primary"
                onClick={save}
                disabled={busy}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="c2-label">Now</div>
            <div style={{ fontSize: '0.88rem' }}>
              {a.role_title || '—'}
              {a.employer ? ` @ ${a.employer}` : ''}
              {a.employer_industry ? ` · ${INDUSTRY_LABEL[a.employer_industry]}` : ''}
            </div>
            {a.linkedin_url && (
              <a
                className="c2-chip"
                href={a.linkedin_url}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: '0.5rem' }}
              >
                LinkedIn
              </a>
            )}
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
