'use client';

/**
 * SaveToOrg: "Save to your fund" under a finished research run, for an
 * organization member (the research route's done event carries
 * org: { canSave, runId } only when the run's snapshot was kept).
 *
 * Saves the run as a new org research report, or as a new version of one
 * of the member's reports, with its visibility, the members it is shared
 * with and the pitch it supports. The server reads the snapshot from the run
 * itself; nothing the browser holds is uploaded.
 *
 * Tokens only (EZANA_BRANDING_GUIDE), Bootstrap Icons, prefix osr-.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { REPORT_VISIBILITY, VISIBILITY_LABEL } from '@/lib/org-sonar/reports';
import './org-sonar.css';

async function getJson(url) {
  try {
    const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export default function SaveToOrg({ org, query, challengeOf = null, label = null }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(null);
  if (!org?.canSave || !org.runId) return null;
  if (saved) {
    return (
      <div className="osr-saved" role="status">
        <i className="bi bi-check2-circle" aria-hidden="true" />
        <span>Saved to your fund as a draft.</span>
        <Link className="osr-link" href={`/org-team-hub/sonar/${saved.id}`}>
          Open the report <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    );
  }
  return (
    <>
      <div className="osr-save-bar">
        <button type="button" className="osr-btn osr-btn--primary" onClick={() => setOpen(true)}>
          <i className="bi bi-folder-plus" aria-hidden="true" />
          {label || 'Save to your fund'}
        </button>
        <span className="osr-muted">
          Saved reports can be shared, reviewed, approved and attached to a pitch.
        </span>
      </div>
      {open ? (
        <SaveDialog
          runId={org.runId}
          query={query}
          challengeOf={challengeOf}
          onClose={() => setOpen(false)}
          onSaved={(r) => {
            setSaved(r);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function SaveDialog({ runId, query, challengeOf, onClose, onSaved }) {
  const [title, setTitle] = useState(String(query || '').slice(0, 160));
  const [visibility, setVisibility] = useState(challengeOf ? 'org' : 'private');
  const [shared, setShared] = useState([]);
  const [pitchId, setPitchId] = useState('');
  const [reportId, setReportId] = useState('');
  const [members, setMembers] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    Promise.all([
      getJson('/api/org/members'),
      getJson('/api/org/pitches'),
      challengeOf ? null : getJson('/api/org/sonar-reports?mine=1'),
    ]).then(([m, p, r]) => {
      if (!live) return;
      setMembers((m?.members || []).filter((x) => x.is_active !== false));
      setPitches(p?.pitches || []);
      setMine((r?.reports || []).filter((x) => x.status !== 'superseded'));
    });
    return () => {
      live = false;
    };
  }, [challengeOf]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/org/sonar-reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          ...(reportId
            ? { reportId }
            : {
                title,
                visibility,
                sharedWith: visibility === 'members' ? shared : [],
                pitchId: pitchId || null,
                challengeOf,
              }),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'The report was not saved.');
      onSaved(body.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id) =>
    setShared((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="osr-overlay" role="presentation">
      <div className="osr-dialog" role="dialog" aria-modal="true" aria-labelledby="osr-save-title">
        <button type="button" className="osr-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <p className="osr-eyebrow">
          <i className="bi bi-folder-plus" aria-hidden="true" /> Save to your fund
        </p>
        <h2 id="osr-save-title" className="osr-h2">
          {challengeOf ? 'Save the challenge beside the report' : 'Save this research as a report'}
        </h2>

        {mine.length && !challengeOf ? (
          <label className="osr-field">
            <span>Save as</span>
            <select value={reportId} onChange={(e) => setReportId(e.target.value)}>
              <option value="">A new report</option>
              {mine.map((r) => (
                <option key={r.id} value={r.id}>
                  New version of: {r.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!reportId ? (
          <>
            <label className="osr-field">
              <span>Title</span>
              <input
                ref={first}
                value={title}
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            {!challengeOf ? (
              <label className="osr-field">
                <span>Who can see it</span>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  {REPORT_VISIBILITY.map((v) => (
                    <option key={v} value={v}>
                      {VISIBILITY_LABEL[v]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="osr-muted">
                A challenge is visible to everyone who can read the report it challenges.
              </p>
            )}
            {visibility === 'members' && !challengeOf ? (
              <fieldset className="osr-members">
                <legend>Share with</legend>
                {members.length ? (
                  members.map((m) => (
                    <label key={m.user_id} className="osr-check">
                      <input
                        type="checkbox"
                        checked={shared.includes(m.user_id)}
                        onChange={() => toggle(m.user_id)}
                      />
                      <span>{m.display_name || 'Member'}</span>
                    </label>
                  ))
                ) : (
                  <p className="osr-muted">No members found.</p>
                )}
              </fieldset>
            ) : null}
            {!challengeOf ? (
              <label className="osr-field">
                <span>Supports a pitch (optional)</span>
                <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
                  <option value="">No pitch</option>
                  {pitches.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ticker ? `${p.ticker}, ` : ''}
                      {p.company_name || 'Pitch'}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : (
          <p className="osr-muted">
            The new version is kept beside the earlier ones. An approved report goes back to draft
            and needs approval again.
          </p>
        )}

        {error ? (
          <p className="osr-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="osr-actions">
          <button
            type="button"
            className="osr-btn osr-btn--primary"
            onClick={save}
            disabled={
              busy || (visibility === 'members' && !shared.length && !reportId && !challengeOf)
            }
          >
            {busy ? 'Saving' : 'Save as draft'}
          </button>
          <button type="button" className="osr-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
