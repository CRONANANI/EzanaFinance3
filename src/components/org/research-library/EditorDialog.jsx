'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ds';
import {
  DOC_TYPES,
  SECTORS,
  VISIBILITY,
  cleanTitle,
  noteRights,
} from '@/lib/org-research-library-model';
import { ActionMessage, say } from './parts';

const EMPTY = {
  doc_type: 'note',
  title: '',
  abstract: '',
  body: '',
  ticker: '',
  sector: '',
  term: '',
  tags: '',
  visibility: 'org',
  citations: '',
  pitch_id: '',
};

function fromNote(note) {
  if (!note) return EMPTY;
  return {
    doc_type: note.doc_type || 'note',
    title: cleanTitle(note.title) === 'Untitled' ? '' : note.title || '',
    abstract: note.abstract || '',
    body: note.body || '',
    ticker: note.ticker || '',
    sector: note.sector || '',
    term: note.term || '',
    tags: (note.tags || []).join(', '),
    visibility: note.visibility || 'org',
    citations: note.citations || '',
    pitch_id: note.pitch_id || '',
  };
}

function payload(f) {
  const tags = f.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  /* The ticker is also kept as a tag, so it is found by tag search. */
  const tk = f.ticker.trim().toLowerCase();
  if (tk && !tags.map((t) => t.toLowerCase()).includes(tk)) tags.push(tk);
  return {
    doc_type: f.doc_type,
    title: f.title.trim(),
    abstract: f.abstract.trim() || null,
    body: f.body,
    ticker: f.ticker.trim().toUpperCase() || null,
    sector: f.sector || null,
    term: f.term.trim() || null,
    tags: tags.slice(0, 12),
    visibility: f.visibility,
    citations: f.citations.trim() || null,
    pitch_id: f.pitch_id || null,
  };
}

/**
 * Write or edit a document. A new document is saved as a draft (or saved and
 * published at once). Files are attached from the document's Files tab once
 * it exists. Every field mirrors what the routes accept.
 */
