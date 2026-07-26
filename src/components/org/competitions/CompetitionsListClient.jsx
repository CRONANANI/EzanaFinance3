'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trophy, Users, ArrowRight, X, Loader2 } from 'lucide-react';
import './competitions.css';

const STATUS_TONE = {
  draft: 'mut',
  open: 'pos',
  in_progress: 'info',
  judging: 'warn',
  complete: 'done',
  archived: 'mut',
};
const STATUS_LABEL = {
  draft: 'Draft',
  open: 'Open',
  in_progress: 'In progress',
  judging: 'Judging',
  complete: 'Complete',
  archived: 'Archived',
};

export function StatusPill({ status }) {
  return (
    <span className={`pcx-pill pcx-pill--${STATUS_TONE[status] || 'mut'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

const FORMATS = [
  { id: 'showcase', label: 'Showcase (no bracket)' },
  { id: 'single_elim', label: 'Single elimination' },
  { id: 'round_robin', label: 'Round robin' },
];

function CreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('showcase');
  const [theme, setTheme] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/org/pitch-competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), format, theme: theme.trim() || null, description: description.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not create the competition.');
        return;
      }
      onCreated(json.competition);
    } catch {
      setError('Could not connect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pcx-modal-backdrop" onClick={onClose}>
      <form className="pcx-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="pcx-modal-head">
          <h2 className="pcx-modal-title">New competition</h2>
          <button type="button" className="pcx-iconbtn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="pcx-field">
          <span className="pcx-field-label">Name</span>
          <input className="pcx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Stock Pitch Invitational" autoFocus />
        </label>
        <label className="pcx-field">
          <span className="pcx-field-label">Format</span>
          <select className="pcx-input" value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pcx-field">
          <span className="pcx-field-label">Theme (optional)</span>
          <input className="pcx-input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Long thesis, consumer staples" />
        </label>
        <label className="pcx-field">
          <span className="pcx-field-label">Description (optional)</span>
          <textarea className="pcx-input pcx-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        {error ? <p className="pcx-error">{error}</p> : null}
        <div className="pcx-modal-foot">
          <button type="button" className="pcx-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="pcx-btn pcx-btn--primary" disabled={busy || !name.trim()}>
            {busy ? <Loader2 size={15} className="pcx-spin" /> : null} Create competition
          </button>
        </div>
      </form>
    </div>
  );
}

export function CompetitionsListClient({ initial, canManage }) {
  const router = useRouter();
  const [competitions, setCompetitions] = useState(initial || []);
  const [creating, setCreating] = useState(false);

  const onCreated = (comp) => {
    setCreating(false);
    if (comp?.slug) router.push(`/org-competitions/${comp.slug}`);
  };

  return (
    <div className="pcx-page">
      <header className="pcx-page-head">
        <div>
          <p className="pcx-eyebrow">
            <Trophy size={13} aria-hidden="true" /> Host Command Center
          </p>
          <h1 className="pcx-h1">Pitch competitions</h1>
          <p className="pcx-lead">
            Stand up an inter-university stock-pitch competition, build its rounds and rooms, invite
            councils, line up judges, and set the rubric — all from one place.
          </p>
        </div>
        <div className="pcx-cc-links" style={{ marginBottom: 0 }}>
          <Link href="/org-competitions/council" className="pcx-btn">
            <Trophy size={15} /> Council ranking
          </Link>
          {canManage ? (
            <button type="button" className="pcx-btn pcx-btn--primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> New competition
            </button>
          ) : null}
        </div>
      </header>

      {competitions.length === 0 ? (
        <div className="pcx-empty">
          <Trophy size={26} aria-hidden="true" />
          <p>No competitions yet.</p>
          {canManage ? (
            <button type="button" className="pcx-btn pcx-btn--primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Create your first competition
            </button>
          ) : (
            <p className="pcx-muted">Your org isn’t hosting or entered in any competitions yet.</p>
          )}
        </div>
      ) : (
        <div className="pcx-grid">
          {competitions.map((c) => (
            <Link key={c.id} href={`/org-competitions/${c.slug}`} className="pcx-card">
              <div className="pcx-card-top">
                <StatusPill status={c.status} />
                {c.isHost ? <span className="pcx-tag">Host</span> : <span className="pcx-tag pcx-tag--muted">Participant</span>}
              </div>
              <h2 className="pcx-card-name">{c.name}</h2>
              {c.theme ? <p className="pcx-card-theme">{c.theme}</p> : null}
              <div className="pcx-card-foot">
                <span className="pcx-card-meta">
                  <Users size={13} aria-hidden="true" /> {c.format.replace('_', ' ')}
                </span>
                <span className="pcx-card-open">
                  Open <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating ? <CreateModal onClose={() => setCreating(false)} onCreated={onCreated} /> : null}
    </div>
  );
}
