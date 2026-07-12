'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  X,
  Sparkles,
  Loader2,
  Eye,
  Download,
  FileText,
  ChevronDown,
  Check,
  Library,
  LineChart,
  GitBranch,
  Clock,
  Star,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  History,
  MessageSquare,
  ShieldCheck,
  Pencil,
  Award,
  Users,
} from 'lucide-react';
import { NoteComposer, DOC_TYPES } from './NoteComposer';
import './research2.css';

const DOC_TYPE_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));
const STATUS_LABEL = {
  draft: 'Draft',
  under_review: 'Under review',
  published: 'Published',
  archived: 'Archived',
  superseded: 'Superseded',
};

function docTypeLabel(v) {
  return DOC_TYPE_LABEL[v] || v;
}
function statusLabel(v) {
  return STATUS_LABEL[v] || v;
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 30) return fmtDate(iso);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

const FILTER_DIMS = [
  { key: 'type', label: 'Type', labeler: docTypeLabel },
  { key: 'sector', label: 'Sector', labeler: (v) => v },
  { key: 'status', label: 'Publish status', labeler: statusLabel },
  { key: 'term', label: 'Term', labeler: (v) => v },
  { key: 'author', label: 'Author', labeler: null }, // labelled via authorNames
  { key: 'ticker', label: 'Ticker', labeler: (v) => v },
];

