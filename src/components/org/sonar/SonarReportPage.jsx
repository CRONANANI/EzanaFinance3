'use client';

/**
 * One fund research report (/org-team-hub/sonar/[reportId]), at its own
 * address so it can be linked and the back button returns to the list.
 *
 * Header: kind, ticker, status, who can see it, the title, author, reviewer,
 * the review note and what it is linked to. One primary action for the
 * viewer's next step (Submit for review, or Review for a reviewer); every
 * other action is text, and Withdraw, Mark superseded and Delete draft are
 * confirmed in a dialog. Rights come from the server (rights in the GET
 * payload) and the server checks every request again.
 *
 * Body: the frozen Sonar answer of the chosen version, rendered by the shared
 * ResearchReport unchanged, full width. Under it: comments on the whole
 * report or one part, with replies, scoped to the version being read.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal, VisuallyHidden } from '@/components/ds';
import ResearchReport from '@/components/sonar/research/ResearchReport';
import { DeepResearchRun } from '@/components/sonar/DeepResearch';
import { stateFromSnapshot } from '@/lib/org-sonar/reports';
import {
  Empty,
  Section,
  SectionError,
  Skel,
  TextToggle,
} from '@/components/org/command-center/parts';
import {
  CHALLENGE_LABEL,
  NA,
  REPORT_VISIBILITY,
  VISIBILITY_LABEL,
  canResolve,
  claimsOf,
  commentThreads,
  fmtDate,
  fmtTime,
  fmtVersion,
  initials,
  isReturned,
  statusLabel,
} from '@/lib/org-sonar-research-model';
import { KindText, MandateText, StatusText, VisibilityText } from './parts';
import { QuickAnswerDialog } from './ResearchTab';
import { useSonarReport } from './useSonarResearchData';
import '@/components/org/command-center/command-center.css';
import './sonar-research.css';
import '@/styles/home-canvas.css';

function writeVersion(v, current) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (v && v !== current) url.searchParams.set('v', String(v));
  else url.searchParams.delete('v');
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

function rerunHref(report) {
  const sp = new URLSearchParams({ tab: 'research', saveTo: report.id });
  if (report.kind === 'fund_fit' && report.ticker) sp.set('company', report.ticker);
  else if (report.question) sp.set('question', report.question);
  if (report.pitch_id) sp.set('pitch', report.pitch_id);
  return `/org-team-hub/sonar?${sp}`;
}

/* ── Dialogs ──────────────────────────────────────────────────────────────── */

