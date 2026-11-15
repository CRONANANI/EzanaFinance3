'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ds';
import { stripDemoLabel } from '@/lib/org-display';
import {
  NA,
  STATUS_ICON,
  STATUS_LABEL,
  assigneeSummary,
  fmtBytes,
  fmtDayYear,
  fmtStamp,
  gradeText,
} from '@/lib/org-assignments-model';
import { Skel } from '@/components/org/command-center/parts';
import { TypeMark } from './AssignmentList';

const FILE_TYPES = '.pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg,.pptx';
const digits = (v) => String(v).replace(/[^0-9]/g, '');

/* Server messages for the cases a member can cause, in plain words. Anything
   else gets the fallback, so no internal text reaches the page. */
function say(error, fallback) {
  const e = String(error || '');
  if (/comment is required/i.test(e)) return 'Write feedback before returning this work.';
  if (/25 MB/i.test(e)) return 'That file is over the 25 MB limit.';
  if (/empty/i.test(e)) return 'That file is empty.';
  if (/type|multipart/i.test(e) && /file|allowed|supported/i.test(e)) {
    return 'That file type is not accepted.';
  }
  if (/Cannot move/i.test(e)) {
    return 'This work has moved on since the page loaded. The latest state is shown.';
  }
  if (/Manager|Not allowed|Only the/i.test(e)) return 'Your role cannot take this step.';
  if (/connect/i.test(e)) return 'Could not connect. Nothing was changed.';
  return fallback;
}

function Tab({ id, tab, onTab, count, children }) {
  return (
    <button
      type="button"
      role="tab"
      id={`oas-tab-${id}`}
      aria-selected={tab === id}
      aria-controls="oas-tabpanel"
      className={`tcc-toggle${tab === id ? ' is-on' : ''}`}
      onClick={() => onTab(id)}
    >
      {children}
      {count != null && <span className="tcc-mono oas-tabcount">{count}</span>}
    </button>
  );
}

/**
 * One assignment: the brief, who it was given to, files, comments, the
 * submission history and, for managers, the grade. The footer holds the one
 * next step on the status path as the filled button; every other step is
 * plain text. Returning work always needs written feedback, which has its
 * own field and is sent with the return.
 */