/* ── Filter dropdown ──────────────────────────────────────────────────────*/
function FilterDropdown({ dim, facet, selected, authorNames, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const entries = Object.entries(facet || {}).sort((a, b) => b[1] - a[1]);
  const labelFor = (val) =>
    dim.key === 'author' ? authorNames[val] || 'Member' : dim.labeler(val);
  return (
    <div className="rl2-dropdown" ref={ref}>
      <button
        type="button"
        className={`rl2-dropdown-btn${selected.length ? ' has-selection' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {dim.label}
        {selected.length > 0 && <span className="rl2-dropdown-badge">{selected.length}</span>}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="rl2-menu" role="menu">
          {entries.length === 0 ? (
            <div className="rl2-menu-empty">No values yet</div>
          ) : (
            entries.map(([val, count]) => {
              const isSel = selected.includes(val);
              return (
                <button
                  key={val}
                  type="button"
                  className={`rl2-menu-item${isSel ? ' is-selected' : ''}`}
                  onClick={() => onToggle(dim.key, val)}
                >
                  <span
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}
                  >
                    <span className="rl2-menu-check">{isSel && <Check size={14} />}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {labelFor(val)}
                    </span>
                  </span>
                  <span className="rl2-menu-count">{count}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── Doc card ──────────────────────────────────────────────────────────────*/
function DocCard({ note, onOpen }) {
  return (
    <button
      type="button"
      className={`rl2-card${note.status === 'superseded' ? ' is-superseded' : ''}`}
      onClick={() => onOpen(note)}
    >
      <div className="rl2-card-top">
        <span className={`rl2-pill rl2-type-${note.doc_type}`}>{docTypeLabel(note.doc_type)}</span>
        {note.status !== 'published' && (
          <span className={`rl2-pill rl2-status-${note.status}`}>{statusLabel(note.status)}</span>
        )}
        {note.is_exemplar && (
          <span className="rl2-pill rl2-badge-exemplar">
            <Award size={11} /> Exemplar
          </span>
        )}
        {note.pinned && (
          <Star
            size={13}
            style={{ color: 'var(--gold-text)', marginLeft: 'auto' }}
            fill="currentColor"
          />
        )}
      </div>
      <h3 className="rl2-card-title">{note.title}</h3>
      {note.abstract && <p className="rl2-card-abstract">{note.abstract}</p>}
      <div className="rl2-card-tags">
        {note.ticker && <span className="rl2-pill rl2-pill--ticker">{note.ticker}</span>}
        {note.sector && <span className="rl2-tag">{note.sector}</span>}
        {note.is_alum_authored && <span className="rl2-pill rl2-badge-alum">Alum</span>}
      </div>
      <div className="rl2-card-foot">
        <span className="rl2-card-author">
          <span>{note.author_name}</span>
          {note.author_role && (
            <span style={{ opacity: 0.6 }}>· {String(note.author_role).replace(/_/g, ' ')}</span>
          )}
        </span>
        <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span className="rl2-card-views">
            <Eye size={12} /> {note.view_count || 0}
          </span>
          <span className="rl2-num">{timeAgo(note.published_at || note.created_at)}</span>
        </span>
      </div>
    </button>
  );
}

/* ── branded export / open helpers (standalone print artifact) ────────────*/
function docHtml(note) {
  const esc = (s) =>
    String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  // Standalone document — app theme tokens are unavailable in a blank window,
  // so the letterhead uses the Ezana brand emerald directly.
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(note.title)}</title>
<style>
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1a1a1a;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.6}
  .lh{border-bottom:3px solid #10b981;padding-bottom:12px;margin-bottom:20px}
  .eyebrow{color:#10b981;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px}
  h1{font-size:24px;margin:6px 0}
  .meta{color:#666;font-size:13px}
  .abstract{background:#f0fdf9;border-left:3px solid #10b981;padding:12px 16px;margin:18px 0;border-radius:4px}
  .body{white-space:pre-wrap;font-size:15px}
  .foot{margin-top:32px;border-top:1px solid #ddd;padding-top:10px;color:#999;font-size:11px}
  code,.mono{font-family:'JetBrains Mono',monospace}
</style></head><body>
  <div class="lh"><div class="eyebrow">Ezana Finance · Research Library</div>
  <h1>${esc(note.title)}</h1>
  <div class="meta">${esc(note.doc_type)} · ${esc(note.ticker || '')} ${note.sector ? '· ' + esc(note.sector) : ''} · by ${esc(note.author_name || 'Member')} · ${esc(fmtDate(note.published_at || note.created_at))} · v${esc(note.version || 1)}</div></div>
  ${note.abstract ? `<div class="abstract"><strong>TL;DR.</strong> ${esc(note.abstract)}</div>` : ''}
  <div class="body">${esc(note.body)}</div>
  ${note.citations ? `<div class="foot"><strong>Sources:</strong> ${esc(note.citations)}</div>` : ''}
  <div class="foot">Generated from the Ezana Research Library. Internal use only.</div>
</body></html>`;
}
function openDoc(note, print) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(docHtml(note));
  w.document.close();
  if (print) setTimeout(() => w.print(), 350);
}

/* ── Detail drawer ─────────────────────────────────────────────────────────*/
function DetailDrawer({ noteId, viewer, knownTickers, onClose, onChanged, onEdit, onOpenTicker }) {
  const [note, setNote] = useState(null);
  const [supersededBy, setSupersededBy] = useState(null);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [openBlocks, setOpenBlocks] = useState(0);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [blockers, setBlockers] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isBlock, setIsBlock] = useState(false);

  const canManage = viewer?.canManage;

  const reload = useCallback(async () => {
    const [nRes, vRes, cRes] = await Promise.all([
      fetch(`/api/org/research-notes/${noteId}`, { cache: 'no-store' }),
      fetch(`/api/org/research-notes/${noteId}/versions`, { cache: 'no-store' }),
      fetch(`/api/org/research-notes/${noteId}/comments`, { cache: 'no-store' }),
    ]);
    const nData = await nRes.json().catch(() => ({}));
    if (!nRes.ok) {
      setErr(nData?.error || 'Could not load document.');
      return;
    }
    setNote(nData.note);
    setSupersededBy(nData.supersededBy || null);
    const vData = await vRes.json().catch(() => ({}));
    setVersions(vData.versions || []);
    const cData = await cRes.json().catch(() => ({}));
    setComments(cData.comments || []);
    setOpenBlocks(cData.openBlocks || 0);
  }, [noteId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      await reload();
      // Count a view (server ignores the author's own opens).
      fetch(`/api/org/research-notes/${noteId}/view`, { method: 'POST' }).catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, [noteId, reload]);

  const author = note && note.author_id === viewer?.userId;
  const canEdit = author || canManage;

  const runSummary = async () => {
    setSummaryLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}/summary`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || 'AI summary unavailable.');
        return;
      }
      setSummary(data.summary || '');
    } finally {
      setSummaryLoading(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setErr('');
    setBlockers([]);
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}/publish`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setBlockers(data.blockers || []);
        return;
      }
      if (!res.ok) {
        setErr(data?.error || 'Publish failed.');
        return;
      }
      await reload();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const supersede = async () => {
    // Supersede with no successor id — marks readable-but-superseded.
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}/supersede`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await reload();
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleExemplar = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_exemplar: !note.is_exemplar }),
      });
      if (res.ok) {
        await reload();
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await reload();
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (res.ok) {
        await reload();
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText, is_review_block: isBlock }),
      });
      if (res.ok) {
        setCommentText('');
        setIsBlock(false);
        await reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const resolveComment = async (c) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/research-notes/${noteId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: c.id, resolved: !c.resolved }),
      });
      if (res.ok) await reload();
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = () => {
    openDoc(note, true);
    fetch(`/api/org/research-notes/${noteId}/download`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="rl2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rl2-drawer rl2-root" role="dialog" aria-modal="true">
        <div className="rl2-drawer-head">
          <div style={{ minWidth: 0 }}>
            {note && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`rl2-pill rl2-type-${note.doc_type}`}>
                  {docTypeLabel(note.doc_type)}
                </span>
                <span className={`rl2-pill rl2-status-${note.status}`}>
                  {statusLabel(note.status)}
                </span>
                {note.is_exemplar && (
                  <span className="rl2-pill rl2-badge-exemplar">
                    <Award size={11} /> Exemplar
                  </span>
                )}
              </div>
            )}
            <h2 className="rl2-drawer-title">{note ? note.title : 'Loading…'}</h2>
          </div>
          <button type="button" className="rl2-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {err && <div className="rl2-blocker">{err}</div>}

        {note && note.status === 'superseded' && (
          <div className="rl2-blocker">
            This document has been superseded{supersededBy ? ` by "${supersededBy.title}"` : ''}. It
            stays readable as institutional memory.
          </div>
        )}

        {note && (
          <>
            {/* AI summary */}
            <div className="rl2-section">
              <div className="rl2-section-title">
                <Sparkles size={13} /> AI summary
              </div>
              {summary ? (
                <div className="rl2-ai-box">{summary}</div>
              ) : (
                <button
                  type="button"
                  className="rl2-btn rl2-btn--sm"
                  onClick={runSummary}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? (
                    <Loader2 size={13} className="rl2-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  {summaryLoading ? 'Summarizing…' : 'Generate summary'}
                </button>
              )}
            </div>

            {/* Metadata */}
            <div className="rl2-section">
              <div className="rl2-section-title">Details</div>
              <div className="rl2-meta-grid">
                <div className="rl2-meta-item">
                  <div className="k">Author</div>
                  <div className="v">
                    {note.author_name}
                    {note.author_role ? ` · ${String(note.author_role).replace(/_/g, ' ')}` : ''}
                  </div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Published</div>
                  <div className="v rl2-num">
                    {note.published_at ? fmtDate(note.published_at) : '—'}
                  </div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Ticker</div>
                  <div className="v">
                    {note.ticker ? (
                      <button
                        type="button"
                        className="rl2-pill rl2-pill--ticker"
                        onClick={() => onOpenTicker(note.ticker)}
                      >
                        {note.ticker}
                      </button>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Sector</div>
                  <div className="v">{note.sector || '—'}</div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Term</div>
                  <div className="v">{note.term || '—'}</div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Version</div>
                  <div className="v rl2-num">v{note.version || 1}</div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Views</div>
                  <div className="v rl2-num">{note.view_count || 0}</div>
                </div>
                <div className="rl2-meta-item">
                  <div className="k">Downloads</div>
                  <div className="v rl2-num">{note.download_count || 0}</div>
                </div>
                {note.pitch_id && (
                  <div className="rl2-meta-item">
                    <div className="k">Linked pitch</div>
                    <div className="v">
                      <a href="/org-team-hub/pitches" style={{ color: 'var(--emerald-text)' }}>
                        View pitch <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Abstract + body */}
            {note.abstract && (
              <div className="rl2-section">
                <div className="rl2-section-title">Abstract</div>
                <div className="rl2-body-render">{note.abstract}</div>
              </div>
            )}
            <div className="rl2-section">
              <div className="rl2-section-title">Document</div>
              <div className="rl2-body-render">{note.body}</div>
              {note.citations && (
                <div className="rl2-hint" style={{ marginTop: 10 }}>
                  <strong>Sources:</strong> {note.citations}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="rl2-section">
              <div className="rl2-drawer-actions">
                <button
                  type="button"
                  className="rl2-btn rl2-btn--sm"
                  onClick={() => openDoc(note, false)}
                >
                  <ExternalLink size={13} /> Open
                </button>
                <button type="button" className="rl2-btn rl2-btn--sm" onClick={exportPdf}>
                  <Download size={13} /> Export PDF
                </button>
                {canEdit && note.status !== 'superseded' && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm"
                    onClick={() => onEdit(note)}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                )}
                {canEdit && note.status === 'draft' && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm"
                    onClick={() => setStatus('under_review')}
                    disabled={busy}
                  >
                    <MessageSquare size={13} /> Submit for review
                  </button>
                )}
                {canEdit && note.status === 'under_review' && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm rl2-btn--ghost"
                    onClick={() => setStatus('draft')}
                    disabled={busy}
                  >
                    Back to draft
                  </button>
                )}
                {canEdit && note.status !== 'published' && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm rl2-btn--primary"
                    onClick={publish}
                    disabled={busy}
                  >
                    <ShieldCheck size={13} /> Publish
                  </button>
                )}
                {canEdit && note.status === 'published' && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm"
                    onClick={supersede}
                    disabled={busy}
                  >
                    <Clock size={13} /> Supersede
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm"
                    onClick={toggleExemplar}
                    disabled={busy}
                  >
                    <Award size={13} /> {note.is_exemplar ? 'Unset exemplar' : 'Mark exemplar'}
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm"
                    onClick={togglePin}
                    disabled={busy}
                  >
                    <Star size={13} /> {note.pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
              </div>
              {blockers.length > 0 && (
                <div className="rl2-blocker" style={{ marginTop: 10 }}>
                  <strong>Publish blocked:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {blockers.map((b) => (
                      <li key={b.code}>{b.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Version history */}
            <div className="rl2-section">
              <div className="rl2-section-title">
                <History size={13} /> Version history
              </div>
              {versions.length === 0 ? (
                <div className="rl2-hint">No prior versions — this is the original.</div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="rl2-vrow">
                    <span className="rl2-vnum">v{v.version}</span>
                    <span style={{ flex: 1 }}>{v.title}</span>
                    <span className="rl2-crow-meta">
                      {v.editor_name} · {timeAgo(v.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Review / comments */}
            <div className="rl2-section">
              <div className="rl2-section-title">
                <MessageSquare size={13} /> Review thread
                {openBlocks > 0 && (
                  <span className="rl2-pill rl2-status-under_review" style={{ marginLeft: 6 }}>
                    {openBlocks} open block{openBlocks > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {comments.length === 0 && <div className="rl2-hint">No comments yet.</div>}
              {comments.map((c) => (
                <div key={c.id} className="rl2-crow">
                  <div className="rl2-crow-head">
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {c.author_name}
                      {c.is_review_block && (
                        <span
                          className="rl2-pill rl2-status-under_review"
                          style={{ marginLeft: 6 }}
                        >
                          Block
                        </span>
                      )}
                      {c.resolved && (
                        <span className="rl2-pill rl2-status-published" style={{ marginLeft: 6 }}>
                          Resolved
                        </span>
                      )}
                    </span>
                    <span className="rl2-crow-meta">{timeAgo(c.created_at)}</span>
                  </div>
                  <div style={{ color: 'var(--text-body)', fontSize: '0.84rem' }}>{c.body}</div>
                  {(c.author_id === viewer?.userId || canManage) && (
                    <button
                      type="button"
                      className="rl2-btn rl2-btn--sm rl2-btn--ghost"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => resolveComment(c)}
                      disabled={busy}
                    >
                      {c.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                  )}
                </div>
              ))}
              <div className="rl2-inline-form">
                <textarea
                  className="rl2-textarea"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a review comment…"
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {canManage ? (
                    <label className="rl2-chk">
                      <input
                        type="checkbox"
                        checked={isBlock}
                        onChange={(e) => setIsBlock(e.target.checked)}
                      />{' '}
                      Blocks publish until resolved
                    </label>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm"
                    onClick={addComment}
                    disabled={busy || !commentText.trim()}
                  >
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Ticker dossier view ───────────────────────────────────────────────────*/
function DossierView({ initialTicker, knownTickers, onOpenNote }) {
  const [ticker, setTicker] = useState(initialTicker || '');
  const [input, setInput] = useState(initialTicker || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (t) => {
    if (!t) return;
    setLoading(true);
    setErr('');
    setSummary('');
    try {
      const res = await fetch(`/api/org/research-notes/dossier/${encodeURIComponent(t)}`, {
        cache: 'no-store',
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d?.error || 'Could not load dossier.');
        setData(null);
        return;
      }
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ticker) load(ticker);
  }, [ticker, load]);

  const summarizeAll = async () => {
    if (!data?.docs?.length) return;
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/org/research-notes/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_ids: data.docs.map((d) => d.id), label: `${ticker} coverage` }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setSummary(d.summary || '');
      else setErr(d?.error || 'Summary unavailable.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setTicker(input.trim().toUpperCase());
  };

  return (
    <div>
      <form className="rl2-searchbar" onSubmit={submit} style={{ marginBottom: 16 }}>
        <span className="rl2-search-icon">
          <Search size={16} />
        </span>
        <input
          className="rl2-search-input"
          list="rl2-ticker-list"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Enter a ticker (e.g. NVDA)…"
        />
        <datalist id="rl2-ticker-list">
          {knownTickers.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <button type="submit" className="rl2-btn rl2-btn--sm rl2-btn--primary">
          Open dossier
        </button>
      </form>

      {err && <div className="rl2-blocker">{err}</div>}
      {loading && <div className="rl2-state">Loading dossier…</div>}

      {!ticker && !loading && (
        <div className="rl2-state">
          <LineChart size={28} style={{ color: 'var(--text-muted)' }} />
          <h3>Ticker dossier</h3>
          <p>
            Enter a ticker to see every memo, model and note written on it — chronologically — plus
            coverage stats.
          </p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="rl2-dossier-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="rl2-dossier-ticker">{data.ticker}</span>
              {data.sector && <span className="rl2-tag">{data.sector}</span>}
              <button
                type="button"
                className="rl2-btn rl2-btn--sm"
                style={{ marginLeft: 'auto' }}
                onClick={summarizeAll}
                disabled={summaryLoading || !data.docs.length}
              >
                {summaryLoading ? (
                  <Loader2 size={13} className="rl2-spin" />
                ) : (
                  <Sparkles size={13} />
                )}{' '}
                Summarize all
              </button>
            </div>
            <div className="rl2-stat-row">
              <div className="rl2-stat">
                <div className="n">{data.stats.docCount}</div>
                <div className="l">Documents</div>
              </div>
              <div className="rl2-stat">
                <div className="n">{data.stats.analystCount}</div>
                <div className="l">Analysts</div>
              </div>
              {data.stats.coveredSinceYear && (
                <div className="rl2-stat">
                  <div className="n">{data.stats.coveredSinceYear}</div>
                  <div className="l">Covered since</div>
                </div>
              )}
              <div className="rl2-stat">
                <div className="n">{data.stats.pitchCount}</div>
                <div className="l">Pitches</div>
              </div>
              {data.stats.firstPitch?.expected_return_pct != null && (
                <div className="rl2-stat">
                  <div className="n">
                    {Number(data.stats.firstPitch.expected_return_pct).toFixed(1)}%
                  </div>
                  <div className="l">Expected return (first pitch)</div>
                </div>
              )}
            </div>
            {summary && (
              <div className="rl2-ai-box" style={{ marginTop: 14 }}>
                {summary}
              </div>
            )}
          </div>

          {data.docs.length === 0 ? (
            <div className="rl2-state">No documents on {data.ticker} yet.</div>
          ) : (
            <div className="rl2-timeline">
              {data.docs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="rl2-timeline-item"
                  onClick={() => onOpenNote(d.id)}
                >
                  <span className="rl2-timeline-date">
                    {fmtDate(d.published_at || d.created_at)}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span
                      style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <span className={`rl2-pill rl2-type-${d.doc_type}`}>
                        {docTypeLabel(d.doc_type)}
                      </span>
                      {d.status !== 'published' && (
                        <span className={`rl2-pill rl2-status-${d.status}`}>
                          {statusLabel(d.status)}
                        </span>
                      )}
                      <strong style={{ color: 'var(--text-primary)' }}>{d.title}</strong>
                    </span>
                    {d.abstract && (
                      <span
                        className="rl2-card-abstract"
                        style={{ display: 'block', marginTop: 4 }}
                      >
                        {d.abstract}
                      </span>
                    )}
                    <span className="rl2-crow-meta">
                      {d.author_name}
                      {d.author_role ? ` · ${String(d.author_role).replace(/_/g, ' ')}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Coverage lineage view ─────────────────────────────────────────────────*/
function LineageView({ knownTickers, onOpenNote }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [chain, setChain] = useState(null);
  const [staleDays, setStaleDays] = useState(90);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/org/research-notes/coverage-lineage', { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setOverview(d.tickers || []);
        setStaleDays(d.staleDays || 90);
      }
      setLoading(false);
    })();
  }, []);

  const openChain = async (t) => {
    setSelected(t);
    setChain(null);
    const res = await fetch(
      `/api/org/research-notes/coverage-lineage?ticker=${encodeURIComponent(t)}`,
      { cache: 'no-store' },
    );
    const d = await res.json().catch(() => ({}));
    if (res.ok) setChain(d);
  };

  if (loading) return <div className="rl2-state">Loading coverage lineage…</div>;

  if (selected && chain) {
    return (
      <div>
        <button
          type="button"
          className="rl2-btn rl2-btn--sm"
          style={{ marginBottom: 14 }}
          onClick={() => {
            setSelected(null);
            setChain(null);
          }}
        >
          ← All coverage
        </button>
        <div className="rl2-lineage-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="rl2-dossier-ticker">{chain.ticker}</span>
            {chain.stale && (
              <span className="rl2-stale">
                <AlertTriangle size={12} /> Stale &gt;{chain.staleDays}d
              </span>
            )}
            {chain.lastDocAt && (
              <span className="rl2-crow-meta">Last doc {fmtDate(chain.lastDocAt)}</span>
            )}
            {chain.performance?.expected_return_pct != null && (
              <span className="rl2-tag rl2-num" style={{ marginLeft: 'auto' }}>
                Exp. return {Number(chain.performance.expected_return_pct).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {chain.hops.length === 0 ? (
          <div className="rl2-state">
            No handoff chain recorded for {chain.ticker} yet. A PM records handoffs at cohort
            rollover.
          </div>
        ) : (
          <div className="rl2-lineage-list">
            {chain.hops.map((h) => (
              <div
                key={h.id}
                className="rl2-lineage-ticker-row"
                style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div className="rl2-chain">
                    <span className="rl2-chain-node">
                      <Users size={13} /> {h.from?.name || 'Unassigned'}
                    </span>
                    <span className="rl2-chain-arrow">
                      <ArrowRight size={15} />
                    </span>
                    <span className="rl2-chain-node">
                      <Users size={13} /> {h.to?.name || 'Unassigned'}
                    </span>
                  </div>
                  {h.term && <span className="rl2-tag">{h.term}</span>}
                </div>
                {h.handoff?.id && (
                  <button
                    type="button"
                    className="rl2-btn rl2-btn--sm rl2-btn--ghost"
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                    onClick={() => onOpenNote(h.handoff.id)}
                  >
                    <FileText size={13} /> Handoff packet: {h.handoff.title || 'Open'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {!overview || overview.length === 0 ? (
        <div className="rl2-state">
          <GitBranch size={28} style={{ color: 'var(--text-muted)' }} />
          <h3>No coverage lineage yet</h3>
          <p>
            Once tickers accumulate research, coverage and handoff chains appear here. Tickers
            unwritten-on for &gt;{staleDays} days are flagged stale.
          </p>
        </div>
      ) : (
        <div className="rl2-lineage-list">
          {overview.map((r) => (
            <button
              key={r.ticker}
              type="button"
              className="rl2-lineage-ticker-row"
              onClick={() => openChain(r.ticker)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span className="rl2-pill rl2-pill--ticker">{r.ticker}</span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {r.currentAnalyst ? `Current: ${r.currentAnalyst}` : 'Unassigned'}
                  </span>
                  <span className="rl2-crow-meta rl2-num">
                    {r.docCount} docs · {r.hops} handoffs
                    {r.lastDocAt ? ` · last ${fmtDate(r.lastDocAt)}` : ''}
                  </span>
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {r.expected_return_pct != null && (
                  <span className="rl2-tag rl2-num">
                    {Number(r.expected_return_pct).toFixed(1)}%
                  </span>
                )}
                {r.stale && (
                  <span className="rl2-stale">
                    <AlertTriangle size={12} /> Stale
                  </span>
                )}
                <ArrowRight size={15} style={{ color: 'var(--text-faint)' }} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────*/
export function ResearchLibrary() {
  const [view, setView] = useState('library'); // library | ticker | lineage
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filters, setFilters] = useState({
    type: [],
    sector: [],
    status: [],
    term: [],
    author: [],
    ticker: [],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [viewSummary, setViewSummary] = useState('');
  const [viewSummaryLoading, setViewSummaryLoading] = useState(false);
  const [dossierTicker, setDossierTicker] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    for (const [key, vals] of Object.entries(filters)) {
      for (const v of vals) params.append(`${key}[]`, v);
    }
    try {
      const res = await fetch(`/api/org/research-notes/search?${params.toString()}`, {
        cache: 'no-store',
      });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load library.');
        setLoading(false);
        return;
      }
      setResult(data);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters]);

  useEffect(() => {
    if (view === 'library') load();
  }, [load, view]);

  const knownTickers = useMemo(() => Object.keys(result?.facets?.ticker || {}).sort(), [result]);
  const authorNames = useMemo(() => result?.authorNames || {}, [result]);
  const viewer = result?.viewer || { canManage: false };

  const toggleFilter = (key, val) => {
    setFilters((f) => {
      const cur = f[key] || [];
      return { ...f, [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
    });
  };
  const clearFilter = (key, val) =>
    setFilters((f) => ({ ...f, [key]: (f[key] || []).filter((x) => x !== val) }));

  const activeChips = useMemo(() => {
    const chips = [];
    for (const dim of FILTER_DIMS) {
      for (const v of filters[dim.key] || []) {
        const label = dim.key === 'author' ? authorNames[v] || 'Member' : dim.labeler(v);
        chips.push({ key: dim.key, val: v, dimLabel: dim.label, label });
      }
    }
    return chips;
  }, [filters, authorNames]);

  const summarizeSet = async () => {
    const ids = (result?.notes || []).map((n) => n.id).slice(0, 40);
    if (!ids.length) return;
    setViewSummaryLoading(true);
    try {
      const res = await fetch('/api/org/research-notes/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_ids: ids, label: debouncedQ || 'current view' }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setViewSummary(d.summary || '');
      else setViewSummary('');
    } finally {
      setViewSummaryLoading(false);
    }
  };

  const openTicker = (t) => {
    setDossierTicker(t);
    setView('ticker');
    setDetailId(null);
  };

  const notes = result?.notes || [];

  return (
    <div className="rl2-root">
      <div className="rl2-header">
        <div>
          <p className="rl2-eyebrow">Team Hub</p>
          <h1 className="rl2-title">Research Library</h1>
          <p className="rl2-sub">
            Typed, versioned institutional memory — theses that survive cohort rollover.
          </p>
        </div>
        <div className="rl2-header-actions">
          <div className="rl2-toggle" role="tablist">
            <button
              type="button"
              className={view === 'library' ? 'is-active' : ''}
              onClick={() => setView('library')}
            >
              <Library size={15} /> Library
            </button>
            <button
              type="button"
              className={view === 'ticker' ? 'is-active' : ''}
              onClick={() => setView('ticker')}
            >
              <LineChart size={15} /> Ticker
            </button>
            <button
              type="button"
              className={view === 'lineage' ? 'is-active' : ''}
              onClick={() => setView('lineage')}
            >
              <GitBranch size={15} /> Lineage
            </button>
          </div>
          <button
            type="button"
            className="rl2-btn rl2-btn--primary"
            onClick={() => {
              setEditNote(null);
              setComposerOpen(true);
            }}
          >
            <Plus size={15} /> New note
          </button>
        </div>
      </div>

      {error && <div className="rl2-state rl2-error">{error}</div>}

      {!error && view === 'library' && (
        <>
          <div className="rl2-searchbar">
            <span className="rl2-search-icon">
              <Search size={16} />
            </span>
            {activeChips.map((c) => (
              <span key={`${c.key}:${c.val}`} className="rl2-chip">
                <span className="rl2-chip--label">{c.dimLabel}:</span> {c.label}
                <button
                  type="button"
                  onClick={() => clearFilter(c.key, c.val)}
                  aria-label={`Remove ${c.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              className="rl2-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles, abstracts, bodies…"
            />
            <button
              type="button"
              className="rl2-btn rl2-btn--sm"
              onClick={summarizeSet}
              disabled={viewSummaryLoading || notes.length === 0}
              title="AI summary of the current filtered set"
            >
              {viewSummaryLoading ? (
                <Loader2 size={13} className="rl2-spin" />
              ) : (
                <Sparkles size={13} />
              )}{' '}
              Summarize view
            </button>
          </div>

          <div className="rl2-filterbar">
            {FILTER_DIMS.map((dim) => (
              <FilterDropdown
                key={dim.key}
                dim={dim}
                facet={result?.facets?.[dim.key] || {}}
                selected={filters[dim.key] || []}
                authorNames={authorNames}
                onToggle={toggleFilter}
              />
            ))}
            {result?.semantic?.configured === false && (
              <span
                className="rl2-hint"
                title="Vector embeddings are not configured on this deployment; search runs keyword-only."
              >
                Keyword search
              </span>
            )}
            {result?.semantic?.enabled && <span className="rl2-hint">Semantic + keyword</span>}
          </div>

          {viewSummary && (
            <div className="rl2-ai-box" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Summary of current view</strong>
                <button type="button" className="rl2-close" onClick={() => setViewSummary('')}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ marginTop: 8 }}>{viewSummary}</div>
            </div>
          )}

          {loading ? (
            <div className="rl2-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rl2-skeleton" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            activeChips.length || debouncedQ ? (
              <div className="rl2-state">
                <Search size={26} style={{ color: 'var(--text-muted)' }} />
                <h3>No documents match</h3>
                <p>Try removing a filter chip or broadening your search.</p>
              </div>
            ) : (
              <div className="rl2-state">
                <Library size={28} style={{ color: 'var(--text-muted)' }} />
                <h3>The library is empty</h3>
                <p>
                  Publish the first thesis. Notes are typed, versioned, and survive cohort rollover.
                </p>
                <button
                  type="button"
                  className="rl2-btn rl2-btn--primary"
                  onClick={() => {
                    setEditNote(null);
                    setComposerOpen(true);
                  }}
                >
                  <Plus size={15} /> New note
                </button>
              </div>
            )
          ) : (
            <div className="rl2-grid">
              {notes.map((n) => (
                <DocCard key={n.id} note={n} onOpen={(note) => setDetailId(note.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {!error && view === 'ticker' && (
        <DossierView
          key={dossierTicker || 'blank'}
          initialTicker={dossierTicker}
          knownTickers={knownTickers}
          onOpenNote={(id) => setDetailId(id)}
        />
      )}

      {!error && view === 'lineage' && (
        <LineageView knownTickers={knownTickers} onOpenNote={(id) => setDetailId(id)} />
      )}

      {detailId && (
        <DetailDrawer
          noteId={detailId}
          viewer={viewer}
          knownTickers={knownTickers}
          onClose={() => setDetailId(null)}
          onChanged={load}
          onEdit={(note) => {
            setDetailId(null);
            setEditNote(note);
            setComposerOpen(true);
          }}
          onOpenTicker={openTicker}
        />
      )}

      <NoteComposer
        open={composerOpen}
        note={editNote}
        knownTickers={knownTickers}
        onClose={() => {
          setComposerOpen(false);
          setEditNote(null);
        }}
        onSaved={() => {
          load();
        }}
      />
    </div>
  );
}
