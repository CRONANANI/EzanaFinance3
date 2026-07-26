'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import './competitions.css';

const FIELDS = [
  { key: 'roi_pct', label: 'ROI %', hint: 'Period return' },
  { key: 'sharpe', label: 'Sharpe', hint: 'Risk-adjusted — weighted most' },
  { key: 'max_drawdown_pct', label: 'Max drawdown %', hint: 'Largest peak-to-trough' },
  { key: 'volatility_pct', label: 'Volatility %', hint: 'Std. dev of returns' },
  { key: 'benchmark_alpha_pct', label: 'Alpha %', hint: 'vs benchmark' },
];

const TIER_LABEL = { emerging: 'Emerging', competitive: 'Competitive', established: 'Established', elite: 'Elite', dynasty: 'Dynasty' };

export function CouncilFundClient() {
  const [state, setState] = useState('loading');
  const [elo, setElo] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/council/fund-metrics', { cache: 'no-store' });
        if (!alive) return;
        if (!res.ok) return setState('error');
        const json = await res.json();
        setElo(json.elo);
        setCanManage(!!json.canManage);
        const m = json.metrics || {};
        setForm({
          roi_pct: m.roi_pct ?? '',
          sharpe: m.sharpe ?? '',
          max_drawdown_pct: m.max_drawdown_pct ?? '',
          volatility_pct: m.volatility_pct ?? '',
          benchmark_alpha_pct: m.benchmark_alpha_pct ?? '',
          period_label: m.period_label ?? '',
        });
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch('/api/org/council/fund-metrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <div className="pcx-page"><div className="pcx-empty pcx-empty--sm"><Loader2 size={18} className="pcx-spin" /> Loading…</div></div>;
  if (state === 'error') return <div className="pcx-page"><div className="pcx-empty pcx-empty--sm">Could not load your council ranking.</div></div>;

  return (
    <div className="pcx-page">
      <header className="pcx-cc-head">
        <div className="pcx-cc-title-row">
          <Trophy size={18} aria-hidden="true" />
          <h1 className="pcx-h1">Council ranking</h1>
        </div>
        <p className="pcx-lead">
          Your council&apos;s public standing blends judged competition results with your fund
          performance ratios. <strong>Dollar amounts are never shown</strong> — only ROI, Sharpe, and
          other ratios.
        </p>
      </header>

      <div className="pcx-cc-links">
        <Link href="/council-rankings" className="pcx-btn" target="_blank">
          View public leaderboard <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>

      {elo ? (
        <div className="pcx-stat-row">
          <div className="pcx-stat">
            <div className="pcx-stat-value">{elo.current_rating}</div>
            <div className="pcx-stat-label">Rating</div>
            <div className="pcx-stat-sub">{TIER_LABEL[elo.tier] || elo.tier}</div>
          </div>
          <div className="pcx-stat">
            <div className="pcx-stat-value">{elo.competition_rating}</div>
            <div className="pcx-stat-label">Competition</div>
            <div className="pcx-stat-sub">judged</div>
          </div>
          <div className="pcx-stat">
            <div className="pcx-stat-value">{elo.fund_rating}</div>
            <div className="pcx-stat-label">Fund</div>
            <div className="pcx-stat-sub">self-reported</div>
          </div>
          <div className="pcx-stat">
            <div className="pcx-stat-value">{elo.peak_rating}</div>
            <div className="pcx-stat-label">Peak</div>
          </div>
        </div>
      ) : (
        <p className="pcx-muted pcx-note">No rating yet — it appears after your teams compete or you report fund ratios.</p>
      )}

      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Fund ratios</h2>
        <p className="pcx-muted pcx-note">
          These feed your council&apos;s public ranking. Sharpe (risk-adjusted) is weighted more than raw
          ROI. Enter ratios and percentages only — never dollar amounts. Numbers are flagged
          self-reported on the leaderboard.
        </p>
        {!canManage ? (
          <div className="pcx-error--banner pcx-lock">
            <ShieldAlert size={15} aria-hidden="true" /> Only executives and VPs can edit fund metrics.
          </div>
        ) : null}
        <div className="pcx-form-grid">
          <label className="pcx-field">
            <span className="pcx-field-label">Period label</span>
            <input className="pcx-input" value={form.period_label} disabled={!canManage} onChange={(e) => setForm({ ...form, period_label: e.target.value })} placeholder="CY2025" />
          </label>
          {FIELDS.map((f) => (
            <label className="pcx-field" key={f.key}>
              <span className="pcx-field-label">{f.label}</span>
              <input className="pcx-input" type="number" step="0.01" value={form[f.key]} disabled={!canManage} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.hint} />
            </label>
          ))}
        </div>
        {canManage ? (
          <div className="pcx-rubric-actions">
            <button type="button" className="pcx-btn pcx-btn--primary" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={14} className="pcx-spin" /> : null} Save fund ratios
            </button>
            {saved ? <span className="pcx-saved">Saved — the ranking recomputes on the next cycle.</span> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
