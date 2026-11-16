'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NA } from '@/lib/org-competitions-model';
import { EntryRules } from './WorkspaceParts';
import './competitions.css';

const MODE_COPY = {
  open_signup: { title: 'Join this competition', cta: 'Join competition' },
  request_approval: { title: 'Request to join', cta: 'Request to join' },
  application: { title: 'Apply to compete', cta: 'Submit application' },
};

export function JoinClient({ competition, config, isHost, alreadyEntered, hasPending }) {
  const [form, setForm] = useState({
    team_name: '',
    contact_email: '',
    ticker: '',
    side: '',
    application_deck_url: '',
    application_thesis: '',
    application_note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* The rules always show; beside them, either the form or one line that
     says why there is no form, with one action. */
  const rules = (
    <section className="pcx-sec" aria-labelledby="pcx-rules-title">
      <h2 className="pcx-h2" id="pcx-rules-title">
        Entry rules
      </h2>
      <EntryRules config={config} />
    </section>
  );
  const notice = (title, body, withLink = true) => (
    <div className="pcx-split">
      {rules}
      <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
      <section className="pcx-sec" aria-labelledby="pcx-join-title">
        <h2 className="pcx-h2" id="pcx-join-title">
          {title}
        </h2>
        <p className="tcc-state">
          <span>{body}</span>
          {withLink && (
            <Link href={`/org-competitions/${competition.slug}`} className="tcc-link">
              Open the overview
            </Link>
          )}
        </p>
      </section>
    </div>
  );

  if (isHost)
    return notice('Your council hosts this event', 'Change these rules under Entry rules.');
  if (alreadyEntered)
    return notice(
      'Your council is entered',
      'Your council already has a team in this competition.',
    );
  if (hasPending)
    return notice(
      'Request pending',
      'Your request is waiting for the host council to decide.',
      false,
    );
  if (competition.status !== 'open') {
    return notice('Registration closed', 'This competition is not taking new teams.', false);
  }
  if (config.admission_mode === 'invite_only') {
    return notice(
      'Invite only',
      'This competition admits teams by invitation from the host council.',
      false,
    );
  }

  if (done) {
    return notice(
      done.mode === 'open_signup' ? 'Registered' : 'Request sent',
      done.mode === 'open_signup'
        ? 'Your team is registered. Hand in deliverables from the competition.'
        : 'Your request was sent to the host council.',
      done.mode === 'open_signup',
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
    <div className="pcx-split">
      {rules}
      <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
      <form className="pcx-sec pcx-stack-form" onSubmit={submit} aria-labelledby="pcx-join-title">
        <h2 className="pcx-h2" id="pcx-join-title">
          {copy.title}
        </h2>
        <label className="pcx-field">
          <span className="pcx-field-label">Team name</span>
          <input
            className="pcx-input"
            value={form.team_name}
            onChange={(e) => set('team_name', e.target.value)}
            placeholder="Your council team"
            autoFocus
          />
        </label>
        <label className="pcx-field">
          <span className="pcx-field-label">Contact email</span>
          <input
            className="pcx-input"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
          />
        </label>

        {showTicker ? (
          <label className="pcx-field">
            <span className="pcx-field-label">
              Ticker{config.requires_ticker_at_signup || fromPool ? '' : ' (optional)'}
            </span>
            {fromPool ? (
              <select
                className="pcx-input"
                value={form.ticker}
                onChange={(e) => set('ticker', e.target.value)}
              >
                <option value="">Pick from the pool</option>
                {(config.ticker_pool || []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="pcx-input"
                value={form.ticker}
                onChange={(e) => set('ticker', e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            )}
          </label>
        ) : null}

        {showSide ? (
          <label className="pcx-field">
            <span className="pcx-field-label">Side (optional)</span>
            <select
              className="pcx-input"
              value={form.side}
              onChange={(e) => set('side', e.target.value)}
            >
              <option value="">{NA}</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
        ) : null}

        {config.admission_mode === 'application' ? (
          <>
            {config.application_prompt ? (
              <p className="pcx-muted pcx-note">{config.application_prompt}</p>
            ) : null}
            {config.application_requires_deck ? (
              <label className="pcx-field">
                <span className="pcx-field-label">Preliminary deck link</span>
                <input
                  className="pcx-input"
                  value={form.application_deck_url}
                  onChange={(e) => set('application_deck_url', e.target.value)}
                  placeholder="https://"
                />
              </label>
            ) : null}
            {config.application_requires_thesis ? (
              <label className="pcx-field">
                <span className="pcx-field-label">Written thesis</span>
                <textarea
                  className="pcx-input pcx-textarea"
                  rows={4}
                  value={form.application_thesis}
                  onChange={(e) => set('application_thesis', e.target.value)}
                />
              </label>
            ) : null}
            <label className="pcx-field">
              <span className="pcx-field-label">Note to the host (optional)</span>
              <textarea
                className="pcx-input pcx-textarea"
                rows={2}
                value={form.application_note}
                onChange={(e) => set('application_note', e.target.value)}
              />
            </label>
          </>
        ) : null}

        {error ? <p className="pcx-error">{error}</p> : null}
        <div className="pcx-actions">
          <button
            type="submit"
            className="pcx-btn pcx-btn--primary"
            disabled={busy || !form.team_name.trim()}
          >
            {busy ? <i className="bi bi-arrow-repeat pcx-spin" aria-hidden="true" /> : null}
            {copy.cta}
          </button>
        </div>
      </form>
    </div>
  );
}
