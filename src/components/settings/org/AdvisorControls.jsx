'use client';

import { useEffect, useState, useCallback } from 'react';

const TOGGLES = [
  {
    key: 'students_see_peer_scorecards',
    label: "Students can see peers' scorecards",
    help: 'Off by default — keeps individual performance private. When on, analysts can view other analysts.',
  },
  {
    key: 'students_see_class_grade_distribution',
    label: 'Students can see the class grade distribution',
    help: 'Show the cohort-wide grade spread (not individual grades).',
  },
  {
    key: 'grading_visible_to_students',
    label: 'Grades are visible to students',
    help: 'When off, students cannot see their own grades until you re-enable it.',
  },
];

export function AdvisorControls() {
  const [gov, setGov] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/governance', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load');
        if (!alive) return;
        setGov(data.governance);
        setCanManage(!!data.viewer?.canManage);
      } catch (e) {
        if (alive) setMsg({ err: e.message });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const patch = useCallback(
    async (patchBody, optimistic) => {
      const prev = gov;
      setGov((g) => ({ ...g, ...optimistic }));
      setMsg(null);
      try {
        const res = await fetch('/api/org/governance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Save failed');
        setGov(data.governance);
        setMsg({ ok: 'Saved' });
        setTimeout(() => setMsg(null), 1500);
      } catch (e) {
        setGov(prev);
        setMsg({ err: e.message });
      }
    },
    [gov],
  );

  if (loading || !gov) {
    return (
      <div className="settings-panel">
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">Faculty Advisor Controls</h2>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Faculty Advisor Controls</h2>
        <p className="settings-panel-desc">
          Privacy and visibility for student performance data. These are enforced server-side
          wherever the data is served.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Visibility</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {TOGGLES.map((t) => {
            const on = !!gov[t.key];
            return (
              <div
                key={t.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '11px 13px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontSize: '0.86rem', fontWeight: 500 }}>{t.label}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: 2 }}>{t.help}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={!canManage}
                  onClick={() => patch({ [t.key]: !on }, { [t.key]: !on })}
                  style={{
                    width: 38,
                    height: 22,
                    borderRadius: 999,
                    border: 'none',
                    cursor: canManage ? 'pointer' : 'default',
                    background: on ? '#10b981' : 'rgba(255,255,255,0.14)',
                    position: 'relative',
                    flexShrink: 0,
                    opacity: canManage ? 1 : 0.5,
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
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Report export</div>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Who can export stakeholder reports</label>
            <select
              className="settings-input"
              disabled={!canManage}
              value={gov.who_can_export_reports}
              onChange={(e) =>
                patch({ who_can_export_reports: e.target.value }, { who_can_export_reports: e.target.value })
              }
            >
              <option value="exec_pm_advisor">Executives, PMs &amp; advisors</option>
              <option value="exec_advisor">Executives &amp; advisors only</option>
            </select>
          </div>
        </div>
      </div>

      {msg?.ok && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ {msg.ok}</span>}
      {msg?.err && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg.err}</span>}
    </div>
  );
}
