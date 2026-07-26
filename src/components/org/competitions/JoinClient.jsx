'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Info, Loader2 } from 'lucide-react';
import './competitions.css';

const MODE_COPY = {
  open_signup: { title: 'Join this competition', cta: 'Join competition' },
  request_approval: { title: 'Request to join', cta: 'Request to join' },
  application: { title: 'Apply to compete', cta: 'Submit application' },
};

export function JoinClient({ competition, config, isHost, alreadyEntered, hasPending }) {
  const [form, setForm] = useState({ team_name: '', contact_email: '', ticker: '', side: '', application_deck_url: '', application_thesis: '', application_note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const notice = (title, body) => (
    <div className="pcx-page">
      <Link href="/org-competitions" className="pcx-back">
        <ArrowLeft size={15} /> Competitions
      </Link>
      <div className="pcx-card-block pcx-center">
        <Info size={22} aria-hidden="true" />
        <h1 className="pcx-h1">{title}</h1>
        <p className="pcx-lead">{body}</p>
        <Link href={`/org-competitions/${competition.slug}`} className="pcx-btn pcx-btn--primary">
          Go to competition
        </Link>
      </div>
    </div>
  );

  if (isHost) return notice('Your org hosts this competition', 'Manage it from the Command Center.');
  if (alreadyEntered) return notice('You’re already entered', 'Your organization already has a team in this competition.');
  if (hasPending) return notice('Request pending', 'Your request is awaiting the host’s approval — we’ll surface it once they decide.');
  if (config.admission_mode === 'invite_only') {
    return notice('Invite only', 'This competition admits teams by invitation. Ask the host council for an invite.');
  }

  if (done) {
    return notice(
      done.mode === 'open_signup' ? 'You’re in!' : 'Submitted',
      done.mode === 'open_signup'
        ? 'Your team is registered. Head to the competition to add your deliverables.'
        : 'Your request has been sent to the host for review.',
    );
  }

  const copy = MODE_COPY[config.admission_mode] || MODE_COPY.request_approval;
  const showTicker = config.ticker_assignment !== 'host_assigns';
  const fromPool = config.ticker_assignment === 'from_pool';
  const showSide = config.side_constraint === 'either';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.team_name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: form.team_name.trim(),
          contact_email: form.contact_email.trim() || null,
          ticker: showTicker ? form.ticker.trim() || null : null,
          side: showSide ? form.side || null : null,
          application_deck_url: form.application_deck_url.trim() || null,
          application_thesis: form.application_thesis.trim() || null,
          application_note: form.application_note.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not complete registration.');
        return;
      }
      setDone({ mode: json.mode });
    } catch {
      setError('Could not connect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pcx-page pcx-narrow">
      <Link href="/org-competitions" className="pcx-back">
        <ArrowLeft size={15} /> Competitions
      </Link>
      <header className="pcx-cc-head">
        <h1 className="pcx-h1">{copy.title}</h1>
        <p className="pcx-lead">
          {competition.name}
          {competition.theme ? ` · ${competition.theme}` : ''}
        </p>
      </header>

      {config.eligibility_note ? (
        <div className="pcx-error--banner pcx-lock">
          <Info size={14} aria-hidden="true" /> {config.eligibility_note}
        </div>
      ) : null}

      <form className="pcx-card-block pcx-stack-form" onSubmit={submit}>
        <label className="pcx-field">
          <span className="pcx-field-label">Team name</span>
          <input className="pcx-input" value={form.team_name} onChange={(e) => set('team_name', e.target.value)} placeholder="e.g. McMaster A" autoFocus />
        </label>
        <label className="pcx-field">
          <span className="pcx-field-label">Contact email</span>
          <input className="pcx-input" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
        </label>

        {showTicker ? (
          <label className="pcx-field">
            <span className="pcx-field-label">
              Ticker{config.requires_ticker_at_signup || fromPool ? '' : ' (optional)'}
            </span>
            {fromPool ? (
              <select className="pcx-input" value={form.ticker} onChange={(e) => set('ticker', e.target.value)}>
                <option value="">Pick from pool…</option>
                {(config.ticker_pool || []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input className="pcx-input" value={form.ticker} onChange={(e) => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" />
            )}
          </label>
        ) : null}

        {showSide ? (
          <label className="pcx-field">
            <span className="pcx-field-label">Side (optional)</span>
            <select className="pcx-input" value={form.side} onChange={(e) => set('side', e.target.value)}>
              <option value="">—</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
        ) : null}

        {config.admission_mode === 'application' ? (
          <>
            {config.application_prompt ? <p className="pcx-muted pcx-note">{config.application_prompt}</p> : null}
            {config.application_requires_deck ? (
              <label className="pcx-field">
                <span className="pcx-field-label">Preliminary deck link</span>
                <input className="pcx-input" value={form.application_deck_url} onChange={(e) => set('application_deck_url', e.target.value)} placeholder="https://…" />
              </label>
            ) : null}
            {config.application_requires_thesis ? (
              <label className="pcx-field">
                <span className="pcx-field-label">Written thesis</span>
                <textarea className="pcx-input pcx-textarea" rows={4} value={form.application_thesis} onChange={(e) => set('application_thesis', e.target.value)} />
              </label>
            ) : null}
            <label className="pcx-field">
              <span className="pcx-field-label">Note to the host (optional)</span>
              <textarea className="pcx-input pcx-textarea" rows={2} value={form.application_note} onChange={(e) => set('application_note', e.target.value)} />
            </label>
          </>
        ) : null}

        {error ? <p className="pcx-error">{error}</p> : null}
        <button type="submit" className="pcx-btn pcx-btn--primary" disabled={busy || !form.team_name.trim()}>
          {busy ? <Loader2 size={15} className="pcx-spin" /> : <CheckCircle2 size={15} />} {copy.cta}
        </button>
      </form>
    </div>
  );
}
