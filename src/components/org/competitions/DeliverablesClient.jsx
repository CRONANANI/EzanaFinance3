'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Circle, Upload, FileText, Loader2, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { requiredDeliverableKinds } from '@/lib/competitions/onboarding';
import './competitions.css';

const KIND_LABEL = { deck: 'Pitch deck', thesis: 'Written thesis', model: 'Valuation model', exhibit: 'Exhibit' };

function fmtDue(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function DeliverablesClient({ competition, team, config, initialDeliverables }) {
  const [deliverables, setDeliverables] = useState(initialDeliverables || []);
  const [status, setStatus] = useState(team?.status);
  const [busyKind, setBusyKind] = useState(null);
  const [error, setError] = useState('');
  const [thesis, setThesis] = useState(() => (initialDeliverables || []).find((d) => d.kind === 'thesis')?.thesis_text || '');
  const fileRefs = useRef({});

  const required = useMemo(() => requiredDeliverableKinds(config), [config]);
  const byKind = useMemo(() => new Map(deliverables.map((d) => [d.kind, d])), [deliverables]);
  const due = fmtDue(config.deliverable_due_at);
  const pastDue = config.deliverable_due_at && Date.now() > Date.parse(config.deliverable_due_at);

  if (!team) {
    return (
      <div className="pcx-page">
        <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
          <ArrowLeft size={15} /> {competition.name}
        </Link>
        <div className="pcx-card-block pcx-center">
          <Info size={22} aria-hidden="true" />
          <h1 className="pcx-h1">No team registered</h1>
          <p className="pcx-lead">Your organization isn’t registered in this competition yet.</p>
          <Link href={`/org-competitions/${competition.slug}/join`} className="pcx-btn pcx-btn--primary">
            Join the competition
          </Link>
        </div>
      </div>
    );
  }

  const record = async (payload, kind) => {
    const res = await fetch(`/api/org/pitch-teams/${team.id}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error || 'Could not save the deliverable.');
      return null;
    }
    setDeliverables((ds) => [json.deliverable, ...ds.filter((d) => d.kind !== kind)]);
    if (json.submitted) setStatus('submitted');
    setError('');
    return json;
  };

  const uploadFile = async (kind, file) => {
    if (!file) return;
    setBusyKind(kind);
    setError('');
    try {
      const supabase = createClient();
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${competition.id}/${team.id}/${kind}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from('pitch-deliverables')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      await record({ kind, file_path: path, file_name: file.name }, kind);
    } catch {
      setError('Could not connect.');
    } finally {
      setBusyKind(null);
    }
  };

  const saveThesis = async () => {
    if (!thesis.trim()) return;
    setBusyKind('thesis');
    try {
      await record({ kind: 'thesis', thesis_text: thesis.trim() }, 'thesis');
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <div className="pcx-page pcx-narrow">
      <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
        <ArrowLeft size={15} /> {competition.name}
      </Link>
      <header className="pcx-cc-head">
        <div className="pcx-cc-title-row">
          <h1 className="pcx-h1">Deliverables</h1>
          <span className={`pcx-pill pcx-pill--${status === 'submitted' ? 'done' : 'mut'}`}>
            {status === 'submitted' ? 'Submitted' : 'In progress'}
          </span>
        </div>
        <p className="pcx-lead">
          {team.team_name}
          {due ? ` · due ${due}` : ''}
        </p>
      </header>

      {config.deliverable_notes ? <p className="pcx-muted pcx-note">{config.deliverable_notes}</p> : null}
      {pastDue ? (
        <div className="pcx-error--banner pcx-lock">
          <Info size={14} aria-hidden="true" /> The deadline has passed — submissions are closed.
        </div>
      ) : null}
      {required.length === 0 ? <p className="pcx-muted">No deliverables are required for this competition.</p> : null}
      {error ? <p className="pcx-error pcx-error--banner">{error}</p> : null}

      <div className="pcx-deliverables">
        {required.map((kind) => {
          const have = byKind.get(kind);
          return (
            <section className="pcx-card-block pcx-deliv" key={kind}>
              <div className="pcx-deliv-head">
                {have ? <CheckCircle2 size={18} className="pcx-deliv-ok" aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
                <h2 className="pcx-block-title pcx-deliv-title">{KIND_LABEL[kind]}</h2>
                {have ? <span className="pcx-muted">Submitted</span> : null}
              </div>

              {kind === 'thesis' ? (
                <>
                  <textarea
                    className="pcx-input pcx-textarea"
                    rows={5}
                    value={thesis}
                    onChange={(e) => setThesis(e.target.value)}
                    placeholder="Paste your written thesis…"
                    disabled={pastDue}
                  />
                  <button type="button" className="pcx-btn pcx-btn--primary" onClick={saveThesis} disabled={busyKind === 'thesis' || pastDue || !thesis.trim()}>
                    {busyKind === 'thesis' ? <Loader2 size={14} className="pcx-spin" /> : <FileText size={14} />} Save thesis
                  </button>
                </>
              ) : (
                <div className="pcx-deliv-file">
                  {have?.file_name ? <span className="pcx-deliv-filename">{have.file_name}</span> : null}
                  <input
                    ref={(el) => (fileRefs.current[kind] = el)}
                    type="file"
                    className="pcx-hidden-file"
                    onChange={(e) => uploadFile(kind, e.target.files?.[0])}
                    disabled={pastDue}
                  />
                  <button type="button" className="pcx-btn" onClick={() => fileRefs.current[kind]?.click()} disabled={busyKind === kind || pastDue}>
                    {busyKind === kind ? <Loader2 size={14} className="pcx-spin" /> : <Upload size={14} />} {have ? 'Replace file' : 'Upload file'}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
