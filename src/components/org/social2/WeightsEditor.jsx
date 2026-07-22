'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './recognition2.css';

const CATEGORY_LABELS = {
  calibration: 'Calibration',
  alpha_vs_sector: 'Alpha vs. Sector',
  research_output: 'Research Output',
  learning: 'Learning',
  task_efficiency: 'Task Efficiency',
  engagement: 'Engagement',
  strategy_pnl: 'Strategy PnL',
  execution_quality: 'Execution Quality',
  backtest_research: 'Backtest Research',
  portfolio_alpha: 'Portfolio Alpha',
  risk_management: 'Risk Management',
  allocation_discipline: 'Allocation Discipline',
  leadership: 'Leadership',
  team_uplift: 'Team Uplift',
  research_oversight: 'Research Oversight',
};
const ROLE_LABELS = {
  analyst: 'Analyst',
  quant_trader: 'Quant Trader',
  portfolio_manager: 'Portfolio Manager',
  vp: 'Vice President',
};

/** Manager modal: per-org overrides over the seeded platform-default weights. */
export function WeightsEditor({ open, onClose, onSaved }) {
  const [roles, setRoles] = useState([]);
  const [draft, setDraft] = useState({}); // role -> { category: weight }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/org/recognition/weights', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load weights.');
        return;
      }
      setRoles(json.roles || []);
      const d = {};
      for (const r of json.roles || []) {
        d[r.role] = {};
        for (const c of r.categories) d[r.role][c.category] = c.weight;
      }
      setDraft(d);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const setWeight = (role, category, value) => {
    setDraft((d) => ({ ...d, [role]: { ...d[role], [category]: value } }));
  };

  const saveRole = async (role) => {
    setSaving(role);
    setFlash('');
    setError('');
    const weights = Object.entries(draft[role] || {}).map(([category, weight]) => ({
      category,
      weight: Number(weight),
    }));
    try {
      const res = await fetch('/api/org/recognition/weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, weights }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Save failed.');
      } else {
        setFlash(`Saved ${ROLE_LABELS[role]} weights.`);
        onSaved?.();
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving('');
    }
  };

  return (
    <div
      className="sc2-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent', // no canvas dimming — modal elevation separates it
        display: 'grid',
        placeItems: 'center',
        zIndex: 60,
        padding: '1rem',
      }}
    >
      <div
        className="rec2-card sc2-root"
        role="dialog"
        aria-modal="true"
        aria-label="Rating weights"
        style={{ maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h2 className="rec2-hero-name" style={{ fontSize: '1.05rem' }}>
            Rating weights
          </h2>
          <button type="button" className="rec2-btn" onClick={onClose} aria-label="Close">
            <X size={14} aria-hidden />
          </button>
        </div>
        <p className="rec2-caveat" style={{ marginTop: 0 }}>
          Per-org overrides on top of the platform defaults. Calibration stays in every role.
        </p>

        {loading ? (
          <div className="rec2-empty">Loading weights…</div>
        ) : (
          roles.map((r) => {
            const total = Object.values(draft[r.role] || {}).reduce(
              (s, v) => s + (Number(v) || 0),
              0,
            );
            return (
              <div className="rec2-weights-role" key={r.role}>
                <div className="rec2-section-title" style={{ marginBottom: '0.4rem' }}>
                  {ROLE_LABELS[r.role]}
                </div>
                {r.categories.map((c) => (
                  <div className="rec2-weight-row" key={c.category}>
                    <span className="rec2-weight-cat">
                      {CATEGORY_LABELS[c.category] || c.category}
                    </span>
                    <input
                      className="rec2-weight-input"
                      type="number"
                      min={0}
                      max={100}
                      value={draft[r.role]?.[c.category] ?? ''}
                      onChange={(e) => setWeight(r.role, c.category, e.target.value)}
                    />
                  </div>
                ))}
                <div className="rec2-weight-total">Total: {Math.round(total)}</div>
                <button
                  type="button"
                  className="rec2-btn rec2-btn--primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={saving === r.role}
                  onClick={() => saveRole(r.role)}
                >
                  {saving === r.role ? 'Saving…' : `Save ${ROLE_LABELS[r.role]}`}
                </button>
              </div>
            );
          })
        )}

        {error && (
          <div className="rec2-empty" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        {flash && (
          <div className="rec2-caveat" style={{ color: 'var(--emerald-text)' }}>
            {flash}
          </div>
        )}
      </div>
    </div>
  );
}
