'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DateSelector } from '@/components/ui/DateSelector';

const TERM_TYPES = [
  { v: 'semester', l: 'Semester' },
  { v: 'quarter', l: 'Quarter' },
  { v: 'year', l: 'Academic year' },
];

/* Sector lists are edited as text and split on save (cleanMandate). */
const asText = (v) => (Array.isArray(v) ? v.join(', ') : v || '');

export function FundConfig() {
  const [cfg, setCfg] = useState(null);
  const [orgName, setOrgName] = useState('Organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/fund-config', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load');
        if (!alive) return;
        setCfg(data.config);
        setOrgName(data.orgName || 'Organization');
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

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const save = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/org/fund-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setCfg(data.config);
      setMsg({ ok: 'Saved' });
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setSaving(false);
    }
  }, [cfg]);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Fund Configuration</h2>
        <p className="settings-panel-desc">
          {orgName}: how the fund is named and benchmarked, and the academic term it runs on.
        </p>
      </div>

      {loading || !cfg ? (
        <p className="sorg-fg-muted" style={{ fontSize: '0.85rem' }}>
          Loading…
        </p>
      ) : (
        <>
          <div className="settings-section">
            <div className="settings-section-title">Identity & benchmark</div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Fund display name</label>
                <input
                  className="settings-input"
                  value={cfg.fund_display_name}
                  placeholder={`${orgName} Fund`}
                  onChange={(e) => set('fund_display_name', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Benchmark symbol</label>
                <input
                  className="settings-input"
                  value={cfg.benchmark_symbol}
                  placeholder="SPY · XIU.TO · VFV.TO"
                  onChange={(e) => set('benchmark_symbol', e.target.value.toUpperCase())}
                />
                <span className="settings-field-hint">
                  Fund performance and alpha are measured against this symbol, and it&apos;s the
                  label shown on the Team Hub and Fund Analytics. Use any symbol Ezana can price
                  (e.g. SPY, XIU.TO, VFV.TO).
                </span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Academic term</div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Term type</label>
                <select
                  className="settings-input"
                  value={cfg.term_type}
                  onChange={(e) => set('term_type', e.target.value)}
                >
                  {TERM_TYPES.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="settings-field">
                <label className="settings-label">Term start</label>
                <DateSelector
                  mode="single"
                  variant="org"
                  value={cfg.term_start || ''}
                  onChange={(iso) => set('term_start', iso)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Term end</label>
                <DateSelector
                  mode="single"
                  variant="org"
                  value={cfg.term_end || ''}
                  onChange={(iso) => set('term_end', iso)}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Fund mandate</div>
            <p className="sorg-fg-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              Sonar reads this when a member asks whether the fund should invest in a company. It
              checks the company against these limits and your IPS rules, then tests it against the
              thesis.
            </p>
            <div className="settings-field">
              <label className="settings-label" htmlFor="fc-thesis">
                Investment thesis
              </label>
              <textarea
                id="fc-thesis"
                className="settings-input"
                rows={4}
                maxLength={4000}
                value={cfg.investment_thesis || ''}
                placeholder="Quality compounders with durable competitive advantages, held three to five years."
                onChange={(e) => set('investment_thesis', e.target.value)}
              />
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label" htmlFor="fc-style">
                  Style
                </label>
                <input
                  id="fc-style"
                  className="settings-input"
                  value={cfg.investment_style || ''}
                  placeholder="Long-only, fundamental, growth at a reasonable price"
                  onChange={(e) => set('investment_style', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="fc-horizon">
                  Horizon
                </label>
                <input
                  id="fc-horizon"
                  className="settings-input"
                  value={cfg.mandate_horizon || ''}
                  placeholder="3 to 5 years"
                  onChange={(e) => set('mandate_horizon', e.target.value)}
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label" htmlFor="fc-universe">
                  Universe
                </label>
                <input
                  id="fc-universe"
                  className="settings-input"
                  value={cfg.mandate_universe || ''}
                  placeholder="US and Canadian listed equities"
                  onChange={(e) => set('mandate_universe', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="fc-mincap">
                  Minimum market cap (US$ millions)
                </label>
                <input
                  id="fc-mincap"
                  className="settings-input"
                  type="number"
                  min={0}
                  value={cfg.min_market_cap_musd ?? ''}
                  placeholder="2000"
                  onChange={(e) => set('min_market_cap_musd', e.target.value)}
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label" htmlFor="fc-focus">
                  Focus sectors (comma separated)
                </label>
                <input
                  id="fc-focus"
                  className="settings-input"
                  value={asText(cfg.focus_sectors)}
                  placeholder="Technology, Healthcare"
                  onChange={(e) => set('focus_sectors', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label" htmlFor="fc-excluded">
                  Excluded sectors (comma separated)
                </label>
                <input
                  id="fc-excluded"
                  className="settings-input"
                  value={asText(cfg.excluded_sectors)}
                  placeholder="Tobacco, Weapons"
                  onChange={(e) => set('excluded_sectors', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Investment policy</div>
            <p className="sorg-fg-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              The IPS defines the fund&apos;s mandate, constraints, and compliance rules.
            </p>
            <Link href="/org-team-hub/compliance" className="sorg-ips-link">
              <i className="bi bi-file-earmark-ruled" /> Open Investment Policy editor
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="settings-btn-primary"
              onClick={save}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save fund configuration'}
            </button>
            {msg?.ok && <span className="sorg-msg-ok">✓ {msg.ok}</span>}
            {msg?.err && <span className="sorg-msg-err">{msg.err}</span>}
          </div>
        </>
      )}
    </div>
  );
}
