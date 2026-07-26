'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Loader2, Save } from 'lucide-react';
import './competitions.css';

const ADMISSION = [
  { id: 'invite_only', label: 'Invite only', hint: 'You invite specific councils; no public sign-up.' },
  { id: 'open_signup', label: 'Open sign-up', hint: 'Any council can register and is in automatically.' },
  { id: 'request_approval', label: 'Request to join', hint: 'Councils ask; you approve or decline each.' },
  { id: 'application', label: 'Application', hint: 'Councils submit a preliminary pitch; you review and admit.' },
];

// datetime-local wants 'YYYY-MM-DDTHH:mm'; DB gives ISO — trim to minutes.
const toLocal = (iso) => (iso ? String(iso).slice(0, 16) : '');
const fromLocal = (v) => (v ? new Date(v).toISOString() : null);

export function ConfigClient({ competition, initialConfig, canManage }) {
  const [form, setForm] = useState(() => ({
    ...initialConfig,
    ticker_pool_text: (initialConfig.ticker_pool || []).join(', '),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const payload = {
        admission_mode: form.admission_mode,
        max_teams: form.max_teams === '' ? null : form.max_teams,
        max_teams_per_org: form.max_teams_per_org,
        registration_opens_at: fromLocal(toLocal(form.registration_opens_at)),
        registration_closes_at: fromLocal(toLocal(form.registration_closes_at)),
        requires_ticker_at_signup: form.requires_ticker_at_signup,
        ticker_assignment: form.ticker_assignment,
        ticker_pool: (form.ticker_pool_text || '').split(',').map((t) => t.trim()).filter(Boolean),
        side_constraint: form.side_constraint,
        application_requires_deck: form.application_requires_deck,
        application_requires_thesis: form.application_requires_thesis,
        application_prompt: form.application_prompt,
        deliverable_deck: form.deliverable_deck,
        deliverable_thesis: form.deliverable_thesis,
        deliverable_model: form.deliverable_model,
        deliverable_notes: form.deliverable_notes,
        deliverable_due_at: fromLocal(toLocal(form.deliverable_due_at)),
        eligibility_note: form.eligibility_note,
        requires_host_approval_after_signup: form.requires_host_approval_after_signup,
      };
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not save the configuration.');
        return;
      }
      setSaved(true);
    } catch {
      setError('Could not connect.');
    } finally {
      setBusy(false);
    }
  };

  const ro = !canManage;

  return (
    <div className="pcx-page">
      <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
        <ArrowLeft size={15} /> {competition.name}
      </Link>
      <header className="pcx-cc-head">
        <h1 className="pcx-h1">Onboarding configuration</h1>
        <p className="pcx-lead">How councils get into this competition, what they must provide, and when.</p>
      </header>

      {ro ? (
        <div className="pcx-error--banner pcx-lock">
          <Lock size={15} aria-hidden="true" /> Only the host org’s executives and VPs can edit the configuration. You have read-only access.
        </div>
      ) : null}

      {/* Admission */}
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Admission</h2>
        <div className="pcx-radio-grid">
          {ADMISSION.map((m) => (
            <label key={m.id} className={`pcx-radio ${form.admission_mode === m.id ? 'is-active' : ''}`}>
              <input type="radio" name="admission" value={m.id} checked={form.admission_mode === m.id} onChange={() => set('admission_mode', m.id)} disabled={ro} />
              <span className="pcx-radio-label">{m.label}</span>
              <span className="pcx-radio-hint">{m.hint}</span>
            </label>
          ))}
        </div>
        {form.admission_mode === 'open_signup' ? (
          <label className="pcx-check-row">
            <input type="checkbox" checked={!!form.requires_host_approval_after_signup} onChange={(e) => set('requires_host_approval_after_signup', e.target.checked)} disabled={ro} />
            Require host approval even after sign-up (teams land as “invited” until you confirm)
          </label>
        ) : null}
        {form.admission_mode === 'application' ? (
          <div className="pcx-subgroup">
            <label className="pcx-check-row">
              <input type="checkbox" checked={!!form.application_requires_deck} onChange={(e) => set('application_requires_deck', e.target.checked)} disabled={ro} />
              Application requires a preliminary deck link
            </label>
            <label className="pcx-check-row">
              <input type="checkbox" checked={!!form.application_requires_thesis} onChange={(e) => set('application_requires_thesis', e.target.checked)} disabled={ro} />
              Application requires a written thesis
            </label>
            <label className="pcx-field">
              <span className="pcx-field-label">Instructions shown to applicants</span>
              <textarea className="pcx-input pcx-textarea" rows={2} value={form.application_prompt || ''} onChange={(e) => set('application_prompt', e.target.value)} disabled={ro} />
            </label>
          </div>
        ) : null}
      </section>

      {/* Capacity & dates */}
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Capacity & dates</h2>
        <div className="pcx-form-grid">
          <label className="pcx-field">
            <span className="pcx-field-label">Max teams (blank = unlimited)</span>
            <input className="pcx-input" type="number" min="1" value={form.max_teams ?? ''} onChange={(e) => set('max_teams', e.target.value === '' ? '' : Number(e.target.value))} disabled={ro} />
          </label>
          <label className="pcx-field">
            <span className="pcx-field-label">Max teams per org</span>
            <input className="pcx-input" type="number" min="1" value={form.max_teams_per_org} onChange={(e) => set('max_teams_per_org', Number(e.target.value))} disabled={ro} />
          </label>
          <label className="pcx-field">
            <span className="pcx-field-label">Registration opens</span>
            <input className="pcx-input" type="datetime-local" value={toLocal(form.registration_opens_at)} onChange={(e) => set('registration_opens_at', e.target.value)} disabled={ro} />
          </label>
          <label className="pcx-field">
            <span className="pcx-field-label">Registration closes</span>
            <input className="pcx-input" type="datetime-local" value={toLocal(form.registration_closes_at)} onChange={(e) => set('registration_closes_at', e.target.value)} disabled={ro} />
          </label>
        </div>
      </section>

      {/* Ticker & side */}
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Ticker & side</h2>
        <div className="pcx-form-grid">
          <label className="pcx-field">
            <span className="pcx-field-label">Ticker assignment</span>
            <select className="pcx-input" value={form.ticker_assignment} onChange={(e) => set('ticker_assignment', e.target.value)} disabled={ro}>
              <option value="team_choice">Team chooses</option>
              <option value="host_assigns">Host assigns</option>
              <option value="from_pool">From a pool</option>
            </select>
          </label>
          <label className="pcx-field">
            <span className="pcx-field-label">Side constraint</span>
            <select className="pcx-input" value={form.side_constraint} onChange={(e) => set('side_constraint', e.target.value)} disabled={ro}>
              <option value="either">Either (long or short)</option>
              <option value="long_only">Long only</option>
              <option value="short_only">Short only</option>
              <option value="host_assigns">Host assigns</option>
            </select>
          </label>
          {form.ticker_assignment === 'from_pool' ? (
            <label className="pcx-field pcx-field--wide">
              <span className="pcx-field-label">Ticker pool (comma-separated)</span>
              <input className="pcx-input" value={form.ticker_pool_text} onChange={(e) => set('ticker_pool_text', e.target.value)} placeholder="AAPL, MSFT, NVDA" disabled={ro} />
            </label>
          ) : null}
          <label className="pcx-check-row pcx-field--wide">
            <input type="checkbox" checked={!!form.requires_ticker_at_signup} onChange={(e) => set('requires_ticker_at_signup', e.target.checked)} disabled={ro} />
            Require a ticker at sign-up
          </label>
        </div>
      </section>

      {/* Deliverables */}
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Deliverables</h2>
        <div className="pcx-check-list">
          <label className="pcx-check-row">
            <input type="checkbox" checked={!!form.deliverable_deck} onChange={(e) => set('deliverable_deck', e.target.checked)} disabled={ro} /> Pitch deck
          </label>
          <label className="pcx-check-row">
            <input type="checkbox" checked={!!form.deliverable_thesis} onChange={(e) => set('deliverable_thesis', e.target.checked)} disabled={ro} /> Written thesis
          </label>
          <label className="pcx-check-row">
            <input type="checkbox" checked={!!form.deliverable_model} onChange={(e) => set('deliverable_model', e.target.checked)} disabled={ro} /> Valuation model
          </label>
        </div>
        <div className="pcx-form-grid">
          <label className="pcx-field">
            <span className="pcx-field-label">Due date</span>
            <input className="pcx-input" type="datetime-local" value={toLocal(form.deliverable_due_at)} onChange={(e) => set('deliverable_due_at', e.target.value)} disabled={ro} />
          </label>
          <label className="pcx-field pcx-field--wide">
            <span className="pcx-field-label">Instructions (optional)</span>
            <textarea className="pcx-input pcx-textarea" rows={2} value={form.deliverable_notes || ''} onChange={(e) => set('deliverable_notes', e.target.value)} disabled={ro} />
          </label>
        </div>
      </section>

      {/* Eligibility */}
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Eligibility</h2>
        <label className="pcx-field">
          <span className="pcx-field-label">Eligibility note (optional)</span>
          <input className="pcx-input" value={form.eligibility_note || ''} onChange={(e) => set('eligibility_note', e.target.value)} placeholder="Undergraduate students only" disabled={ro} />
        </label>
      </section>

      {error ? <p className="pcx-error">{error}</p> : null}
      {canManage ? (
        <div className="pcx-rubric-actions">
          <button type="button" className="pcx-btn pcx-btn--primary" onClick={save} disabled={busy}>
            {busy ? <Loader2 size={15} className="pcx-spin" /> : <Save size={15} />} Save configuration
          </button>
          {saved ? <span className="pcx-saved">Saved</span> : null}
        </div>
      ) : null}
    </div>
  );
}
