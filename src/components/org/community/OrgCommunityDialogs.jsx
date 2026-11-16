'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ds';
import {
  EVENT_LABEL,
  EVENT_TYPES,
  MAX_EVENT_DESC,
  MAX_EVENT_TITLE,
  MAX_POST,
  MAX_REPLY,
  MAX_TITLE,
  TYPE_LABEL,
} from '@/lib/org-community-model';

const SampleNote = () => (
  <p className="ocm-note">
    <i className="bi bi-info-circle" aria-hidden="true" />
    Sample content is showing. This is applied to the page only and is not saved.
  </p>
);

function failText(r, fallback) {
  if (r.notAvailable) return `${r.error || 'This is not available yet.'}`;
  if (r.error && (r.status === 400 || r.status === 403 || r.status === 409))
    return `${r.error} Nothing was saved.`;
  return fallback;
}

function Footer({ onCancel, busy, label, onSubmit, form, danger = false }) {
  return (
    <>
      <button type="button" className="ocm-tb" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        className="tcc-flatbtn ocm-dlg__primary"
        loading={busy}
        type={form ? 'submit' : 'button'}
        form={form}
        onClick={form ? undefined : onSubmit}
      >
        {label}
      </Button>
    </>
  );
}

/* A text-only single select. */
function Choice({ label, value, options, onChange }) {
  return (
    <div className="ocm-dlg__group" role="radiogroup" aria-label={label}>
      <span className="ocm-dlg__label">{label}</span>
      <div className="tcc-toggles">
        {options.map((o) => (
          <button
            key={o.value ?? 'none'}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`tcc-toggle${value === o.value ? ' is-on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * New post, Announce and Edit. Types the viewer cannot use are not offered;
 * fields that need the database change say "not available yet".
 */
export function PostDialog({
  mode,
  post,
  initialType,
  teams,
  rights,
  caps,
  sample,
  onCreate,
  onEdit,
  onClose,
}) {
  const editing = mode === 'edit';
  const types = ['discussion', 'question', 'update', ...(rights.announce ? ['announcement'] : [])];
  const [type, setType] = useState(types.includes(initialType) ? initialType : 'discussion');
  const [team, setTeam] = useState(null);
  const [title, setTitle] = useState(post?.title || '');
  const [ticker, setTicker] = useState('');
  const [content, setContent] = useState(post?.content || '');
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isReply = editing && Boolean(post?.parentId);
  const limit = isReply ? MAX_REPLY : MAX_POST;

  const submit = async (e) => {
    e?.preventDefault();
    if (!content.trim()) {
      setError('Write something first.');
      document.getElementById('ocm-post-text')?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const r = editing
      ? await onEdit({ content, ...(caps.titles && !isReply ? { title } : {}) })
      : await onCreate({
          content,
          post_type: type,
          team_id: team,
          ...(caps.titles && title.trim() ? { title } : {}),
          ...(caps.tickers && ticker.trim() ? { ticker } : {}),
          ...(pin ? { pin: true } : {}),
        });
    if (r.ok) {
      onClose(
        r.sample
          ? 'Applied to the sample. It is not saved.'
          : editing
            ? 'Post updated.'
            : 'Posted to the council.',
      );
      return;
    }
    setBusy(false);
    setError(failText(r, 'That did not go through. Nothing was saved. Try again.'));
  };

  const listWords = (w) => {
    const t = w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : w[0];
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const pending = [
    !caps.titles && 'titles',
    !caps.tickers && 'tickers',
    rights.pinPending && 'pinning',
    !caps.replies && 'replies',
  ].filter(Boolean);

  return (
    <Modal
      open
      onClose={busy ? undefined : () => onClose()}
      title={editing ? 'Edit post' : type === 'announcement' ? 'New announcement' : 'New post'}
      size={560}
      className="ocm-dlg"
      footer={
        <Footer
          onCancel={() => onClose()}
          busy={busy}
          label={editing ? 'Save' : 'Post'}
          form="ocm-post-form"
        />
      }
    >
      <form id="ocm-post-form" className="ocm-dlg__form" onSubmit={submit} noValidate>
        {!editing ? (
          <>
            <Choice
              label="Type"
              value={type}
              options={types.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              onChange={setType}
            />
            <Choice
              label="Team"
              value={team}
              options={[
                { value: null, label: 'All council' },
                ...teams.map((t) => ({ value: t.id, label: t.name })),
              ]}
              onChange={setTeam}
            />
          </>
        ) : null}
        {caps.titles && !isReply ? (
          <label className="ocm-dlg__group">
            <span className="ocm-dlg__label">Title (optional)</span>
            <input
              className="ocm-field"
              value={title}
              maxLength={MAX_TITLE}
              placeholder="A short headline"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        ) : null}
        {caps.tickers && !editing ? (
          <label className="ocm-dlg__group">
            <span className="ocm-dlg__label">Ticker (optional)</span>
            <input
              className="ocm-field tcc-mono"
              value={ticker}
              maxLength={10}
              placeholder="NVDA"
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
          </label>
        ) : null}
        <label className="ocm-dlg__group">
          <span className="ocm-dlg__label">{isReply ? 'Reply' : 'Post'}</span>
          <textarea
            id="ocm-post-text"
            className="ocm-field ocm-field--area"
            value={content}
            maxLength={limit}
            rows={5}
            autoFocus
            placeholder={
              type === 'question'
                ? 'Ask the council a question'
                : type === 'announcement'
                  ? 'What does the council need to know?'
                  : 'Share an idea, an update or a draft for feedback'
            }
            aria-invalid={error && !content.trim() ? true : undefined}
            onChange={(e) => setContent(e.target.value)}
          />
          <span className="ocm-dlg__count tcc-mono">
            {content.length} / {limit}
          </span>
        </label>
        {!editing && rights.pin ? (
          <button
            type="button"
            className={`tcc-toggle${pin ? ' is-on' : ''}`}
            aria-pressed={pin}
            onClick={() => setPin((p) => !p)}
          >
            <i className="bi bi-pin-angle" aria-hidden="true" />
            Pin this post
          </button>
        ) : null}
        {!editing && pending.length ? (
          <p className="ocm-note">
            <i className="bi bi-info-circle" aria-hidden="true" />
            {listWords(pending)} on posts are not available yet. Posts are text with a type and a
            team.
          </p>
        ) : null}
        <p className="ocm-note">
          <i className="bi bi-lock" aria-hidden="true" />
          Only members of your council can read this.
        </p>
        {sample ? <SampleNote /> : null}
        {error ? (
          <p className="ocm-dlg__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

const pad = (n) => String(n).padStart(2, '0');
function localDay(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Add a council event (executives and portfolio managers). */
export function EventDialog({ teams, sample, onSubmit, onClose }) {
  const tomorrow = new Date(Date.now() + 86400000);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('meeting');
  const [day, setDay] = useState(localDay(tomorrow));
  const [time, setTime] = useState('16:00');
  const [team, setTeam] = useState(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError('Give the event a title.');
      document.getElementById('ocm-evt-title')?.focus();
      return;
    }
    const when = new Date(`${day}T${time || '00:00'}`);
    if (Number.isNaN(when.getTime())) {
      setError('Choose a date and time.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await onSubmit({
      title,
      event_type: type,
      event_date: when.toISOString(),
      team_id: team,
      description,
    });
    if (r.ok) {
      onClose(r.sample ? 'Event added to the sample. It is not saved.' : 'Event added.');
      return;
    }
    setBusy(false);
    setError(failText(r, 'That did not go through. Nothing was saved. Try again.'));
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : () => onClose()}
      title="New event"
      size={560}
      className="ocm-dlg"
      footer={
        <Footer onCancel={() => onClose()} busy={busy} label="Add event" form="ocm-evt-form" />
      }
    >
      <form id="ocm-evt-form" className="ocm-dlg__form" onSubmit={submit} noValidate>
        <label className="ocm-dlg__group">
          <span className="ocm-dlg__label">Title</span>
          <input
            id="ocm-evt-title"
            className="ocm-field"
            value={title}
            maxLength={MAX_EVENT_TITLE}
            autoFocus
            placeholder="Investment committee"
            aria-invalid={error && !title.trim() ? true : undefined}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <Choice
          label="Type"
          value={type}
          options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABEL[t] }))}
          onChange={setType}
        />
        <div className="ocm-dlg__pair">
          <label className="ocm-dlg__group">
            <span className="ocm-dlg__label">Date</span>
            <input
              type="date"
              className="ocm-field tcc-mono"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <label className="ocm-dlg__group">
            <span className="ocm-dlg__label">Time</span>
            <input
              type="time"
              className="ocm-field tcc-mono"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <Choice
          label="Team"
          value={team}
          options={[
            { value: null, label: 'All council' },
            ...teams.map((t) => ({ value: t.id, label: t.name })),
          ]}
          onChange={setTeam}
        />
        <label className="ocm-dlg__group">
          <span className="ocm-dlg__label">Description (optional)</span>
          <textarea
            className="ocm-field ocm-field--area"
            rows={3}
            value={description}
            maxLength={MAX_EVENT_DESC}
            placeholder="Agenda, pre-reads or location"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {sample ? <SampleNote /> : null}
        {error ? (
          <p className="ocm-dlg__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

const quote = (post) => {
  if (post.title) return post.title;
  const t = String(post.content || '');
  return t.length > 60 ? `${t.slice(0, 60).trim()}...` : t;
};

/** Delete my post (author) or Remove post (executive). */
export function ConfirmPostDialog({ kind, post, sample, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const remove = kind === 'remove';
  const go = async () => {
    setBusy(true);
    setError(null);
    const r = await onConfirm();
    if (r.ok) {
      onClose(
        r.sample
          ? 'Applied to the sample. It is not saved.'
          : remove
            ? 'Post removed.'
            : 'Post deleted.',
      );
      return;
    }
    setBusy(false);
    setError(failText(r, 'That did not go through. Nothing was changed. Try again.'));
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : () => onClose()}
      title={remove ? 'Remove post' : 'Delete my post'}
      size={520}
      className="ocm-dlg"
      footer={
        <Footer
          onCancel={() => onClose()}
          busy={busy}
          label={remove ? 'Remove post' : 'Delete post'}
          onSubmit={go}
          danger
        />
      }
    >
      <p className="ocm-dlg__text">
        {remove
          ? `Remove "${quote(post)}" by ${post.authorName} from the council feed? Members will no longer see it, and its replies and reactions go with it. Only executives can remove posts.`
          : `Delete your post "${quote(post)}"? Its replies and reactions are deleted with it. This cannot be undone.`}
      </p>
      {sample ? <SampleNote /> : null}
      {error ? (
        <p className="ocm-dlg__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
