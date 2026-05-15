'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

const PREFS = [
  {
    key: 'earnings_alerts',
    label: 'Earnings Alerts',
    desc: 'Earnings beats/misses for your watchlist and portfolio tickers',
  },
  {
    key: 'macro_events',
    label: 'Macro Events',
    desc: 'Fed decisions, CPI, GDP, employment data releases',
  },
  {
    key: 'watchlist_movers',
    label: 'Watchlist Movers',
    desc: 'Significant price moves on tickers in your watchlists',
  },
  {
    key: 'portfolio_alerts',
    label: 'Portfolio Alerts',
    desc: 'News affecting your portfolio holdings',
  },
  {
    key: 'sector_shifts',
    label: 'Sector Shifts',
    desc: 'Sector rotation signals and sector-wide moves',
  },
  {
    key: 'congressional_trades',
    label: 'Congressional Trades',
    desc: 'New trade disclosures by Congress members',
  },
  {
    key: 'price_targets',
    label: 'Price Target Changes',
    desc: 'Analyst upgrades, downgrades, and price target revisions',
  },
  {
    key: 'breaking_news',
    label: 'Breaking News',
    desc: 'Critical market events (wars, crashes, emergency Fed actions)',
  },
  {
    key: 'weekly_digest',
    label: 'Weekly Digest',
    desc: 'Sunday summary of what matters for your portfolio this week',
  },
];

const SEVERITY_OPTIONS = [
  { value: 'routine', label: 'All notifications (including minor)' },
  { value: 'noteworthy', label: 'Noteworthy and critical only' },
  { value: 'critical', label: 'Critical only (emergencies)' },
];

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_interest_profiles')
        .select('notification_prefs')
        .eq('user_id', user.id)
        .maybeSingle();
      setPrefs(data?.notification_prefs || {});
      setLoading(false);
    })();
  }, []);

  const updatePref = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_interest_profiles')
      .upsert({ user_id: user.id, notification_prefs: updated }, { onConflict: 'user_id' });
  };

  if (loading) return <p className="settings-toggle-desc">Loading preferences…</p>;

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
        <i className="bi bi-sliders" /> In-app bell
      </h3>
      <p className="settings-toggle-desc" style={{ marginBottom: '0.75rem' }}>
        Choose which market signals can add items to your nav bell. Personalization uses your
        watchlist, mock portfolio, and recent activity.
      </p>

      <div className="settings-field" style={{ marginBottom: '0.75rem' }}>
        <label className="settings-label">Minimum severity</label>
        <select
          className="settings-input"
          value={prefs.min_severity || 'noteworthy'}
          onChange={(e) => updatePref('min_severity', e.target.value)}
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {PREFS.map((p) => (
        <div
          key={p.key}
          className="settings-toggle-row"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">{p.label}</span>
            <span className="settings-toggle-desc">{p.desc}</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${prefs[p.key] !== false ? 'on' : ''}`}
            onClick={() => updatePref(p.key, !(prefs[p.key] !== false))}
            aria-label={`Toggle ${p.label}`}
          />
        </div>
      ))}
    </div>
  );
}
