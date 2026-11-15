'use client';

/**
 * Why I'm watching (Market Monitor 2.0, Nov 2026): a private note per user
 * per asset (it follows the asset across lists). The panel shows the
 * headline clamped to two lines and the review date; the modal edits the
 * fields from NOTE_FIELDS, validated by parseNote before save, with the
 * server's field error shown inline. Delete confirms inside the modal.
 * "Review by" is display only: it sends no reminder. Plain text only.
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Textarea } from '@/components/ds';
import {
  NOTE_FIELDS,
  NOTE_LABELS,
  NOTE_LIMITS,
  noteHeadline,
  parseNote,
} from '@/lib/watchlist/notes';

const fmtReview = (ymd) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ymd
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The panel strip inside the asset panel. */
export function MonitoringNote({ note, status, onEdit }) {
  const headline = noteHeadline(note);
  return (
    <div className="wlm-note" aria-labelledby="wlm-note-h">
      <div className="wlm-note__head">
        <h3 id="wlm-note-h" className="wlm-note__title">
          <i className="bi bi-journal-text" aria-hidden="true" /> Why I&apos;m watching
        </h3>
        {status !== 'error' ? (
          <button type="button" className="wlm-btn wlm-btn--text wlm-btn--sm" onClick={onEdit}>
            <i className={`bi ${note ? 'bi-pencil' : 'bi-plus-lg'}`} aria-hidden="true" />{' '}
            {note ? 'Edit note' : 'Add note'}
          </button>
        ) : null}
      </div>
      {status === 'loading' ? (
        <span className="wlm-skel wlm-skel--line" aria-hidden="true" />
      ) : status === 'error' ? (
        <p className="wlm-xs wlm-muted">Notes could not load. The rest of the page still works.</p>
      ) : note ? (
        <>
          <p className="wlm-note__text wlm-clamp2">{headline}</p>
          {note.reviewOn ? (
            <span className="wlm-xs wlm-muted">Review by {fmtReview(note.reviewOn)}</span>
          ) : null}
        </>
      ) : (
        <p className="wlm-xs wlm-muted">
          No note yet. Write down why this is on your list and what would change your mind.
        </p>
      )}
    </div>
  );
}

const fromNote = (note, prefill) => {
  const f = {};
  for (const k of NOTE_FIELDS) f[k] = note?.[k] || '';
  f.reviewOn = note?.reviewOn || '';
  return { ...f, ...(prefill || {}) };
};

/**
 * item     the selected asset ({ type, ticker, name })
 * note     its saved note, or null
 * prefill  fields to start with (Add to monitoring note puts a catalyst here)
 * onSave   async (note) => { ok, error?, field? }
 * onDelete async () => { ok, error? }
 */
export function NoteModal({ open, item, note, prefill = null, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => fromNote(note, prefill));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromNote(note, prefill));
    setError(null);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the modal opens
  }, [open]);

  if (!item) return null;
  const label = item.type === 'politician' ? item.name : item.ticker;

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const parsed = parseNote(
      { type: item.type, ticker: item.ticker, ...form },
      { today: todayYmd() },
    );
    if (!parsed.ok) {
      setError({ text: parsed.error, field: parsed.field || null });
      return;
    }
    setBusy(true);
    const r = await onSave(parsed.note);
    setBusy(false);
    if (r?.ok) onClose();
    else setError({ text: r?.error || 'Could not save the note.', field: r?.field || null });
  };

  const del = async () => {
    setBusy(true);
    const r = await onDelete();
    setBusy(false);
    if (r?.ok) onClose();
    else setError({ text: r?.error || 'Could not delete the note.', field: null });
  };

  const fieldError = (f) => (error?.field === f ? error.text : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Why I'm watching ${label}`}
      size="560px"
      footer={
        confirmDelete ? (
          <>
            <span className="wlm-sm wlm-soft wlm-note__confirm">Delete this note?</span>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="danger" onClick={del} loading={busy}>
              Delete note
            </Button>
          </>
        ) : (
          <>
            {note ? (
              <button
                type="button"
                className="wlm-btn wlm-btn--danger wlm-note__delete"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                Delete
              </button>
            ) : null}
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="wlm-note-form" loading={busy}>
              Save
            </Button>
          </>
        )
      }
    >
      <form id="wlm-note-form" className="wlm-note-form" onSubmit={save} noValidate>
        {NOTE_FIELDS.map((f) => (
          <Textarea
            key={f}
            id={`wlm-note-${f}`}
            label={NOTE_LABELS[f]}
            rows={f === 'hypothesis' ? 4 : 2}
            maxLength={NOTE_LIMITS[f]}
            value={form[f]}
            onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
            error={fieldError(f)}
            hint={`${form[f].length} of ${NOTE_LIMITS[f]} characters`}
          />
        ))}
        <Input
          id="wlm-note-review"
          type="date"
          label="Review on (optional)"
          min={todayYmd()}
          value={form.reviewOn}
          onChange={(e) => setForm((s) => ({ ...s, reviewOn: e.target.value }))}
          error={fieldError('reviewOn')}
          hint="Shown on the panel. No reminder is sent."
        />
        {error && !error.field ? <Alert tone="error">{error.text}</Alert> : null}
      </form>
    </Modal>
  );
}

export default MonitoringNote;