function ConfirmDialog({ confirm, busy, error, onCancel, onConfirm }) {
  if (!confirm) return null;
  return (
    <Modal
      open
      onClose={onCancel}
      title={confirm.title}
      size={480}
      className="osp-dialog"
      footer={
        <div className="osp-dialog__footer">
          <button type="button" className="tcc-textbtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={confirm.danger ? 'tcc-btn osp-btn--danger' : 'tcc-btn'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working' : confirm.action}
          </button>
        </div>
      }
    >
      <p className="osp-dialog__lead">{confirm.body}</p>
      {error ? (
        <p className="osp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

function ReviewDialog({ open, report, busy, error, onCancel, onDecide }) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) setNote('');
  }, [open]);
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onCancel}
      title="Review this report"
      size={560}
      className="osp-dialog"
      footer={
        <div className="osp-dialog__footer">
          <button type="button" className="tcc-textbtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="tcc-textbtn"
            disabled={busy}
            onClick={() => onDecide('draft', note)}
          >
            Return to the author
          </button>
          <button
            type="button"
            className="tcc-btn"
            disabled={busy}
            onClick={() => onDecide('approved', note)}
          >
            Approve {fmtVersion(report.current_version)}
          </button>
        </div>
      }
    >
      <p className="osp-dialog__lead">
        Approval applies to the current version, {fmtVersion(report.current_version)}. Returning
        sends the report back to draft; the author answers by saving a new version from a new run.
      </p>
      <label className="osp-field">
        <span>Note to the author (optional)</span>
        <textarea
          value={note}
          rows={4}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error ? (
        <p className="osp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

function SettingsDialog({ open, report, loadLists, busy, error, onCancel, onSave }) {
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [shared, setShared] = useState([]);
  const [pitchId, setPitchId] = useState('');
  const [lists, setLists] = useState({ status: 'loading', members: [], pitches: [] });
  useEffect(() => {
    if (!open) return undefined;
    setTitle(report.title);
    setVisibility(report.visibility);
    setShared(report.shared_with || []);
    setPitchId(report.pitch_id || '');
    let live = true;
    setLists({ status: 'loading', members: [], pitches: [] });
    loadLists().then((r) => {
      if (live)
        setLists({ status: r.ok ? 'ready' : 'error', members: r.members, pitches: r.pitches });
    });
    return () => {
      live = false;
    };
  }, [open, report, loadLists]);
  if (!open) return null;
  const toggle = (id) =>
    setShared((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const needsMember = visibility === 'members' && !shared.length;
  return (
    <Modal
      open
      onClose={onCancel}
      title="Sharing and links"
      size={560}
      className="osp-dialog"
      footer={
        <div className="osp-dialog__footer">
          <button type="button" className="tcc-textbtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="tcc-btn"
            disabled={busy || needsMember || !title.trim()}
            onClick={() =>
              onSave({
                title: title.trim(),
                visibility,
                sharedWith: visibility === 'members' ? shared : [],
                pitchId: pitchId || null,
              })
            }
          >
            Save changes
          </button>
        </div>
      }
    >
      <label className="osp-field">
        <span>Title</span>
        <input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <fieldset className="osp-fieldset">
        <legend>Who can see it</legend>
        <div className="osp-options">
          {REPORT_VISIBILITY.map((v) => (
            <TextToggle key={v} pressed={visibility === v} onClick={() => setVisibility(v)}>
              {VISIBILITY_LABEL[v]}
            </TextToggle>
          ))}
        </div>
      </fieldset>
      {visibility === 'members' ? (
        <fieldset className="osp-fieldset">
          <legend>Share with (at least one)</legend>
          {lists.status === 'loading' ? (
            <Skel w="60%" h={14} />
          ) : !lists.members.length ? (
            <p className="osp-hint">No members found.</p>
          ) : (
            <div className="osp-options osp-options--list">
              {lists.members.map((m) => (
                <TextToggle
                  key={m.user_id}
                  pressed={shared.includes(m.user_id)}
                  onClick={() => toggle(m.user_id)}
                >
                  <i
                    className={`bi ${shared.includes(m.user_id) ? 'bi-check2-square' : 'bi-square'}`}
                    aria-hidden="true"
                  />
                  {m.display_name || 'Member'}
                </TextToggle>
              ))}
            </div>
          )}
        </fieldset>
      ) : null}
      <label className="osp-field">
        <span>Supports a pitch</span>
        <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
          <option value="">No pitch</option>
          {lists.pitches.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ticker ? `${p.ticker}, ` : ''}
              {p.company_name || 'Pitch'}
            </option>
          ))}
        </select>
      </label>
      {lists.status === 'error' ? (
        <p className="osp-hint">Members or pitches could not be loaded. Close and try again.</p>
      ) : null}
      {error ? (
        <p className="osp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

function CollectionsDialog({ open, collections, busy, error, onClose, onToggle }) {
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="File in a Research Library collection"
      size={480}
      className="osp-dialog"
      footer={
        <div className="osp-dialog__footer">
          <button type="button" className="tcc-btn" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="osp-options osp-options--list" role="group" aria-label="Collections">
        {collections.map((c) => (
          <TextToggle key={c.id} pressed={c.has} onClick={() => !busy && onToggle(c)}>
            <i className={`bi ${c.has ? 'bi-check2-square' : 'bi-square'}`} aria-hidden="true" />
            {c.name}
          </TextToggle>
        ))}
      </div>
      {error ? (
        <p className="osp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

/* ── Comments ─────────────────────────────────────────────────────────────── */

function Comment({ c, labels, viewer, rights, onResolve, onReply, reply = false }) {
  const can = canResolve(c, viewer, rights);
  return (
    <div
      className={`osp-comment${reply ? ' osp-comment--reply' : ''}${c.resolved ? ' is-resolved' : ''}`}
    >
      <span className="osp-avatar tcc-mono" aria-hidden="true">
        {initials(c.author_name)}
      </span>
      <div className="osp-comment__body">
        <p className="osp-comment__meta">
          <span className="osp-comment__name">{c.author_name || 'Member'}</span>
          <span className="tcc-mono">{fmtTime(c.created_at)}</span>
          {c.version ? <span className="tcc-mono">{fmtVersion(c.version)}</span> : null}
          {c.resolved && !reply ? (
            <span className="osp-word tcc-pos">
              <i className="bi bi-check2" aria-hidden="true" />
              Resolved
            </span>
          ) : null}
        </p>
        {!reply ? (
          <p className="osp-comment__part">
            On: <span>{labels.get(c.anchor) || 'Whole report'}</span>
          </p>
        ) : null}
        <p className="osp-comment__text">{c.body}</p>
        {!reply ? (
          <p className="osp-comment__actions">
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => onReply(c)}
            >
              Reply
            </button>
            {can ? (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => onResolve(c)}
              >
                {c.resolved ? 'Reopen' : 'Resolve'}
              </button>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Comments({ state, onRetry, anchors, version, viewer, rights, act, sample }) {
  const [anchor, setAnchor] = useState('report');
  const [text, setText] = useState('');
  const [scope, setScope] = useState('version');
  const [showResolved, setShowResolved] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const labels = useMemo(() => new Map((anchors || []).map((a) => [a.id, a.label])), [anchors]);
  const rows = state.data?.comments || [];
  const { threads, resolved, total } = commentThreads(rows, { version, scope, showResolved });

  const post = async (body, extra = {}) => {
    setBusy(true);
    setError(null);
    const res = await act({
      type: 'comment',
      body,
      anchor: extra.anchor || anchor,
      version,
      ...extra,
    });
    setBusy(false);
    if (!res.ok) setError(res.error || 'The comment was not posted.');
    return res.ok;
  };
  const resolve = async (c) => {
    setError(null);
    const res = await act({ type: 'resolve', commentId: c.id, resolved: !c.resolved });
    if (!res.ok) setError(res.error || 'You cannot resolve that comment.');
  };

  return (
    <Section
      id="osp-comments"
      title="Comments"
      className="osp-gap"
      aside={
        <div className="tcc-toggles">
          <TextToggle pressed={scope === 'version'} onClick={() => setScope('version')}>
            This version
          </TextToggle>
          <TextToggle pressed={scope === 'all'} onClick={() => setScope('all')}>
            All versions
          </TextToggle>
          {resolved ? (
            <TextToggle pressed={showResolved} onClick={() => setShowResolved((v) => !v)}>
              Show resolved <span className="tcc-mono">{resolved}</span>
            </TextToggle>
          ) : null}
        </div>
      }
    >
      <form
        className="osp-commentform"
        onSubmit={async (e) => {
          e.preventDefault();
          if (text.trim() && (await post(text.trim()))) setText('');
        }}
      >
        <label className="osp-select osp-select--inline is-on">
          <span className="osp-select__text" aria-hidden="true">
            On: {labels.get(anchor) || 'Whole report'}
            <i className="bi bi-chevron-down" />
          </span>
          <select
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            aria-label="Part of the report"
          >
            {(anchors || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="osp-line osp-line--area">
          <i className="bi bi-chat-left-text" aria-hidden="true" />
          <span className="tcc-sr">Comment</span>
          <textarea
            value={text}
            rows={2}
            maxLength={4000}
            placeholder={`Add a comment on ${fmtVersion(version)}: a question on the evidence, a gap, a source`}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="osp-formactions">
          {sample ? (
            <span className="osp-hint">Sample content: comments are not saved.</span>
          ) : null}
          <button type="submit" className="tcc-btn" disabled={!text.trim() || busy}>
            Comment
          </button>
        </div>
      </form>
      {error ? (
        <p className="osp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {state.status === 'loading' ? (
        <div className="osp-skel" aria-hidden="true">
          <Skel w="70%" h={14} />
          <Skel w="50%" h={14} />
        </div>
      ) : state.status !== 'ready' ? (
        <SectionError message="Could not load comments." onRetry={onRetry} />
      ) : !threads.length ? (
        <Empty
          action={scope === 'version' && rows.length ? 'Show all versions' : null}
          onAction={() => setScope('all')}
        >
          {total && !showResolved
            ? 'No open comments.'
            : scope === 'version'
              ? `No comments on ${fmtVersion(version)} yet.`
              : 'No comments yet.'}
        </Empty>
      ) : (
        <ul className="osp-thread">
          {threads.map((c) => (
            <li key={c.id}>
              <Comment
                c={c}
                labels={labels}
                viewer={viewer}
                rights={rights}
                onResolve={resolve}
                onReply={(x) => {
                  setReplyTo(x.id === replyTo ? null : x.id);
                  setReplyText('');
                }}
              />
              {c.replies.map((r) => (
                <Comment key={r.id} c={r} labels={labels} viewer={viewer} rights={rights} reply />
              ))}
              {replyTo === c.id ? (
                <form
                  className="osp-replyform"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      replyText.trim() &&
                      (await post(replyText.trim(), { parentId: c.id, anchor: c.anchor }))
                    ) {
                      setReplyText('');
                      setReplyTo(null);
                    }
                  }}
                >
                  <label className="osp-line osp-line--area">
                    <i className="bi bi-reply" aria-hidden="true" />
                    <span className="tcc-sr">Reply to {c.author_name}</span>
                    <textarea
                      value={replyText}
                      rows={2}
                      maxLength={4000}
                      placeholder={`Reply to ${c.author_name || 'this comment'}`}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                  </label>
                  <div className="osp-formactions">
                    <button type="button" className="tcc-textbtn" onClick={() => setReplyTo(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="tcc-btn" disabled={!replyText.trim() || busy}>
                      Reply
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

function Shell({ children, label = 'Sonar report' }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page osp-page osp-report">
      <VisuallyHidden>
        <h1>{label}</h1>
      </VisuallyHidden>
      {children}
    </div>
  );
}

const BackLink = () => (
  <Link href="/org-team-hub/sonar" className="tcc-link osp-back">
    <i className="bi bi-arrow-left" aria-hidden="true" /> All reports
  </Link>
);

export function SonarReportPage({ reportId, sampleViewer = false, initialVersion = null }) {
  const router = useRouter();
  const [version, setVersion] = useState(() => {
    const n = Number(initialVersion);
    return Number.isInteger(n) && n > 0 ? n : null;
  });
  const { detail, comments, retry, act, isSample, gone, loadLists } = useSonarReport({
    reportId,
    version,
    sampleViewer,
  });
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [challenging, setChallenging] = useState(false);
  const [quick, setQuick] = useState(null);

  const d = detail.data;
  const state = useMemo(() => stateFromSnapshot(d?.snapshot), [d?.snapshot]);

  useEffect(() => {
    if (d?.report) writeVersion(d.version, d.report.current_version);
  }, [d?.version, d?.report]);

  useEffect(() => {
    if (gone) router.push('/org-team-hub/sonar');
  }, [gone, router]);

  if (detail.status === 'loading' && !d) {
    return (
      <Shell>
        <BackLink />
        <div className="osp-rhead" aria-busy="true">
          <Skel w={220} h={12} />
          <Skel w="55%" h={24} />
          <Skel w="40%" h={12} />
          <Skel w="70%" h={14} />
        </div>
        <div className="osp-skel osp-answer-skel" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>
              <Skel w="100%" h={18} />
            </span>
          ))}
        </div>
      </Shell>
    );
  }
  if (detail.status === 'missing' || detail.status === 'forbidden') {
    return (
      <Shell>
        <BackLink />
        <Empty href="/org-team-hub/sonar" action="All reports">
          This report does not exist, or you cannot open it.
        </Empty>
      </Shell>
    );
  }
  if (!d) {
    return (
      <Shell>
        <BackLink />
        <SectionError message="Could not load the report." onRetry={retry.detail} />
      </Shell>
    );
  }

  const { report, rights, versions, viewer } = d;
  const current = d.version === report.current_version;
  const returned = isReturned(report);

  const run = async (action, okText) => {
    setBusy(true);
    setError(null);
    const res = await act(action);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'That did not work. Try again.');
      return false;
    }
    setDialog(null);
    if (okText) setNotice(res.sample ? `${okText} Sample content: this is not saved.` : okText);
    return true;
  };

  const open = (kind, extra = {}) => {
    setError(null);
    setDialog({ kind, ...extra });
  };

  const confirmFor = {
    withdraw: {
      title: 'Withdraw this report to draft?',
      body: 'It leaves the review queue and goes back to draft. You can submit it again later.',
      action: 'Withdraw to draft',
      run: () => run({ type: 'status', status: 'draft' }, 'Withdrawn to draft.'),
    },
    supersede: {
      title: 'Mark this report superseded?',
      body: 'A superseded report is closed: it stays readable but takes no new versions, reviews or challenges. This cannot be undone.',
      action: 'Mark superseded',
      run: () => run({ type: 'status', status: 'superseded' }, 'Marked superseded.'),
    },
    delete: {
      title: `Delete the draft "${report.title}"?`,
      body: 'The draft, its versions and its comments are deleted. This cannot be undone.',
      action: 'Delete draft',
      danger: true,
      run: () => run({ type: 'delete' }, null),
    },
  };
  const confirm = dialog && confirmFor[dialog.kind];

  if (challenging) {
    return (
      <Shell label={`Challenge: ${report.title}`}>
        <button type="button" className="tcc-link osp-back" onClick={() => setChallenging(false)}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Back to the report
        </button>
        <p className="osp-runnote">
          Challenging: <strong>{report.title}</strong>. Sonar researches the same question again and
          tests the conclusion against the records. It uses one deep run from the fund budget.
        </p>
        <DeepResearchRun
          query={report.question || report.title}
          extra={{ challenge: { reportId: report.id } }}
          saveLabel="Save the challenge beside the report"
          challengeOf={report.id}
          onBack={() => setChallenging(false)}
          onQuick={() => setQuick(report.question || report.title)}
        />
        <QuickAnswerDialog query={quick} onClose={() => setQuick(null)} />
      </Shell>
    );
  }

  const primary = rights.canApprove
    ? current
      ? { label: 'Review', icon: 'bi-patch-check', onClick: () => open('review') }
      : null
    : rights.canSubmit && !(returned && rights.isAuthor)
      ? {
          label: 'Submit for review',
          icon: 'bi-send',
          onClick: () => run({ type: 'status', status: 'under_review' }, 'Submitted for review.'),
        }
      : null;

  return (
    <Shell label={report.title}>
      <div className="osp-rtop">
        <BackLink />
        {isSample ? <span className="tcc-sample">Sample content</span> : null}
      </div>

      <header className="osp-rhead">
        <p className="osp-rmeta">
          <KindText kind={report.kind} />
          {report.ticker ? <span className="tcc-ticker tcc-mono">{report.ticker}</span> : null}
          <span className="osp-rule" aria-hidden="true" />
          <StatusText status={report.status} />
          <VisibilityText visibility={report.visibility} />
        </p>
        <h2 className="osp-rtitle">{report.title}</h2>
        <dl className="osp-people">
          <div>
            <dt>Author</dt>
            <dd>{report.author_name || NA}</dd>
          </div>
          <div>
            <dt>Reviewer</dt>
            <dd className={report.reviewer_name ? '' : 'tcc-na'}>{report.reviewer_name || NA}</dd>
          </div>
          <div>
            <dt>Saved</dt>
            <dd className="tcc-mono">{fmtDate(report.created_at)}</dd>
          </div>
          <div>
            <dt>Approved version</dt>
            <dd className={`tcc-mono${report.approved_version ? '' : ' tcc-na'}`}>
              {report.approved_version ? fmtVersion(report.approved_version) : NA}
            </dd>
          </div>
          <div>
            <dt>Claims verified</dt>
            <dd className="tcc-mono">{claimsOf(report.summary)}</dd>
          </div>
        </dl>
        {report.kind === 'fund_fit' ? (
          <p className="osp-rline">
            <MandateText summary={report.summary} />
            <span className="osp-hint">A screen against the mandate. The committee decides.</span>
          </p>
        ) : null}
        {report.review_note ? (
          <p className="osp-rline osp-reviewnote">
            <i className="bi bi-chat-left-quote" aria-hidden="true" />
            <span>
              <span className="osp-label">
                {returned ? 'Returned with a note' : 'Review note'}
                {report.reviewer_name ? ` from ${report.reviewer_name}` : ''}:
              </span>{' '}
              {report.review_note}
            </span>
          </p>
        ) : null}
        {d.pitch || d.original || d.collections?.length ? (
          <p className="osp-rline osp-links">
            {d.pitch ? (
              <Link
                href={`/org-team-hub/pitches?pitch=${encodeURIComponent(d.pitch.id)}`}
                className="tcc-link"
              >
                <i className="bi bi-link-45deg" aria-hidden="true" />
                Pitch: <span className="tcc-mono">{d.pitch.ticker || NA}</span>{' '}
                {d.pitch.company_name || ''}
              </Link>
            ) : null}
            {d.original ? (
              <Link
                href={`/org-team-hub/sonar/${encodeURIComponent(d.original.id)}`}
                className="tcc-link"
              >
                <i className="bi bi-arrow-return-left" aria-hidden="true" />
                Challenges: {d.original.title}
              </Link>
            ) : null}
            {d.collections?.length ? (
              <span className="osp-word">
                <i className="bi bi-collection" aria-hidden="true" />
                Collections: {d.collections.map((c) => c.name).join(', ')}
              </span>
            ) : null}
          </p>
        ) : null}

        {returned && rights.isAuthor ? (
          <p className="osp-rline osp-hint">
            Reports cannot be edited. To answer the note, run the research again and save the run as
            a new version of this report.
          </p>
        ) : null}

        <div className="osp-ractions">
          {primary ? (
            <button type="button" className="tcc-btn" disabled={busy} onClick={primary.onClick}>
              <i className={`bi ${primary.icon}`} aria-hidden="true" />
              {primary.label}
            </button>
          ) : null}
          {rights.canApprove && !current ? (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => setVersion(report.current_version)}
            >
              Open {fmtVersion(report.current_version)} to review
            </button>
          ) : null}
          {returned && rights.isAuthor ? (
            <Link href={rerunHref(report)} className="tcc-btn osp-btnlink">
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              Run the research again
            </Link>
          ) : null}
          {returned && rights.canSubmit ? (
            <button
              type="button"
              className="tcc-textbtn"
              disabled={busy}
              onClick={() =>
                run({ type: 'status', status: 'under_review' }, 'Submitted for review.')
              }
            >
              Submit this version again
            </button>
          ) : null}
          {rights.canWithdraw ? (
            <button type="button" className="tcc-textbtn" onClick={() => open('withdraw')}>
              Withdraw to draft
            </button>
          ) : null}
          {rights.canSupersede ? (
            <button type="button" className="tcc-textbtn" onClick={() => open('supersede')}>
              Mark superseded
            </button>
          ) : null}
          {rights.canChallenge && report.summary?.conclusion ? (
            <button
              type="button"
              className="tcc-textbtn"
              onClick={() =>
                isSample
                  ? setNotice('Sample content: a challenge runs real research, so it is off here.')
                  : setChallenging(true)
              }
            >
              Challenge the conclusion
            </button>
          ) : null}
          {rights.canEdit ? (
            <button type="button" className="tcc-textbtn" onClick={() => open('settings')}>
              Sharing and links
            </button>
          ) : null}
          {d.myCollections?.length ? (
            <button type="button" className="tcc-textbtn" onClick={() => open('collections')}>
              Collections
            </button>
          ) : null}
          {rights.canDelete ? (
            <button type="button" className="tcc-textbtn osp-danger" onClick={() => open('delete')}>
              Delete draft
            </button>
          ) : null}
        </div>
        {error && !dialog ? (
          <p className="osp-error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="osp-notice" role="status">
            <i className="bi bi-check2-circle" aria-hidden="true" />
            <span>{notice}</span>
            <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        ) : null}
      </header>

      {report.kind === 'challenge' && d.original ? (
        <section className="osp-compare" aria-label="The two conclusions">
          <div>
            <h3 className="osp-h3">The report&rsquo;s conclusion</h3>
            <p className="osp-prose">{d.original.summary?.conclusion || NA}</p>
            <Link
              href={`/org-team-hub/sonar/${encodeURIComponent(d.original.id)}`}
              className="tcc-link"
            >
              {d.original.title} <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
          <span className="tcc-vrule" aria-hidden="true" />
          <div>
            <h3 className="osp-h3">
              The challenge:{' '}
              {CHALLENGE_LABEL[report.summary?.challengeVerdict] || CHALLENGE_LABEL.unclear}
            </h3>
            <p className="osp-prose">{report.summary?.conclusion || NA}</p>
          </div>
        </section>
      ) : null}

      {d.challenges?.length ? (
        <section className="osp-challenged" aria-labelledby="osp-challenged-h">
          <h3 className="osp-h3" id="osp-challenged-h">
            Challenged <span className="tcc-mono osp-count">{d.challenges.length}</span>
          </h3>
          <ul className="osp-plain">
            {d.challenges.map((c) => (
              <li key={c.id}>
                <Link href={`/org-team-hub/sonar/${encodeURIComponent(c.id)}`} className="tcc-link">
                  {c.title}
                </Link>
                <span className="osp-hint">
                  {c.author_name ? `by ${c.author_name}, ` : ''}
                  {statusLabel(c.status).toLowerCase()}
                  {c.summary?.challengeVerdict
                    ? `, ${CHALLENGE_LABEL[c.summary.challengeVerdict].toLowerCase()}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="osp-versions">
        <span className="osp-label">Version</span>
        <div className="tcc-toggles" role="group" aria-label="Versions">
          {versions.map((v) => (
            <TextToggle
              key={v.version}
              mono
              pressed={v.version === d.version}
              onClick={() => setVersion(v.version)}
            >
              {fmtVersion(v.version)}
              {v.version === report.approved_version ? ' (approved)' : ''}
              {v.version === report.current_version ? ' (current)' : ''}
            </TextToggle>
          ))}
        </div>
        {detail.status === 'loading' ? <Skel w={80} h={12} /> : null}
        {!current ? (
          <span className="osp-hint">
            An earlier version, kept as it was saved on{' '}
            <span className="tcc-mono">
              {fmtDate(versions.find((v) => v.version === d.version)?.created_at)}
            </span>
            .
          </span>
        ) : null}
      </div>

      <section className="osp-answer" aria-label="Sonar answer">
        {d.snapshot?.sample ? (
          <p className="osp-hint">Sample content: a shortened saved answer with no figures.</p>
        ) : null}
        {state ? (
          /* The saved answer keeps the dark ground it has always had: its own styles are
             built for it, and the answer is not changed here. */
          <div className="osp-answer__ground force-dark-theme">
            <ResearchReport state={state} />
          </div>
        ) : (
          <Empty>No saved answer for this version.</Empty>
        )}
      </section>

      <Comments
        state={comments}
        onRetry={retry.comments}
        anchors={d.anchors}
        version={d.version}
        viewer={viewer}
        rights={rights}
        act={act}
        sample={isSample}
      />

      <ConfirmDialog
        confirm={confirm}
        busy={busy}
        error={error}
        onCancel={() => setDialog(null)}
        onConfirm={() => confirm.run()}
      />
      <ReviewDialog
        open={dialog?.kind === 'review'}
        report={report}
        busy={busy}
        error={error}
        onCancel={() => setDialog(null)}
        onDecide={(status, note) =>
          run(
            { type: 'status', status, reviewNote: note },
            status === 'approved' ? 'Approved.' : 'Returned to the author.',
          )
        }
      />
      <SettingsDialog
        open={dialog?.kind === 'settings'}
        report={report}
        loadLists={loadLists}
        busy={busy}
        error={error}
        onCancel={() => setDialog(null)}
        onSave={(patch) => run({ type: 'settings', patch }, 'Sharing and links saved.')}
      />
      <CollectionsDialog
        open={dialog?.kind === 'collections'}
        collections={d.myCollections || []}
        busy={busy}
        error={error}
        onClose={() => setDialog(null)}
        onToggle={async (c) => {
          setBusy(true);
          setError(null);
          const res = await act({ type: 'collection', collectionId: c.id, inCollection: !c.has });
          setBusy(false);
          if (!res.ok) setError(res.error || 'The collection was not updated.');
        }}
      />
    </Shell>
  );
}
