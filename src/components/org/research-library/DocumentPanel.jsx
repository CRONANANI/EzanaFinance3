'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Checkbox, Modal, Textarea } from '@/components/ds';
import {
  FILE_ACCEPT,
  KIND_ICON,
  KIND_LABEL,
  MAX_FILE_BYTES,
  NA,
  VISIBILITY_LABEL,
  blockersOf,
  cleanTitle,
  docTypeLabel,
  fmtBytes,
  fmtDate,
  fmtInt,
  fmtStamp,
  isManagerRole,
  kindOfFile,
  noteRights,
  readiness,
  roleLabel,
} from '@/lib/org-research-library-model';
import { Skel } from '@/components/org/command-center/parts';
import { DocumentBody } from './DocumentBody';
import { openDocument } from './export-document';
import { ActionMessage, Mono, StatusText, say } from './parts';

/* Download links from the server last five minutes; refresh them after four. */
const LINK_TTL_MS = 4 * 60 * 1000;

function Tab({ id, tab, onTab, count, children }) {
  return (
    <button
      type="button"
      role="tab"
      id={`orl-tab-${id}`}
      aria-selected={tab === id}
      aria-controls="orl-tabpanel"
      className={`tcc-toggle${tab === id ? ' is-on' : ''}`}
      onClick={() => onTab(id)}
    >
      {children}
      {count != null && <span className="orl-mono orl-tabcount">{count}</span>}
    </button>
  );
}

function Confirm({ confirm, busy, onCancel, onConfirm }) {
  if (!confirm) return null;
  const { title, body, action, danger } = confirm;
  return (
    <Modal
      open
      onClose={busy ? undefined : onCancel}
      title={title}
      size={460}
      className="orl-dialog"
      footer={
        <div className="orl-dfoot__right">
          <button type="button" className="tcc-textbtn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="tcc-flatbtn orl-confirmbtn"
            loading={busy}
            onClick={onConfirm}
          >
            {action}
          </Button>
        </div>
      }
    >
      <p className="orl-prose">{body}</p>
    </Modal>
  );
}

/**
 * One document: what it says, its files, its versions and its review
 * thread, with every lifecycle step the viewer may take. Who sees which
 * control follows the routes (noteRights); the server checks again.
 */
