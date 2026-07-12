'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Loader2, FileText, Sparkles, Paperclip, Upload, Download, Trash2 } from 'lucide-react';
import './research2.css';

function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

export const DOC_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'pitch_memo', label: 'Pitch memo' },
  { value: 'model', label: 'Model' },
  { value: 'primer', label: 'Primer' },
  { value: 'post_mortem', label: 'Post-mortem' },
  { value: 'ic_minutes', label: 'IC minutes' },
  { value: 'reading', label: 'Reading' },
  { value: 'competition', label: 'Competition' },
  { value: 'external', label: 'External' },
];

/**
 * Editor for a typed research doc. Creates a draft (POST) or edits (PATCH), then
 * optionally runs the publish gate. Abstract is required to publish; templates
 * seed the body scaffold and are enforced server-side on publish.
 */
export function NoteComposer({ open, onClose, onSaved, note = null, knownTickers = [] }) {
  const editing = !!note;
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [body, setBody] = useState('');
  const [docType, setDocType] = useState('note');
  const [ticker, setTicker] = useState('');
  const [sector, setSector] = useState('');
  const [term, setTerm] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [visibility, setVisibility] = useState('org');
  const [citations, setCitations] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blockers, setBlockers] = useState([]);
  const [tickerFocus, setTickerFocus] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attBusy, setAttBusy] = useState(false);
  const [attError, setAttError] = useState('');
  const attFileRef = useRef(null);
  const noteId = note?.id || null;

  const loadAttachments = useCallback(async () => {
    if (!noteId) {
      setAttachments([]);
      return;
    }
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}/attachments`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setAttachments(data.attachments || []);
    } catch {
      /* keep prior list */
    }
  }, [noteId]);

  const uploadAttachment = async (file) => {
    if (!file || !noteId) return;
    setAttBusy(true);
    setAttError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/org/research-notes/${noteId}/attachments`, {
        method: 'POST',
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAttError(data?.error || 'Upload failed.');
        return;
      }
      await loadAttachments();
    } catch {
      setAttError('Could not connect.');
    } finally {
      setAttBusy(false);
      if (attFileRef.current) attFileRef.current.value = '';
    }
  };

  const deleteAttachment = async (attId) => {
    if (!noteId) return;
    setAttBusy(true);
    setAttError('');
    try {
      const res = await fetch(
        `/api/org/research-notes/${noteId}/attachments?attachmentId=${encodeURIComponent(attId)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAttError(data?.error || 'Could not delete.');
        return;
      }
      await loadAttachments();
    } catch {
      setAttError('Could not connect.');
    } finally {
      setAttBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Seed from an existing note when editing.
    setTitle(note?.title || '');
    setAbstract(note?.abstract || '');
    setBody(note?.body || '');
    setDocType(note?.doc_type || 'note');
    setTicker(note?.ticker || '');
    setSector(note?.sector || '');
    setTerm(note?.term || '');
    setTagsRaw((note?.tags || []).join(', '));
    setVisibility(note?.visibility || 'org');
    setCitations(note?.citations || '');
    setError('');
    setBlockers([]);
    setTemplateId('');
    setAttError('');
    setAttachments([]);
    loadAttachments();
  }, [open, note, loadAttachments]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/org/research-notes/templates', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  }, [open]);

  const tickerSuggestions = useMemo(() => {
    const q = ticker.trim().toUpperCase();
    if (!q) return [];
    return knownTickers
      .filter((t) => t.toUpperCase().startsWith(q) && t.toUpperCase() !== q)
      .slice(0, 6);
  }, [ticker, knownTickers]);

  if (!open) return null;

  const applyTemplate = (id) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.doc_type) setDocType(t.doc_type);
    // Only seed the body if it's still empty, so we never clobber real writing.
    if (!body.trim()) {
      const scaffold =
        t.body_scaffold ||
        (Array.isArray(t.required_sections) && t.required_sections.length
          ? t.required_sections.map((s) => `## ${s}\n\n`).join('\n')
          : '');
      if (scaffold) setBody(scaffold);
    }
  };

  const buildTags = () => {
    const list = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    // Auto-tag with the ticker (lowercased) so it's searchable as a tag too.
    const tk = ticker.trim().toLowerCase();
    if (tk && !list.map((t) => t.toLowerCase()).includes(tk)) list.push(tk);
    return list.slice(0, 12);
  };

  async function persist() {
    const payload = {
      title,
      body,
      abstract: abstract.trim() || null,
      doc_type: docType,
      ticker: ticker.trim() || null,
      sector: sector || null,
      term: term.trim() || null,
      tags: buildTags(),
      visibility,
      citations: citations.trim() || null,
    };
    const url = editing ? `/api/org/research-notes/${note.id}` : '/api/org/research-notes';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Could not save the document.');
    return data.note;
  }

  const submit = async (publishAfter) => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    if (publishAfter && !abstract.trim()) {
      setError('A TL;DR abstract is required to publish.');
      return;
    }
    setSaving(true);
    setError('');
    setBlockers([]);
    try {
      const saved = await persist();
      if (publishAfter && saved?.id) {
        const pubRes = await fetch(`/api/org/research-notes/${saved.id}/publish`, {
          method: 'POST',
        });
        const pubData = await pubRes.json().catch(() => ({}));
        if (pubRes.status === 409) {
          setBlockers(pubData.blockers || []);
          setError('Saved as draft — publish is blocked (see below).');
          onSaved?.(saved);
          return;
        }
        if (!pubRes.ok) {
          setError(pubData?.error || 'Saved, but publishing failed.');
          onSaved?.(saved);
          return;
        }
        onSaved?.(pubData.note || saved);
        onClose?.();
        return;
      }
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      setError(e.message || 'Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rl2-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
    >
      <div
        className="rl2-modal rl2-root"
        role="dialog"
        aria-modal="true"
        aria-label="Research document editor"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="rl2-modal-title">
              {editing ? 'Edit document' : 'New research document'}
            </h2>
            <p className="rl2-modal-sub">
              Drafts stay private to you until published. Publishing enforces the abstract and any
              template sections.
            </p>
          </div>
          <button type="button" className="rl2-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="rl2-row2">
          <div className="rl2-field">
            <label className="rl2-label">Document type</label>
            <select
              className="rl2-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rl2-field">
            <label className="rl2-label">
              <FileText size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Template (optional)
            </label>
            <select
              className="rl2-select"
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">— None —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rl2-field">
          <label className="rl2-label">Title</label>
          <input
            className="rl2-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NVDA — datacenter demand still underappreciated"
            maxLength={200}
          />
        </div>

        <div className="rl2-field">
          <label className="rl2-label">
            Abstract / TL;DR <span className="rl2-req">(required to publish)</span>
          </label>
          <textarea
            className="rl2-textarea"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            placeholder="Two or three sentences: the call, the why, the risk."
            rows={2}
            maxLength={800}
          />
        </div>

        <div className="rl2-field">
          <label className="rl2-label">Body</label>
          <textarea
            className="rl2-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Markdown welcome. Lay out the thesis, valuation, catalysts, risks…"
            rows={8}
          />
        </div>

        <div className="rl2-row2">
          <div className="rl2-field rl2-ac">
            <label className="rl2-label">Ticker</label>
            <input
              className="rl2-input"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onFocus={() => setTickerFocus(true)}
              onBlur={() => setTimeout(() => setTickerFocus(false), 150)}
              placeholder="NVDA"
              maxLength={12}
            />
            {tickerFocus && tickerSuggestions.length > 0 && (
              <div className="rl2-ac-menu">
                {tickerSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="rl2-ac-item"
                    onMouseDown={() => setTicker(t.toUpperCase())}
                  >
                    <span className="t">{t}</span>
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.72rem' }}>
                      in library
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="rl2-hint">Auto-added as a tag and linked to the ticker dossier.</div>
          </div>
          <div className="rl2-field">
            <label className="rl2-label">Sector</label>
            <select
              className="rl2-select"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            >
              <option value="">—</option>
              {GICS_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rl2-row2">
          <div className="rl2-field">
            <label className="rl2-label">Term</label>
            <input
              className="rl2-input"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. Fall 2026"
              maxLength={40}
            />
          </div>
          <div className="rl2-field">
            <label className="rl2-label">Visibility</label>
            <select
              className="rl2-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="org">Whole org</option>
              <option value="team">My team</option>
              <option value="private">Private (just me)</option>
            </select>
          </div>
        </div>

        <div className="rl2-row2">
          <div className="rl2-field">
            <label className="rl2-label">Tags (comma-separated)</label>
            <input
              className="rl2-input"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="ai, moat, long"
            />
          </div>
          <div className="rl2-field">
            <label className="rl2-label">Citations / sources (optional)</label>
            <input
              className="rl2-input"
              value={citations}
              onChange={(e) => setCitations(e.target.value)}
              placeholder="10-K FY25, sell-side notes…"
            />
          </div>
        </div>

        {/* Attachments — available once the document exists (edit mode). */}
        <div className="rl2-field">
          <label className="rl2-label">
            <Paperclip size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Attachments
          </label>
          {!editing ? (
            <div className="rl2-hint">
              Save the draft first — you can attach files once the document exists.
            </div>
          ) : (
            <>
              {attachments.length === 0 ? (
                <div className="rl2-hint">No attachments yet.</div>
              ) : (
                <div className="rl2-attach-list">
                  {attachments.map((att) => (
                    <div key={att.id} className="rl2-attach-row">
                      <FileText size={14} className="rl2-attach-icon" />
                      <span className="rl2-attach-name">{att.file_name}</span>
                      <span className="rl2-attach-size rl2-num">{fmtBytes(att.size_bytes)}</span>
                      {att.signed_url && (
                        <a
                          className="rl2-attach-act"
                          href={att.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.file_name}
                          aria-label={`Download ${att.file_name}`}
                        >
                          <Download size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        className="rl2-attach-act rl2-attach-act--danger"
                        onClick={() => deleteAttachment(att.id)}
                        disabled={attBusy}
                        aria-label={`Delete ${att.file_name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <input
                  ref={attFileRef}
                  type="file"
                  className="rl2-visually-hidden"
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,.pptx"
                  onChange={(e) => uploadAttachment(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="rl2-btn rl2-btn--sm"
                  onClick={() => attFileRef.current?.click()}
                  disabled={attBusy}
                >
                  {attBusy ? <Loader2 size={13} className="rl2-spin" /> : <Upload size={13} />}
                  {attBusy ? 'Uploading…' : 'Attach file'}
                </button>
                <span className="rl2-hint" style={{ marginLeft: 8 }}>
                  PDF, Office, CSV, or image · up to 25 MB
                </span>
              </div>
              {attError && (
                <div className="rl2-blocker" style={{ marginTop: 8 }}>
                  {attError}
                </div>
              )}
            </>
          )}
        </div>

        {blockers.length > 0 && (
          <div className="rl2-blocker">
            <strong>Cannot publish yet:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {blockers.map((b) => (
                <li key={b.code}>{b.message}</li>
              ))}
            </ul>
          </div>
        )}
        {error && <div className="rl2-blocker">{error}</div>}

        <div className="rl2-modal-actions">
          <button
            type="button"
            className="rl2-btn rl2-btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="button" className="rl2-btn" onClick={() => submit(false)} disabled={saving}>
            {saving ? <Loader2 size={14} className="rl2-spin" /> : null} Save draft
          </button>
          <button
            type="button"
            className="rl2-btn rl2-btn--primary"
            onClick={() => submit(true)}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="rl2-spin" /> : <Sparkles size={14} />} Save
            &amp; publish
          </button>
        </div>
      </div>
    </div>
  );
}