export function AssignmentDetail({ id, initialTab, row, refs, sample, loadDetail, act, onClose }) {
  const [res, setRes] = useState({ status: 'loading', data: null });
  const [tab, setTab] = useState(initialTab || 'overview');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState({ score: '', max: '', comment: '' });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [fieldError, setFieldError] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);
  const seeded = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const next = await loadDetail(id);
    if (!alive.current) return;
    setRes((prev) => (next.status === 'ready' || !prev.data ? next : prev));
    const a = next.data?.assignment;
    if (a && !seeded.current) {
      seeded.current = true;
      setGrade({
        score: a.rubric_score ?? '',
        max: a.rubric_max ?? '',
        comment: a.rubric_comment ?? '',
      });
    }
  }, [id, loadDetail]);

  useEffect(() => {
    load();
  }, [load]);

  const d = res.data;
  const a = d ? { ...(row || {}), ...d.assignment } : null;
  const canReview = Boolean(d?.viewer?.canReview);
  const isAssignee = Boolean(d?.viewer?.isAssignee || row?.mine);
  const files = d?.attachments || [];
  const comments = d?.comments || [];
  const subs = d?.submissions || [];
  const status = a?.status;
  const canSubmit = isAssignee && ['in_progress', 'returned'].includes(status);
  const reviewing = canReview && ['submitted', 'under_review'].includes(status);
  const canGrade = canReview && ['submitted', 'under_review', 'complete'].includes(status);
  const showGradeTab = canReview;
  const activeTab = tab === 'grade' && !showGradeTab ? 'overview' : tab;

  const run = async (key, action, { success, fallback }) => {
    setBusy(key);
    setError(null);
    setDone(null);
    const out = await act({ id, ...action });
    if (!alive.current) return false;
    if (!out.ok) {
      setError(say(out.error, fallback));
      await load();
      if (alive.current) setBusy(null);
      return false;
    }
    await load();
    if (!alive.current) return true;
    setBusy(null);
    setDone(sample ? `${success} Sample content: this is not saved.` : success);
    return true;
  };

  const doReturn = async () => {
    const text = feedback.trim();
    if (!text) {
      setTab('grade');
      setFieldError({ feedback: 'Write feedback before returning this work.' });
      requestAnimationFrame(() => document.getElementById('oas-feedback')?.focus());
      return;
    }
    const ok = await run(
      'return',
      { type: 'return', comment: text },
      {
        success: 'Returned for revision with your feedback.',
        fallback: 'Could not return this work. Nothing was changed.',
      },
    );
    if (ok) {
      setFeedback('');
      setFieldError({});
    }
  };

  const doGrade = async () => {
    const s = grade.score === '' ? null : Number(grade.score);
    const m = grade.max === '' ? null : Number(grade.max);
    if (s == null || m == null) {
      setTab('grade');
      setFieldError({ grade: 'Enter a score and the maximum.' });
      return;
    }
    if (s > m) {
      setTab('grade');
      setFieldError({ grade: 'The score cannot be above the maximum.' });
      return;
    }
    setFieldError({});
    await run(
      'grade',
      { type: 'grade', score: grade.score, max: grade.max, comment: grade.comment.trim() },
      { success: 'Grade saved.', fallback: 'Could not save the grade. Nothing was changed.' },
    );
  };

  const doSubmit = async () => {
    const ok = await run(
      'submit',
      { type: 'submit', note: note.trim() || null },
      {
        success: 'Submitted. A new version is on file.',
        fallback: 'Could not submit. Nothing was changed.',
      },
    );
    if (ok) setNote('');
  };

  const doComment = async () => {
    const body = comment.trim();
    if (!body) return;
    const ok = await run(
      'comment',
      { type: 'comment', body },
      { success: 'Comment posted.', fallback: 'Could not post the comment.' },
    );
    if (ok) setComment('');
  };

  const doUpload = async (file) => {
    if (!file) return;
    await run(
      'upload',
      { type: 'upload', file },
      {
        success: sample ? `${file.name} was listed.` : `${file.name} was uploaded.`,
        fallback: 'Could not upload the file.',
      },
    );
    if (fileRef.current) fileRef.current.value = '';
    if (alive.current) setTab('files');
  };

  const doDelete = async (f) => {
    setConfirmDelete(null);
    await run(
      'delete',
      { type: 'deleteFile', attachmentId: f.id },
      { success: `${f.file_name} was deleted.`, fallback: 'Could not delete the file.' },
    );
  };

  /* Footer: the one next step is filled; everything else is text. */
  let primary = null;
  const others = [];
  const working = Boolean(busy);
  if (a) {
    if (isAssignee && status === 'assigned') {
      primary = {
        key: 'start',
        label: 'Start',
        onClick: () =>
          run(
            'start',
            { type: 'start' },
            { success: 'Marked in progress.', fallback: 'Could not start. Nothing was changed.' },
          ),
      };
    } else if (canSubmit) {
      primary = {
        key: 'submit',
        label: status === 'returned' ? 'Resubmit' : 'Submit',
        onClick: doSubmit,
      };
    } else if (canReview && status === 'submitted') {
      primary = {
        key: 'review',
        label: 'Start review',
        onClick: () =>
          run(
            'review',
            { type: 'review' },
            { success: 'Marked under review.', fallback: 'Could not start the review.' },
          ),
      };
      others.push({ key: 'approve', label: 'Approve' }, { key: 'grade', label: 'Save grade' });
    } else if (canReview && status === 'under_review') {
      primary = { key: 'approve', label: 'Approve' };
      others.push({ key: 'grade', label: 'Save grade' });
    } else if (canReview && status === 'complete') {
      primary = { key: 'grade', label: 'Save grade' };
    }
  }
  const handler = (key) =>
    key === 'grade'
      ? doGrade
      : key === 'approve'
        ? () =>
            run(
              'approve',
              { type: 'approve' },
              {
                success: 'Approved and marked complete.',
                fallback: 'Could not approve this work.',
              },
            )
        : undefined;

  const who = a ? assigneeSummary(a, refs) : null;
  const names = (a?.assignees || []).map((p) => p.name);
  const lastReturn = [...comments].reverse().find((c) => c.is_return);
  const score = a ? gradeText(a) : null;
  const title = a ? stripDemoLabel(a.title) || 'Assignment' : 'Assignment';

  return (
    <Modal
      open
      onClose={working ? undefined : onClose}
      title={title}
      size={760}
      className="oas-dialog"
      footer={
        a ? (
          <div className="oas-dfoot">
            <div className="oas-dfoot__left">
              <input
                ref={fileRef}
                type="file"
                className="tcc-sr"
                aria-label="Choose a file to upload"
                accept={FILE_TYPES}
                tabIndex={-1}
                onChange={(e) => doUpload(e.target.files?.[0])}
              />
              <button
                type="button"
                className="tcc-textbtn"
                disabled={working}
                onClick={() => fileRef.current?.click()}
              >
                <i className="bi bi-upload" aria-hidden="true" />
                {busy === 'upload' ? 'Uploading' : 'Upload file'}
              </button>
            </div>
            <div className="oas-dfoot__right">
              {!primary && (
                <button type="button" className="tcc-textbtn" onClick={onClose} disabled={working}>
                  Close
                </button>
              )}
              {reviewing && (
                <button
                  type="button"
                  className="tcc-textbtn oas-danger"
                  onClick={doReturn}
                  disabled={working}
                >
                  Return
                </button>
              )}
              {others.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className="tcc-textbtn"
                  onClick={handler(o.key)}
                  disabled={working}
                >
                  {o.label}
                </button>
              ))}
              {primary && (
                <Button
                  variant="primary"
                  className="tcc-flatbtn"
                  loading={busy === primary.key}
                  disabled={working}
                  onClick={primary.onClick || handler(primary.key)}
                >
                  {primary.label}
                </Button>
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
        <div className="oas-dskel" aria-busy="true" aria-label="Loading assignment">
          <Skel w="60%" h={12} />
          <Skel w="100%" h={12} />
          <Skel w="90%" h={12} />
          <Skel w="40%" h={12} />
        </div>
      ) : !a ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>
            {res.status === 'missing'
              ? 'This assignment is not available to you, or it no longer exists.'
              : 'This assignment could not be loaded.'}
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
        <div className="oas-detail">
          <ul className="oas-dmeta">
            <li>
              <TypeMark a={a} />
            </li>
            <li className={`oas-status oas-status--${status}`}>
              <i className={`bi ${STATUS_ICON[status] || 'bi-circle'}`} aria-hidden="true" />
              {STATUS_LABEL[status] || status}
            </li>
            {a.overdue && (
              <li className="oas-overdue__word">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                Overdue
              </li>
            )}
            <li>
              <i className="bi bi-calendar3" aria-hidden="true" />
              {a.due_date ? (
                <>
                  Due <span className="tcc-mono">{fmtDayYear(a.due_date)}</span>
                </>
              ) : (
                'No due date'
              )}
            </li>
            <li title={who.full}>
              <i className={`bi ${who.group ? 'bi-people' : 'bi-person'}`} aria-hidden="true" />
              <span className="tcc-mono">{names.length}</span>{' '}
              {names.length === 1 ? 'assignee' : 'assignees'}
            </li>
            {a.recurring && (
              <li title="A label saved with the work. Nothing repeats automatically.">
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                Recurring, {a.recurring}
              </li>
            )}
            {a.require_upload && (
              <li title="A label saved with the work. It is not checked when work is submitted.">
                <i className="bi bi-upload" aria-hidden="true" />
                File upload requested
              </li>
            )}
            {sample && <li className="tcc-na">Sample content</li>}
          </ul>

          <div className="tcc-toggles oas-dtabs" role="tablist" aria-label="Assignment sections">
            <Tab id="overview" tab={activeTab} onTab={setTab}>
              Overview
            </Tab>
            <Tab id="files" tab={activeTab} onTab={setTab} count={files.length}>
              Files
            </Tab>
            <Tab id="comments" tab={activeTab} onTab={setTab} count={comments.length}>
              Comments
            </Tab>
            <Tab id="history" tab={activeTab} onTab={setTab} count={subs.length}>
              History
            </Tab>
            {showGradeTab && (
              <Tab id="grade" tab={activeTab} onTab={setTab}>
                Review and grade
              </Tab>
            )}
          </div>

          <div
            id="oas-tabpanel"
            role="tabpanel"
            aria-labelledby={`oas-tab-${activeTab}`}
            className="oas-panel"
          >
            {activeTab === 'overview' && (
              <div className="oas-cols">
                <div className="oas-col">
                  <h3 className="oas-h3">Instructions</h3>
                  {a.instructions ? (
                    <p className="oas-prose">{a.instructions}</p>
                  ) : (
                    <p className="oas-foot">No instructions were written for this work.</p>
                  )}
                  {(a.ticker || a.sector) && (
                    <>
                      <h3 className="oas-h3">Subject</h3>
                      <p className="oas-line">
                        {a.ticker && <span className="tcc-mono oas-ticker">{a.ticker}</span>}
                        {a.sector && <span>{a.sector}</span>}
                      </p>
                    </>
                  )}
                  <h3 className="oas-h3">Assigned to</h3>
                  {(a.assignee_targets || []).some((t) => t.target_type !== 'member') && (
                    <p className="oas-line">{who.full}</p>
                  )}
                  {names.length > 0 && (
                    <ul className="oas-people">
                      {names.map((n, i) => (
                        <li key={`${n}-${i}`}>
                          <i className="bi bi-person" aria-hidden="true" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="oas-foot">
                    Everyone listed can start and submit this work.
                    {a.assigner_name ? ` Assigned by ${a.assigner_name}.` : ''}
                  </p>
                </div>
                <span className="oas-colrule" aria-hidden="true" />
                <div className="oas-col">
                  <h3 className="oas-h3">Delivery</h3>
                  <p className="oas-line">
                    <span>
                      <span className="tcc-mono">{subs.length}</span>{' '}
                      {subs.length === 1 ? 'submission' : 'submissions'}
                    </span>
                    <span>
                      <span className="tcc-mono">{names.length}</span>{' '}
                      {names.length === 1 ? 'assignee' : 'assignees'}
                    </span>
                  </p>
                  {Number(a.progress_pct) > 0 && (
                    <p className="oas-line">
                      Progress <span className="tcc-mono">{Math.round(a.progress_pct)}%</span>
                    </p>
                  )}
                  {names.length > 1 && (
                    <p className="oas-foot">
                      One status, one history and one grade are shared by everyone assigned.
                      Delivery is not tracked per person.
                    </p>
                  )}
                  <h3 className="oas-h3">Grade</h3>
                  {score ? (
                    <>
                      <p className="oas-line">
                        <span className="oas-grade tcc-mono">{score}</span>
                      </p>
                      {a.rubric_comment && <p className="oas-prose">{a.rubric_comment}</p>}
                    </>
                  ) : (
                    <p className="oas-line tcc-na">{NA}</p>
                  )}
                  {status === 'returned' && lastReturn && (
                    <>
                      <h3 className="oas-h3">
                        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Return
                        feedback
                      </h3>
                      <p className="oas-prose">{lastReturn.body}</p>
                      <p className="oas-foot">
                        {lastReturn.author_name},{' '}
                        <span className="tcc-mono">{fmtStamp(lastReturn.created_at)}</span>
                      </p>
                    </>
                  )}
                  {canSubmit && (
                    <Textarea
                      id="oas-note"
                      label="Submission note (optional)"
                      rows={2}
                      maxLength={2000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      hint={
                        a.require_upload
                          ? 'A file was requested with this work. Upload it before you submit.'
                          : 'Each submission is kept as a new version.'
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <>
                {d.filesFailed && (
                  <p className="oas-foot">
                    Download links could not be loaded. Close and reopen this assignment to try
                    again.
                  </p>
                )}
                {files.length === 0 ? (
                  <p className="tcc-state">
                    <span>No files yet.</span>
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => fileRef.current?.click()}
                      disabled={working}
                    >
                      Upload file
                    </button>
                  </p>
                ) : (
                  <ul className="oas-files">
                    {files.map((f) => {
                      const mayDelete =
                        d.fileViewer?.canManage || f.uploaded_by === d.fileViewer?.userId;
                      return (
                        <li key={f.id}>
                          <i className="bi bi-file-earmark-text" aria-hidden="true" />
                          <span className="oas-files__name oas-clip" title={f.file_name}>
                            {f.file_name}
                          </span>
                          <span className="tcc-mono oas-files__meta">{fmtBytes(f.size_bytes)}</span>
                          <span className="oas-files__meta oas-files__who">
                            {f.uploader_name ? `${f.uploader_name}, ` : ''}
                            <span className="tcc-mono">{fmtStamp(f.created_at)}</span>
                          </span>
                          {confirmDelete === f.id ? (
                            <span className="oas-confirm" role="group" aria-label="Confirm delete">
                              <span>Delete this file?</span>
                              <button
                                type="button"
                                className="tcc-textbtn oas-danger"
                                onClick={() => doDelete(f)}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                className="tcc-textbtn"
                                onClick={() => setConfirmDelete(null)}
                              >
                                Keep
                              </button>
                            </span>
                          ) : (
                            <span className="oas-files__acts">
                              {f.signed_url ? (
                                <a
                                  className="tcc-link"
                                  href={f.signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={f.file_name}
                                  aria-label={`Download ${f.file_name}`}
                                >
                                  <i className="bi bi-download" aria-hidden="true" />
                                  Download
                                </a>
                              ) : (
                                <span className="tcc-na">
                                  {sample ? 'Sample file' : 'No download link'}
                                </span>
                              )}
                              {mayDelete && (
                                <button
                                  type="button"
                                  className="tcc-textbtn oas-danger"
                                  disabled={working}
                                  onClick={() => setConfirmDelete(f.id)}
                                  aria-label={`Delete ${f.file_name}`}
                                >
                                  Delete
                                </button>
                              )}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="oas-foot">
                  PDF, Word, Excel, PowerPoint, CSV, PNG or JPG, up to{' '}
                  <span className="tcc-mono">25</span> MB each.
                  {a.require_upload
                    ? ' A file was requested with this work; this is not checked on submission.'
                    : ''}
                </p>
              </>
            )}

            {activeTab === 'comments' && (
              <>
                {comments.length === 0 ? (
                  <p className="oas-foot">No comments yet.</p>
                ) : (
                  <ul className="oas-thread">
                    {comments.map((c) => (
                      <li key={c.id}>
                        <p className="oas-thread__head">
                          <span className="oas-thread__who">{c.author_name}</span>
                          <span className="tcc-mono oas-files__meta">{fmtStamp(c.created_at)}</span>
                          {c.is_return && (
                            <span className="oas-returned">
                              <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                              Returned
                            </span>
                          )}
                        </p>
                        <p className="oas-prose">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Textarea
                  id="oas-comment"
                  label="Add a comment"
                  rows={2}
                  maxLength={4000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="oas-inlineact">
                  <button
                    type="button"
                    className="tcc-textbtn tcc-textbtn--accent"
                    onClick={doComment}
                    disabled={working || !comment.trim()}
                  >
                    <i className="bi bi-send" aria-hidden="true" />
                    {busy === 'comment' ? 'Posting' : 'Post comment'}
                  </button>
                </div>
              </>
            )}

            {activeTab === 'history' &&
              (subs.length === 0 ? (
                <p className="oas-foot">Nothing has been submitted yet.</p>
              ) : (
                <ul className="oas-history">
                  {subs.map((s) => (
                    <li key={s.id}>
                      <span className="tcc-mono oas-history__v">v{s.version}</span>
                      <span className="tcc-mono oas-files__meta">{fmtStamp(s.created_at)}</span>
                      <span>Submitted by {s.submitter_name}</span>
                      {s.note && <span className="oas-history__note">{s.note}</span>}
                    </li>
                  ))}
                </ul>
              ))}

            {activeTab === 'grade' && showGradeTab && (
              <div className="oas-cols">
                <div className="oas-col">
                  <h3 className="oas-h3">Grade</h3>
                  {canGrade || status === 'graded' ? (
                    <>
                      <div className="oas-gradepair">
                        <Input
                          id="oas-score"
                          label="Score"
                          inputMode="numeric"
                          className="tcc-mono"
                          value={grade.score}
                          disabled={!canGrade}
                          invalid={Boolean(fieldError.grade)}
                          onChange={(e) => {
                            setFieldError((f) => ({ ...f, grade: null }));
                            setGrade((g) => ({ ...g, score: digits(e.target.value) }));
                          }}
                        />
                        <Input
                          id="oas-max"
                          label="Out of"
                          inputMode="numeric"
                          className="tcc-mono"
                          value={grade.max}
                          disabled={!canGrade}
                          invalid={Boolean(fieldError.grade)}
                          onChange={(e) => {
                            setFieldError((f) => ({ ...f, grade: null }));
                            setGrade((g) => ({ ...g, max: digits(e.target.value) }));
                          }}
                        />
                      </div>
                      {fieldError.grade && (
                        <p className="oas-fielderror" role="alert">
                          {fieldError.grade}
                        </p>
                      )}
                      <Textarea
                        id="oas-gradecomment"
                        label="Grade comment (optional)"
                        rows={3}
                        maxLength={2000}
                        value={grade.comment}
                        disabled={!canGrade}
                        onChange={(e) => setGrade((g) => ({ ...g, comment: e.target.value }))}
                      />
                      <p className="oas-foot">
                        {canGrade
                          ? 'One score, one maximum and one comment. Saving the grade marks the work graded for everyone assigned.'
                          : 'This work is graded.'}
                      </p>
                    </>
                  ) : (
                    <p className="oas-foot">
                      A grade can be saved once the work has been submitted.
                    </p>
                  )}
                </div>
                <span className="oas-colrule" aria-hidden="true" />
                <div className="oas-col">
                  <h3 className="oas-h3">
                    <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Return for
                    revision
                  </h3>
                  {reviewing ? (
                    <Textarea
                      id="oas-feedback"
                      label="Return feedback (visible to assignees)"
                      rows={5}
                      maxLength={4000}
                      value={feedback}
                      error={fieldError.feedback}
                      onChange={(e) => {
                        setFeedback(e.target.value);
                        if (e.target.value.trim()) setFieldError((f) => ({ ...f, feedback: null }));
                      }}
                      hint="Required to return work. It is posted to the comments, marked Returned."
                    />
                  ) : (
                    <p className="oas-foot">
                      Work can be returned while it is submitted or under review.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="tcc-state tcc-state--error oas-dstate" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
          {done && !error && (
            <p className="tcc-state oas-dstate" role="status">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>{done}</span>
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
