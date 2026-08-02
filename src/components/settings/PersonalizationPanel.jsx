'use client';

import { useState, useEffect } from 'react';

/**
 * Transparency + control for the interest profile that drives notification
 * relevance and Echo ranking. Shows the user exactly which interests we've
 * inferred (top per dimension) and lets them turn personalization off entirely.
 * Reads/writes /api/user/interest-profile (user-scoped).
 */

const DIMENSION_LABELS = {
  tickers: 'Tickers',
  sectors: 'Sectors',
  industries: 'Industries',
  entities: 'Companies & people',
  geographies: 'Geographies',
  themes: 'Themes',
  assetClasses: 'Asset classes',
};
const DIMENSION_ORDER = [
  'tickers',
  'sectors',
  'industries',
  'entities',
  'geographies',
  'themes',
  'assetClasses',
];

export function PersonalizationPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [interests, setInterests] = useState({});
  const [computedAt, setComputedAt] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/user/interest-profile', { credentials: 'include' });
        if (!res.ok) throw new Error('load failed');
        const data = await res.json();
        if (!active) return;
        setEnabled(data.personalization_enabled !== false);
        setInterests(data.interests || {});
        setComputedAt(data.last_computed_at || null);
      } catch {
        /* leave defaults */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await fetch('/api/user/interest-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ personalization_enabled: next }),
      });
    } catch {
      setEnabled(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="settings-toggle-desc">Loading personalization…</p>;

  const dims = DIMENSION_ORDER.filter((d) => (interests[d] || []).length > 0);

  return (
    <div
      className="settings-push-card settings-push-card--muted"
      style={{
        marginTop: '1.25rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h3 className="settings-section-title">
        <i className="bi bi-stars" /> Personalization
      </h3>
      <p className="settings-toggle-desc" style={{ marginBottom: '0.75rem' }}>
        We tailor which market signals reach your bell and how Ezana Echo is ranked, using the
        interests below — inferred from what you read, save, and explore. Turn this off to receive
        only severity-based alerts with no tailoring.
      </p>

      <div
        className="settings-toggle-row"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="settings-toggle-info">
          <span className="settings-toggle-label">Personalized relevance</span>
          <span className="settings-toggle-desc">
            {enabled ? 'On — signals ranked to your interests.' : 'Off — no personalization.'}
          </span>
        </div>
        <button
          type="button"
          className={`settings-switch ${enabled ? 'on' : ''}`}
          onClick={toggle}
          disabled={saving}
          aria-label="Toggle personalized relevance"
          aria-pressed={enabled}
        />
      </div>

      {enabled && (
        <div style={{ marginTop: '1rem' }}>
          <div
            className="settings-toggle-desc"
            style={{ marginBottom: '0.5rem', fontWeight: 600 }}
          >
            What we think you&rsquo;re interested in
          </div>
          {dims.length === 0 ? (
            <p className="settings-toggle-desc">
              Nothing yet — read a few Ezana Echo articles and this fills in.
            </p>
          ) : (
            dims.map((d) => (
              <div key={d} style={{ marginBottom: '0.6rem' }}>
                <div
                  className="settings-toggle-desc"
                  style={{ marginBottom: '0.3rem', opacity: 0.8 }}
                >
                  {DIMENSION_LABELS[d]}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {(interests[d] || []).map((it) => (
                    <span
                      key={it.value}
                      title={`score ${it.score}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        padding: '0.25rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid var(--border-input, rgba(255,255,255,0.14))',
                        color: 'var(--text-secondary, rgba(255,255,255,0.75))',
                      }}
                    >
                      {it.value}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
          {computedAt && (
            <p className="settings-toggle-desc" style={{ marginTop: '0.75rem', opacity: 0.6 }}>
              Last updated {new Date(computedAt).toLocaleDateString()}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
