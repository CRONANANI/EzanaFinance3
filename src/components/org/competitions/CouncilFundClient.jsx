'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { orgRequest } from '@/lib/org-request';
import '@/components/org/command-center/command-center.css';
import './competitions.css';
import '@/styles/home-canvas.css';

const FIELDS = [
  { key: 'roi_pct', label: 'ROI %', hint: 'Period return' },
  { key: 'sharpe', label: 'Sharpe', hint: 'Risk-adjusted, weighted most' },
  { key: 'max_drawdown_pct', label: 'Max drawdown %', hint: 'Largest peak-to-trough' },
  { key: 'volatility_pct', label: 'Volatility %', hint: 'Std. dev of returns' },
  { key: 'benchmark_alpha_pct', label: 'Alpha %', hint: 'vs benchmark' },
];

const TIER_LABEL = {
  emerging: 'Emerging',
  competitive: 'Competitive',
  established: 'Established',
  elite: 'Elite',
  dynasty: 'Dynasty',
};

export function CouncilFundClient() {
  const [state, setState] = useState('loading');
  const [elo, setElo] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

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
    setSaveError('');
    try {
      await orgRequest('/api/org/council/fund-metrics', {
        method: 'PUT',
        json: form,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.message || 'Could not save fund ratios.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading')
    return (
      <div className="pcx-page">
        <div className="pcx-skel" aria-busy="true" aria-label="Loading the council rating">
          {[40, 70, 60, 80].map((w) => (
            <span key={w} className="tcc-skel" style={{ width: `${w}%`, height: 14 }} />
          ))}
        </div>
      </div>
    );
  if (state === 'error')
    return (
      <div className="pcx-page">
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Could not load the council rating. Reload the page to try again.</span>
        </p>
      </div>
    );

  return (
    <div className="pcx-page">
      <header className="pcx-ws">
        <Link href="/org-competitions?tab=fund" className="pcx-ws__back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Fund challenges
        </Link>
        <div className="pcx-ws__row">
          <div className="pcx-ws__name">
            <h1 className="pcx-ws__title">Council rating and fund ratios</h1>
          </div>
          <div className="pcx-ws__aside">
            <Link href="/council-rankings" className="tcc-textbtn">
              Council Rankings
            </Link>
          </div>
        </div>
        <p className="pcx-muted pcx-note">
          The rating blends judged pitch results with fund ratios. No dollar amount is ever shown.
        </p>
      </header>

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
        <p className="pcx-muted pcx-note">
          No rating yet. It appears after your teams compete or you report fund ratios.
        </p>
      )}

      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Fund ratios</h2>
        <p className="pcx-muted pcx-note">
          These feed your council&apos;s public ranking. Sharpe (risk-adjusted) is weighted more
          than raw ROI. Enter ratios and percentages only, never dollar amounts. Numbers are flagged
          self-reported on the leaderboard.
        </p>
        {!canManage ? (
          <div className="pcx-error--banner pcx-lock">
            <i className="bi bi-lock" aria-hidden="true" /> Only executives and portfolio managers
            change the fund ratios.
          </div>
        ) : null}
        <div className="pcx-form-grid">
          <label className="pcx-field">
            <span className="pcx-field-label">Period label</span>
            <input
              className="pcx-input"
              value={form.period_label}
              disabled={!canManage}
              onChange={(e) => setForm({ ...form, period_label: e.target.value })}
              placeholder="CY2025"
            />
          </label>
          {FIELDS.map((f) => (
            <label className="pcx-field" key={f.key}>
              <span className="pcx-field-label">{f.label}</span>
              <input
                className="pcx-input"
                type="number"
                step="0.01"
                value={form[f.key]}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.hint}
              />
            </label>
          ))}
        </div>
        {canManage ? (
          <div className="pcx-rubric-actions">
            <button
              type="button"
              className="pcx-btn pcx-btn--primary"
              onClick={save}
              disabled={busy}
            >
              {busy ? <i className="bi bi-arrow-repeat pcx-spin" aria-hidden="true" /> : null} Save
              fund ratios
            </button>
            {saved ? (
              <span className="pcx-saved">Saved. The ranking recomputes on the next cycle.</span>
            ) : null}
            {saveError ? (
              <span className="pcx-error" role="alert">
                {saveError}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