export function DocumentPanel({
  noteId,
  initialTab,
  viewer,
  sample,
  data,
  onClose,
  onEdit,
  onOpenTicker,
  onNotice,
}) {
  const [res, setRes] = useState({ status: 'loading', data: null });
  const [tab, setTab] = useState(initialTab || 'document');
  const [templates, setTemplates] = useState(undefined);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [serverBlockers, setServerBlockers] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [summary, setSummary] = useState({ status: 'idle', text: '' });
  const [comment, setComment] = useState('');
  const [block, setBlock] = useState(false);
  const fileRef = useRef(null);
  const lastAction = useRef(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { loadDetail, loadFiles, countOpen, getTemplates, getMembers, summarize, act } = data;

  const load = useCallback(async () => {
    const next = await loadDetail(noteId);
    if (!alive.current) return;
    setRes((prev) => (next.status === 'ready' || !prev.data ? next : prev));
  }, [loadDetail, noteId]);

  useEffect(() => {
    load();
    countOpen(noteId, 'view');
    getTemplates().then((t) => {
      if (alive.current) setTemplates(t.status === 'ready' ? t.data : null);
    });
    getMembers().then((m) => {
      if (!alive.current || m.status !== 'ready') return;
      setNames(Object.fromEntries((m.data || []).map((x) => [x.user_id, x.display_name])));
    });
  }, [load, countOpen, getTemplates, getMembers, noteId]);

  const d = res.data;
  const note = d?.note || null;
  const rights = noteRights(note, viewer);
  const isManager = isManagerRole(viewer?.role) || Boolean(viewer?.canManage);
  const comments = d?.comments || [];
  const files = d?.attachments || [];
  const versions = d?.versions || [];
  const openBlocks = d?.openBlocks || 0;
  const pre = note && (note.status === 'draft' || note.status === 'under_review');
  const checklist = note ? readiness(note, { openBlocks, templates: templates ?? null }) : [];
  const blocking = blockersOf(checklist);
  const working = Boolean(busy);
  const sampleNote = sample ? ' Sample content: this is not saved.' : '';

  /* Run one action, then reload the document. */
  const run = async (key, action, { success, fallback, after }) => {
    lastAction.current = () => run(key, action, { success, fallback, after });
    setBusy(key);
    setMsg(null);
    const out = await act({ id: noteId, ...action });
    if (!alive.current) return out;
    setBusy(null);
    if (!out.ok) {
      if (out.blockers && out.blockers.length) {
        setServerBlockers(out.blockers);
        setMsg({ tone: 'error', text: 'Publishing is blocked. The reasons are listed above.' });
      } else {
        setMsg({ tone: 'error', text: say(out.error, fallback), retry: true });
      }
      await load();
      return out;
    }
    setServerBlockers(null);
    if (after) {
      after(out);
      return out;
    }
    await load();
    if (alive.current) setMsg({ tone: 'ok', text: `${success}${sampleNote}` });
    return out;
  };

  const doPublish = () =>
    run(
      'publish',
      { type: 'publish' },
      { success: 'Published.', fallback: 'Could not publish. Nothing was changed.' },
    );
  const doStatus = (status) =>
    run(
      status,
      { type: 'status', status },
      {
        success: status === 'under_review' ? 'Submitted for review.' : 'Moved back to draft.',
        fallback: 'Could not change the status. Nothing was changed.',
      },
    );
  const doPin = () =>
    run(
      'pin',
      { type: 'pin', value: !note.pinned },
      {
        success: note.pinned ? 'Unpinned.' : 'Pinned to the top of the library.',
        fallback: 'Could not change the pin.',
      },
    );
  const doExemplar = () =>
    run(
      'exemplar',
      { type: 'exemplar', value: !note.is_exemplar },
      {
        success: note.is_exemplar ? 'No longer an exemplar.' : 'Marked as an exemplar.',
        fallback: 'Could not change the exemplar mark.',
      },
    );

  const askSupersede = () =>
    setConfirm({
      title: 'Supersede this document?',
      body: `"${cleanTitle(note.title)}" will be marked superseded. It stays readable as the council's record, but it can no longer be edited or published again. There is no undo here.`,
      action: 'Supersede',
      run: () =>
        run(
          'supersede',
          { type: 'supersede' },
          {
            success: 'Marked superseded. It stays readable.',
            fallback: 'Could not supersede this document.',
          },
        ),
    });
  const askDelete = () => {
    const archive = rights.deleteLabel === 'Archive';
    setConfirm({
      title: archive ? 'Archive this document?' : 'Delete this document?',
      body: archive
        ? `"${cleanTitle(note.title)}" is published work, so it is archived, not removed. It leaves the library list but stays in the council's records.`
        : `"${cleanTitle(note.title)}", its files, comments and version history will be removed. This cannot be undone.`,
      action: archive ? 'Archive' : 'Delete',
      danger: true,
      run: () =>
        run(
          'delete',
          { type: 'delete' },
          {
            success: '',
            fallback: archive
              ? 'Could not archive this document.'
              : 'Could not delete this document.',
            after: (out) => {
              onNotice({
                tone: 'ok',
                text: `${out.archived || archive ? 'Archived' : 'Deleted'} "${cleanTitle(note.title)}".${sampleNote}`,
              });
              onClose();
            },
          },
        ),
    });
  };
  const askDeleteFile = (f) =>
    setConfirm({
      title: 'Delete this file?',
      body: `${f.file_name} will be removed from the document. This cannot be undone.`,
      action: 'Delete file',
      danger: true,
      run: () =>
        run(
          'deleteFile',
          { type: 'deleteFile', attachmentId: f.id },
          { success: `${f.file_name} was deleted.`, fallback: 'Could not delete the file.' },
        ),
    });

  const doUpload = async (file) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!kindOfFile(file.name)) {
      setMsg({ tone: 'error', text: 'That file type is not accepted.' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMsg({ tone: 'error', text: 'That file is over the 25 MB limit.' });
      return;
    }
    await run(
      'upload',
      { type: 'upload', file: sample ? { name: file.name, size: file.size } : file },
      {
        success: sample ? `${file.name} was listed.` : `${file.name} was uploaded.`,
        fallback: 'Could not upload the file.',
      },
    );
  };

  const doDownload = async (f) => {
    if (sample) {
      setMsg({ tone: 'ok', text: 'Sample content: there is no file behind this row.' });
      return;
    }
    let url = f.signed_url;
    if (!url || Date.now() - (d?.fetchedAt || 0) > LINK_TTL_MS) {
      const fresh = await loadFiles(noteId);
      if (!alive.current) return;
      if (!fresh.ok) {
        setMsg({ tone: 'error', text: 'Could not get a download link.', retry: false });
        return;
      }
      setRes((s) =>
        s.data
          ? {
              ...s,
              data: { ...s.data, attachments: fresh.attachments, fetchedAt: fresh.fetchedAt },
            }
          : s,
      );
      url = fresh.attachments.find((x) => x.id === f.id)?.signed_url || null;
    }
    if (!url) {
      setMsg({ tone: 'error', text: 'This file has no download link right now.' });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const doComment = async () => {
    const body = comment.trim();
    if (!body) return;
    const out = await run(
      'comment',
      { type: 'comment', body, block: isManager && block },
      {
        success: isManager && block ? 'Comment posted as a publish block.' : 'Comment posted.',
        fallback: 'Could not post the comment.',
      },
    );
    if (out?.ok && alive.current) {
      setComment('');
      setBlock(false);
    }
  };

  const doSummary = async () => {
    if (sample) {
      setSummary({
        status: 'error',
        text: 'Sample content: summaries are only written for council documents.',
      });
      return;
    }
    setSummary({ status: 'loading', text: '' });
    const out = await summarize({ noteId });
    if (!alive.current) return;
    setSummary(
      out.ok
        ? { status: 'ready', text: out.summary }
        : { status: 'error', text: 'The assistant could not write a summary.', retry: true },
    );
  };

  const doOpen = (print) => {
    const ok = openDocument(note, { print });
    if (!ok) {
      setMsg({
        tone: 'error',
        text: 'Your browser blocked the new window. Allow pop-ups and try again.',
      });
      return;
    }
    if (print) countOpen(noteId, 'download');
  };

  /* Footer: the one main step is filled; everything else is text. */
  let primary = null;
  if (note) {
    if (rights.canPublish) primary = { key: 'publish', label: 'Publish', onClick: doPublish };
    else if (rights.canSubmit)
      primary = {
        key: 'under_review',
        label: 'Submit for review',
        onClick: () => doStatus('under_review'),
      };
  }
  const publishBlocked = primary?.key === 'publish' && blocking.length > 0;

  const title = note ? cleanTitle(note.title) : 'Document';
  const uploader = (uid) => names[uid] || (uid === viewer?.userId ? viewer?.displayName : null);

  return (
    <>
      <Modal
        open
        onClose={working || confirm ? undefined : onClose}
        title={title}
        size={880}
        className="orl-dialog orl-panel"
        footer={
          note ? (
            <div className="orl-dfoot">
              <div className="orl-dfoot__left">
                <button type="button" className="tcc-textbtn" onClick={() => doOpen(false)}>
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  Open
                </button>
                <button type="button" className="tcc-textbtn" onClick={() => doOpen(true)}>
                  <i className="bi bi-download" aria-hidden="true" />
                  Export PDF
                </button>
                {rights.canDelete && (
                  <button
                    type="button"
                    className="tcc-textbtn orl-danger"
                    onClick={askDelete}
                    disabled={working}
                  >
                    <i className="bi bi-trash3" aria-hidden="true" />
                    {rights.deleteLabel}
                  </button>
                )}
              </div>
              <div className="orl-dfoot__right">
                {rights.canPin && (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={doPin}
                    disabled={working}
                    aria-pressed={Boolean(note.pinned)}
                  >
                    <i
                      className={`bi ${note.pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}`}
                      aria-hidden="true"
                    />
                    {note.pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {rights.canExemplar && (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={doExemplar}
                    disabled={working}
                    aria-pressed={Boolean(note.is_exemplar)}
                  >
                    <i className="bi bi-award" aria-hidden="true" />
                    {note.is_exemplar ? 'Unmark exemplar' : 'Mark exemplar'}
                  </button>
                )}
                {rights.canSupersede && (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={askSupersede}
                    disabled={working}
                  >
                    <i className="bi bi-arrow-repeat" aria-hidden="true" />
                    Supersede
                  </button>
                )}
                {rights.canEdit && (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={() => onEdit(note)}
                    disabled={working}
                  >
                    <i className="bi bi-pencil" aria-hidden="true" />
                    Edit
                  </button>
                )}
                {rights.canBackToDraft && (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={() => doStatus('draft')}
                    disabled={working}
                  >
                    Back to draft
                  </button>
                )}
                {rights.canSubmit && primary?.key !== 'under_review' && (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={() => doStatus('under_review')}
                    disabled={working}
                  >
                    Submit for review
                  </button>
                )}
                {primary ? (
                  <Button
                    variant="primary"
                    className="tcc-flatbtn"
                    icon={primary.key === 'publish' ? 'bi-upload' : undefined}
                    loading={busy === primary.key}
                    disabled={working || publishBlocked}
                    onClick={primary.onClick}
                    title={
                      publishBlocked ? 'Clear the blockers listed above to publish' : undefined
                    }
                  >
                    {primary.label}
                  </Button>
                ) : (
                  <button
                    type="button"
                    className="tcc-textbtn"
                    onClick={onClose}
                    disabled={working}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" className="tcc-textbtn" onClick={onClose}>
              Close
            </button>
          )
        }
      >
        {res.status === 'loading' ? (
          <div className="orl-dskel" aria-busy="true" aria-label="Loading the document">
            <Skel w="40%" h={12} />
            <Skel w="100%" h={12} />
            <Skel w="92%" h={12} />
            <Skel w="70%" h={12} />
          </div>
        ) : !note ? (
          <p className="tcc-state tcc-state--error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>
              {res.status === 'missing'
                ? 'This document is not available to you, or it no longer exists.'
                : 'This document could not be loaded.'}
            </span>
            {res.status !== 'missing' && (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => {
                  setRes({ status: 'loading', data: null });
                  load();
                }}
              >
                Retry
              </button>
            )}
          </p>
        ) : (
          <div className="orl-detail">
            <div className={`orl-dhead${pre ? ' has-ready' : ''}`}>
              <ul className="orl-dmeta">
                {note.ticker ? (
                  <li>
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent orl-mono"
                      onClick={() => onOpenTicker(note.ticker)}
                      title={`Open the ${note.ticker} dossier`}
                    >
                      {note.ticker}
                    </button>
                  </li>
                ) : null}
                <li>{docTypeLabel(note.doc_type)}</li>
                <li>
                  <Mono>v{note.version || 1}</Mono>
                </li>
                <li>
                  <StatusText status={note.status} />
                </li>
                {note.is_exemplar && (
                  <li className="orl-gold">
                    <i className="bi bi-award" aria-hidden="true" />
                    Exemplar
                  </li>
                )}
                {note.pinned && (
                  <li className="orl-gold">
                    <i className="bi bi-pin-angle-fill" aria-hidden="true" />
                    Pinned
                  </li>
                )}
                {sample && <li className="orl-muted">Sample content</li>}
              </ul>
              {pre && (
                <>
                  <span className="orl-colrule" aria-hidden="true" />
                  <div className="orl-ready" aria-label="Publish readiness">
                    <p className={`orl-ready__title${blocking.length ? ' orl-warn' : ''}`}>
                      <i
                        className={`bi ${blocking.length ? 'bi-exclamation-triangle' : 'bi-check2-circle'}`}
                        aria-hidden="true"
                      />
                      {blocking.length
                        ? `Publish blockers (${blocking.length})`
                        : 'Ready to publish'}
                    </p>
                    <ul className="orl-ready__list">
                      {checklist.map((i) => (
                        <li
                          key={i.code}
                          className={i.ok === false ? 'is-bad' : i.ok ? 'is-ok' : 'is-unknown'}
                        >
                          <i
                            className={`bi ${i.ok === false ? 'bi-x-circle' : i.ok ? 'bi-check2' : 'bi-question-circle'}`}
                            aria-hidden="true"
                          />
                          {i.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {note.status === 'superseded' && (
              <p className="orl-note">
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                Superseded
                {d.supersededBy ? ` by "${cleanTitle(d.supersededBy.title)}"` : ''}. It stays
                readable as the council&apos;s record.
              </p>
            )}
            {note.status === 'archived' && (
              <p className="orl-note">
                <i className="bi bi-archive" aria-hidden="true" />
                Archived. It is kept in the council&apos;s records and no longer listed by default.
              </p>
            )}
            {serverBlockers && serverBlockers.length > 0 && (
              <div className="orl-note orl-note--warn" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <div>
                  <p className="orl-note__title">Publishing was refused:</p>
                  <ul>
                    {serverBlockers.map((b) => (
                      <li key={b.code}>{b.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="tcc-toggles orl-dtabs" role="tablist" aria-label="Document sections">
              <Tab id="document" tab={tab} onTab={setTab}>
                Document
              </Tab>
              <Tab id="files" tab={tab} onTab={setTab} count={files.length}>
                Files
              </Tab>
              <Tab id="versions" tab={tab} onTab={setTab} count={versions.length + 1}>
                Versions
              </Tab>
              <Tab id="review" tab={tab} onTab={setTab} count={comments.length}>
                Review
              </Tab>
            </div>

            <div
              id="orl-tabpanel"
              role="tabpanel"
              aria-labelledby={`orl-tab-${tab}`}
              className="orl-tabpanel"
            >
              {tab === 'document' && (
                <div className="orl-cols">
                  <div className="orl-col">
                    <h3 className="orl-h3">Abstract</h3>
                    {note.abstract ? (
                      <p className="orl-prose">{note.abstract}</p>
                    ) : (
                      <p className="orl-muted orl-small">
                        No abstract yet. One is required to publish.
                      </p>
                    )}
                    <div className="orl-ai">
                      {summary.status === 'idle' && (
                        <button
                          type="button"
                          className="tcc-textbtn tcc-textbtn--accent"
                          onClick={doSummary}
                        >
                          <i className="bi bi-stars" aria-hidden="true" />
                          Summarize with Ezana&apos;s assistant
                        </button>
                      )}
                      {summary.status === 'loading' && (
                        <p className="tcc-state" role="status">
                          <i className="bi bi-arrow-repeat orl-spin" aria-hidden="true" />
                          <span>Writing a summary</span>
                        </p>
                      )}
                      {summary.status === 'error' && (
                        <p className="tcc-state tcc-state--error" role="alert">
                          <i className="bi bi-exclamation-circle" aria-hidden="true" />
                          <span>{summary.text}</span>
                          {summary.retry ? (
                            <button
                              type="button"
                              className="tcc-textbtn tcc-textbtn--accent"
                              onClick={doSummary}
                            >
                              Retry
                            </button>
                          ) : null}
                        </p>
                      )}
                      {summary.status === 'ready' && (
                        <div className="orl-aibox">
                          <p className="orl-aibox__head">
                            <span>
                              <i className="bi bi-stars" aria-hidden="true" /> Summary by
                              Ezana&apos;s assistant, written on request and not saved
                            </span>
                          </p>
                          <DocumentBody text={summary.text} />
                        </div>
                      )}
                    </div>
                    <h3 className="orl-h3">Document</h3>
                    <DocumentBody text={note.body} />
                    <h3 className="orl-h3">Sources</h3>
                    {note.citations ? (
                      <p className="orl-prose">{note.citations}</p>
                    ) : (
                      <p className="orl-muted orl-small">{NA}</p>
                    )}
                  </div>
                  <span className="orl-colrule" aria-hidden="true" />
                  <dl className="orl-facts">
                    <div>
                      <dt>Author</dt>
                      <dd>
                        {note.author_name || NA}
                        {note.author_role ? (
                          <span className="orl-muted">
                            {' '}
                            ({roleLabel(note.author_role)} when written)
                          </span>
                        ) : null}
                        {note.is_alum_authored ? <span className="orl-muted"> Alum</span> : null}
                      </dd>
                    </div>
                    <div>
                      <dt>Published</dt>
                      <dd>
                        <Mono>{note.published_at ? fmtDate(note.published_at) : NA}</Mono>
                      </dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>
                        <Mono>{fmtDate(note.updated_at || note.created_at)}</Mono>
                      </dd>
                    </div>
                    <div>
                      <dt>Sector</dt>
                      <dd>{note.sector || NA}</dd>
                    </div>
                    <div>
                      <dt>Term</dt>
                      <dd>
                        <Mono>{note.term || NA}</Mono>
                      </dd>
                    </div>
                    <div>
                      <dt>Visibility</dt>
                      <dd>
                        {VISIBILITY_LABEL[note.visibility] || NA}
                        {note.visibility === 'team' && (
                          <span className="orl-muted orl-small orl-block">
                            Your team, executives and portfolio managers can read it.
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Tags</dt>
                      <dd>{(note.tags || []).length ? note.tags.join(', ') : NA}</dd>
                    </div>
                    <div>
                      <dt>Views</dt>
                      <dd>
                        <Mono>{fmtInt(note.view_count || 0)}</Mono>
                        <span className="orl-muted orl-small"> opens by others</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Downloads</dt>
                      <dd>
                        <Mono>{fmtInt(note.download_count || 0)}</Mono>
                        <span className="orl-muted orl-small"> PDF exports</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Linked pitch</dt>
                      <dd>
                        {note.pitch_id ? (
                          sample ? (
                            <Link href="/org-team-hub/pitches" className="tcc-link">
                              Pitch Pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
                            </Link>
                          ) : (
                            <Link
                              href={`/org-team-hub/pitches?pitch=${encodeURIComponent(note.pitch_id)}`}
                              className="tcc-link"
                            >
                              View pitch <i className="bi bi-arrow-right" aria-hidden="true" />
                            </Link>
                          )
                        ) : (
                          NA
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {tab === 'files' && (
                <div>
                  {d.filesFailed ? (
                    <p className="tcc-state tcc-state--error" role="alert">
                      <i className="bi bi-exclamation-circle" aria-hidden="true" />
                      <span>Files could not be loaded.</span>
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={load}
                      >
                        Retry
                      </button>
                    </p>
                  ) : files.length === 0 ? (
                    <p className="tcc-state">
                      <span>No files attached.</span>
                    </p>
                  ) : (
                    <div className="orl-table" role="table" aria-label="Files">
                      <div className="orl-row orl-row--files orl-row--head" role="row">
                        <span role="columnheader">Name</span>
                        <span role="columnheader">Uploader</span>
                        <span role="columnheader">Kind</span>
                        <span role="columnheader" className="orl-num">
                          Size
                        </span>
                        <span role="columnheader">Uploaded</span>
                        <span role="columnheader" className="orl-num">
                          <span className="tcc-sr">Actions</span>
                        </span>
                      </div>
                      {files.map((f) => {
                        const canDelete = isManager || f.uploaded_by === viewer?.userId;
                        return (
                          <div key={f.id} className="orl-row orl-row--files" role="row">
                            <span role="cell" className="orl-filename" title={f.file_name}>
                              <i
                                className={`bi ${KIND_ICON[f.kind] || 'bi-file-earmark'}`}
                                aria-hidden="true"
                              />
                              <span className="orl-clip">{f.file_name}</span>
                            </span>
                            <span role="cell" className="orl-clip">
                              {uploader(f.uploaded_by) || NA}
                            </span>
                            <span role="cell">{KIND_LABEL[f.kind] || NA}</span>
                            <span role="cell" className="orl-num">
                              <Mono>{fmtBytes(f.size_bytes)}</Mono>
                            </span>
                            <span role="cell">
                              <Mono>{fmtDate(f.created_at)}</Mono>
                            </span>
                            <span role="cell" className="orl-num orl-fileacts">
                              <button
                                type="button"
                                className="tcc-textbtn tcc-textbtn--accent"
                                onClick={() => doDownload(f)}
                                aria-label={`Download ${f.file_name}`}
                              >
                                <i className="bi bi-download" aria-hidden="true" />
                                Download
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  className="tcc-textbtn orl-danger"
                                  onClick={() => askDeleteFile(f)}
                                  disabled={working}
                                  aria-label={`Delete ${f.file_name}`}
                                >
                                  Delete
                                </button>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {rights.canAttach && (
                    <p className="orl-attach">
                      <input
                        ref={fileRef}
                        type="file"
                        className="tcc-sr"
                        aria-label="Choose a file to attach"
                        accept={FILE_ACCEPT}
                        tabIndex={-1}
                        onChange={(e) => doUpload(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={() => fileRef.current?.click()}
                        disabled={working}
                      >
                        <i className="bi bi-paperclip" aria-hidden="true" />
                        {busy === 'upload' ? 'Uploading' : 'Attach file'}
                      </button>
                      <span className="orl-muted orl-small">
                        PDF, Word, Excel, CSV, PowerPoint, PNG or JPG, up to <Mono>25 MB</Mono>. One
                        at a time.
                      </span>
                    </p>
                  )}
                </div>
              )}

              {tab === 'versions' && (
                <div>
                  <ul className="orl-versions">
                    <li>
                      <Mono className="orl-vnum">v{note.version || 1}</Mono>
                      <span className="orl-clip">{cleanTitle(note.title)}</span>
                      <span className="orl-muted">Current</span>
                      <Mono>{fmtDate(note.updated_at || note.created_at)}</Mono>
                    </li>
                    {versions.map((v) => (
                      <li key={v.id}>
                        <Mono className="orl-vnum">v{v.version}</Mono>
                        <span className="orl-clip">{cleanTitle(v.title)}</span>
                        <span className="orl-clip orl-muted">{v.editor_name || NA}</span>
                        <Mono>{fmtDate(v.created_at)}</Mono>
                      </li>
                    ))}
                  </ul>
                  {d.versionsFailed ? (
                    <p className="tcc-state tcc-state--error" role="alert">
                      <i className="bi bi-exclamation-circle" aria-hidden="true" />
                      <span>Earlier versions could not be loaded.</span>
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={load}
                      >
                        Retry
                      </button>
                    </p>
                  ) : (
                    <p className="orl-foot">
                      {versions.length
                        ? 'Each edit stores the earlier title, abstract and body. Earlier text cannot be opened here yet.'
                        : 'No earlier versions. This is the original.'}
                    </p>
                  )}
                </div>
              )}

              {tab === 'review' && (
                <div>
                  {d.commentsFailed ? (
                    <p className="tcc-state tcc-state--error" role="alert">
                      <i className="bi bi-exclamation-circle" aria-hidden="true" />
                      <span>The review thread could not be loaded.</span>
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={load}
                      >
                        Retry
                      </button>
                    </p>
                  ) : comments.length === 0 ? (
                    <p className="tcc-state">
                      <span>No comments yet.</span>
                    </p>
                  ) : (
                    <ul className="orl-thread">
                      {comments.map((c) => {
                        const canResolve = isManager || c.author_id === viewer?.userId;
                        return (
                          <li key={c.id}>
                            <i className="bi bi-chat-left orl-thread__icon" aria-hidden="true" />
                            <div className="orl-thread__main">
                              <p className="orl-thread__head">
                                <span className="orl-thread__who">{c.author_name || NA}</span>
                                <Mono className="orl-muted orl-small">
                                  {fmtStamp(c.created_at)}
                                </Mono>
                              </p>
                              <p className="orl-prose">{c.body}</p>
                            </div>
                            <div className="orl-thread__side">
                              {c.is_review_block && !c.resolved && (
                                <span className="orl-warn orl-small">
                                  <i className="bi bi-exclamation-octagon" aria-hidden="true" />
                                  Open block
                                </span>
                              )}
                              {c.resolved && (
                                <span className="orl-pos orl-small">
                                  <i className="bi bi-check2" aria-hidden="true" />
                                  {c.is_review_block ? 'Block resolved' : 'Resolved'}
                                </span>
                              )}
                              {canResolve && (
                                <button
                                  type="button"
                                  className="tcc-textbtn tcc-textbtn--accent orl-small"
                                  disabled={working}
                                  onClick={() =>
                                    run(
                                      `resolve-${c.id}`,
                                      { type: 'resolve', commentId: c.id, resolved: !c.resolved },
                                      {
                                        success: c.resolved
                                          ? 'Comment reopened.'
                                          : 'Comment resolved.',
                                        fallback: 'Could not change the comment.',
                                      },
                                    )
                                  }
                                >
                                  {c.resolved ? 'Reopen' : 'Resolve'}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="orl-commentbox">
                    <Textarea
                      id="orl-comment"
                      label="Add a comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={4000}
                      placeholder="Comments are visible to everyone who can read this document"
                    />
                    <div className="orl-commentbox__row">
                      {isManager ? (
                        <Checkbox
                          label="Blocks publish until resolved"
                          checked={block}
                          onChange={(e) => setBlock(e.target.checked)}
                        />
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={doComment}
                        disabled={working || !comment.trim()}
                      >
                        {busy === 'comment' ? 'Posting' : 'Post comment'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ActionMessage
              msg={msg}
              onRetry={() => lastAction.current?.()}
              onDismiss={() => setMsg(null)}
            />
          </div>
        )}
      </Modal>
      <Confirm
        confirm={confirm}
        busy={working}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const c = confirm;
          await c.run();
          if (alive.current) setConfirm(null);
        }}
      />
    </>
  );
}