export function EditorDialog({ note, viewer, sample, knownTickers, data, onClose, onSaved }) {
  const [savedId, setSavedId] = useState(note?.id || null);
  const [form, setForm] = useState(() => fromNote(note));
  const [templates, setTemplates] = useState({ status: 'loading', data: [] });
  const [pitches, setPitches] = useState({ status: 'loading', data: [] });
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [blockers, setBlockers] = useState(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { getTemplates, getPitches } = data;
  useEffect(() => {
    getTemplates().then((t) => alive.current && setTemplates(t));
    getPitches().then((p) => alive.current && setPitches(p));
  }, [getTemplates, getPitches]);

  const editing = Boolean(note);
  const status = note?.status || 'draft';
  const rights = editing ? noteRights(note, viewer) : null;
  /* An author can always publish their own new document. */
  const canPublish = editing ? rights.canPublish : true;
  const isPublished = editing && status === 'published';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pitchOptions = useMemo(() => {
    const list = (pitches.data || []).map((p) => ({
      value: p.id,
      label: [p.ticker, p.title || p.company_name].filter(Boolean).join(': ') || 'Pitch',
    }));
    if (form.pitch_id && !list.some((o) => o.value === form.pitch_id))
      list.unshift({ value: form.pitch_id, label: 'Current link (not an active pitch)' });
    return [{ value: '', label: 'None' }, ...list];
  }, [pitches.data, form.pitch_id]);

  const applyTemplate = (tid) => {
    setTemplateId(tid);
    const t = (templates.data || []).find((x) => x.id === tid);
    if (!t) return;
    setForm((f) => {
      const next = { ...f, doc_type: t.doc_type || f.doc_type };
      /* Fill only an empty body, so writing is never overwritten. */
      if (!f.body.trim()) {
        const scaffold =
          t.body_scaffold ||
          (Array.isArray(t.required_sections)
            ? t.required_sections.map((s) => `## ${s}\n\n`).join('\n')
            : '');
        if (scaffold) next.body = scaffold;
      }
      return next;
    });
  };

  const validate = (publish) => {
    const e = {};
    if (!form.title.trim()) e.title = 'Write a title.';
    if (!form.body.trim()) e.body = 'Write the body.';
    if (publish && !form.abstract.trim()) e.abstract = 'An abstract is required to publish.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (publish) => {
    if (!validate(publish)) return;
    setBusy(publish ? 'publish' : 'save');
    setMsg(null);
    setBlockers(null);
    const out = await data.act(
      savedId
        ? { type: 'edit', id: savedId, form: payload(form) }
        : { type: 'create', form: payload(form) },
    );
    if (!alive.current) return;
    if (!out.ok) {
      setBusy(null);
      setMsg({
        tone: 'error',
        text: say(out.error, 'Could not save the document. Nothing was changed.'),
      });
      return;
    }
    const id = savedId || out.id;
    if (!savedId && id) setSavedId(id);
    if (publish && id) {
      const pub = await data.act({ type: 'publish', id });
      if (!alive.current) return;
      setBusy(null);
      if (!pub.ok) {
        if (pub.blockers && pub.blockers.length) setBlockers(pub.blockers);
        setMsg({
          tone: 'error',
          text:
            pub.blockers && pub.blockers.length
              ? `Saved${editing ? '' : ' as a draft'}. Publishing is blocked for the reasons below.`
              : `Saved${editing ? '' : ' as a draft'}, but ${say(pub.error, 'publishing failed').replace(/\.$/, '').toLowerCase()}.`,
        });
        return;
      }
      onSaved({ id, text: `Published "${form.title.trim()}".` });
      return;
    }
    setBusy(null);
    onSaved({
      id,
      text: editing
        ? `Saved "${form.title.trim()}".`
        : `Saved "${form.title.trim()}" as a draft. Attach files from its Files tab.`,
    });
  };

  const vis = VISIBILITY.find((v) => v.value === form.visibility) || VISIBILITY[0];
  const working = Boolean(busy);

  return (
    <Modal
      open
      onClose={working ? undefined : onClose}
      title={editing ? 'Edit document' : 'New research note'}
      size={760}
      className="orl-dialog orl-editor"
      footer={
        <div className="orl-dfoot">
          <p className="orl-dfoot__note">
            <i className="bi bi-info-circle" aria-hidden="true" />
            {isPublished
              ? 'Saving keeps it published and stores the earlier version.'
              : 'Drafts are listed for you and for executives and portfolio managers. Choose Private to keep a draft to yourself.'}
            {sample ? ' Sample content: nothing is saved.' : ''}
          </p>
          <div className="orl-dfoot__right">
            <button type="button" className="tcc-textbtn" onClick={onClose} disabled={working}>
              Cancel
            </button>
            {isPublished ? (
              <Button
                variant="primary"
                className="tcc-flatbtn"
                loading={busy === 'save'}
                disabled={working}
                onClick={() => save(false)}
              >
                Save changes
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  className="tcc-textbtn"
                  onClick={() => save(false)}
                  disabled={working}
                >
                  {busy === 'save' ? 'Saving' : editing ? 'Save' : 'Save draft'}
                </button>
                {canPublish && (
                  <Button
                    variant="primary"
                    className="tcc-flatbtn"
                    loading={busy === 'publish'}
                    disabled={working}
                    onClick={() => save(true)}
                  >
                    Save and publish
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="orl-form">
        <div className="orl-form__pair">
          <Select
            id="orl-f-type"
            label="Type"
            value={form.doc_type}
            onChange={set('doc_type')}
            options={DOC_TYPES}
          />
          <Select
            id="orl-f-template"
            label="Template (optional)"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            hint={
              templates.status === 'error'
                ? 'Templates could not be loaded.'
                : (templates.data || []).length === 0
                  ? 'No templates yet.'
                  : 'Fills an empty body with the required sections.'
            }
            options={[
              { value: '', label: 'None' },
              ...(templates.data || []).map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        </div>
        <Input
          id="orl-f-title"
          label="Title"
          value={form.title}
          onChange={set('title')}
          maxLength={200}
          error={errors.title}
          placeholder="A descriptive title"
        />
        <Textarea
          id="orl-f-abstract"
          label="Abstract (required to publish)"
          value={form.abstract}
          onChange={set('abstract')}
          rows={3}
          maxLength={800}
          error={errors.abstract}
          placeholder="Two to five sentences: the view, why, and the main risk"
        />
        <Textarea
          id="orl-f-body"
          label="Body"
          value={form.body}
          onChange={set('body')}
          rows={10}
          maxLength={20000}
          error={errors.body}
          hint="Markdown is shown formatted: ## headings, lists, **bold**, *italic* and links. HTML is not shown."
        />
        <div className="orl-form__trio">
          <Input
            id="orl-f-ticker"
            label="Ticker"
            value={form.ticker}
            onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            maxLength={12}
            list="orl-ticker-list"
            className="orl-mono"
            hint="Also kept as a tag; links the dossier."
          />
          <Select
            id="orl-f-sector"
            label="Sector"
            value={form.sector}
            onChange={set('sector')}
            options={[{ value: '', label: 'None' }, ...SECTORS]}
          />
          <Input
            id="orl-f-term"
            label="Term"
            value={form.term}
            onChange={set('term')}
            maxLength={40}
            placeholder="Fall 2026"
          />
        </div>
        <datalist id="orl-ticker-list">
          {(knownTickers || []).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <fieldset className="orl-vis">
          <legend className="ds-field-label">Visibility</legend>
          <div className="tcc-toggles" role="radiogroup" aria-label="Visibility">
            {VISIBILITY.map((v) => (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={form.visibility === v.value}
                className={`tcc-toggle${form.visibility === v.value ? ' is-on' : ''}`}
                onClick={() => setForm((f) => ({ ...f, visibility: v.value }))}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className={`orl-small ${form.visibility === 'team' ? 'orl-warn' : 'orl-muted'}`}>
            {form.visibility === 'team' && (
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            )}
            {vis.hint}
          </p>
        </fieldset>
        <div className="orl-form__pair">
          <Input
            id="orl-f-tags"
            label="Tags (comma separated)"
            value={form.tags}
            onChange={set('tags')}
            placeholder="banks, handoff"
          />
          <Select
            id="orl-f-pitch"
            label="Linked pitch (optional)"
            value={form.pitch_id}
            onChange={set('pitch_id')}
            options={pitchOptions}
            hint={
              pitches.status === 'error'
                ? 'Pitches could not be loaded.'
                : 'Active pitches in the Pitch Pipeline.'
            }
          />
        </div>
        <Input
          id="orl-f-sources"
          label="Sources (optional)"
          value={form.citations}
          onChange={set('citations')}
          maxLength={4000}
          placeholder="Company filings, council model"
        />
        <p className="orl-small orl-muted">
          <i className="bi bi-paperclip" aria-hidden="true" />{' '}
          {savedId
            ? 'Attach and delete files from the document’s Files tab.'
            : 'Files can be attached after the first save.'}
        </p>
        {blockers && blockers.length > 0 && (
          <div className="orl-note orl-note--warn" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <div>
              <p className="orl-note__title">Publishing was refused:</p>
              <ul>
                {blockers.map((b) => (
                  <li key={b.code}>{b.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <ActionMessage msg={msg} onDismiss={() => setMsg(null)} />
      </div>
    </Modal>
  );
}
