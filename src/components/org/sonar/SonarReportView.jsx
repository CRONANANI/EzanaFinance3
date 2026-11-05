'use client';

/**
 * SonarReportView: one org research report.
 *
 * Header: kind, title, status, visibility, version, author, reviewer and
 * what it is linked to (pitch, collections, the report it challenges).
 * Actions follow the viewer's rights from the server: submit for review,
 * withdraw, approve or return with a note, supersede, share settings,
 * attach to a pitch, file in a collection, delete a draft.
 * Body: the frozen snapshot of the chosen version, rendered by the same
 * ResearchReport as a live run. Beside it: comments on the whole report or
 * on one finding, resolvable by the author and reviewers.
 *
 * Tokens only (EZANA_BRANDING_GUIDE), Bootstrap Icons, prefix osr-.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ResearchReport from '@/components/sonar/research/ResearchReport';
import {
  KIND_LABEL,
  REPORT_VISIBILITY,
  STATUS_LABEL,
  VISIBILITY_LABEL,
  stateFromSnapshot,
} from '@/lib/org-sonar/reports';
import { StatusChip } from './SonarReportsList';
import './org-sonar.css';

async function call(url, method = 'GET', body = null) {
  const r = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'That did not work. Try again.');
  return data;
}

function day(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}

export default function SonarReportView({ reportId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [version, setVersion] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [panel, setPanel] = useState(null);

  const load = useCallback(
    async (v = null) => {
      try {
        const d = await call(`/api/org/sonar-reports/${reportId}${v ? `?v=${v}` : ''}`);
        setData(d);
        setVersion(d.version);
        setError(null);
      } catch (e) {
        setError(e.message);
      }
    },
    [reportId],
  );
  useEffect(() => {
    load();
  }, [load]);

  const act = async (body) => {
    setBusy(true);
    setError(null);
    try {
      await call(`/api/org/sonar-reports/${reportId}`, 'PATCH', body);
      setNote('');
      setPanel(null);
      await load(version);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await call(`/api/org/sonar-reports/${reportId}`, 'DELETE');
      router.push('/org-team-hub/sonar');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const state = useMemo(() => stateFromSnapshot(data?.snapshot), [data?.snapshot]);

  if (error && !data) {
    return (
      <div className="osr-page">
        <p className="osr-error" role="alert">
          {error}
        </p>
        <Link className="osr-link" href="/org-team-hub/sonar">
          <i className="bi bi-arrow-left" aria-hidden="true" /> All reports
        </Link>
      </div>
    );
  }
  if (!data) return <p className="osr-muted">Loading the report.</p>;

  const { report, rights, versions } = data;
  const current = version === report.current_version;

  return (
    <div className="osr-page">
      <Link className="osr-link" href="/org-team-hub/sonar">
        <i className="bi bi-arrow-left" aria-hidden="true" /> All reports
      </Link>

      <header className="osr-head">
        <div className="osr-row-top">
          <span className="osr-kind">{KIND_LABEL[report.kind] || report.kind}</span>
          {report.ticker ? <span className="osr-ticker">{report.ticker}</span> : null}
          <StatusChip status={report.status} />
          <span className="osr-chip">{VISIBILITY_LABEL[report.visibility]}</span>
        </div>
        <h1 className="osr-h1">{report.title}</h1>
        <p className="osr-row-meta">
          <span>By {report.author_name}</span>
          <span className="osr-mono">Saved {day(report.created_at)}</span>
          {report.reviewer_name && report.reviewed_at ? (
            <span>
              {report.status === 'approved' ? 'Approved' : 'Reviewed'} by {report.reviewer_name}{' '}
              <span className="osr-mono">{day(report.reviewed_at)}</span>
            </span>
          ) : null}
          {report.approved_version ? (
            <span>Approved version v{report.approved_version}</span>
          ) : null}
        </p>
        {report.review_note ? (
          <p className="osr-note">
            <i className="bi bi-chat-left-quote" aria-hidden="true" /> {report.review_note}
          </p>
        ) : null}
        <div className="osr-links">
          {data.pitch ? (
            <Link className="osr-link" href={`/org-team-hub/pitches?pitch=${data.pitch.id}`}>
              <i className="bi bi-kanban" aria-hidden="true" /> Pitch: {data.pitch.ticker}{' '}
              {data.pitch.company_name}
            </Link>
          ) : null}
          {data.original ? (
            <Link className="osr-link" href={`/org-team-hub/sonar/${data.original.id}`}>
              <i className="bi bi-arrow-return-left" aria-hidden="true" /> Challenges:{' '}
              {data.original.title}
            </Link>
          ) : null}
          {data.collections.map((c) => (
            <span key={c.id} className="osr-chip">
              <i className="bi bi-collection" aria-hidden="true" /> {c.name}
            </span>
          ))}
        </div>

        <div className="osr-actions">
          {rights.canSubmit ? (
            <button
              type="button"
              className="osr-btn osr-btn--primary"
              disabled={busy}
              onClick={() => act({ status: 'under_review' })}
            >
              <i className="bi bi-send" aria-hidden="true" /> Submit for review
            </button>
          ) : null}
          {rights.canWithdraw ? (
            <button
              type="button"
              className="osr-btn"
              disabled={busy}
              onClick={() => act({ status: 'draft' })}
            >
              Withdraw to draft
            </button>
          ) : null}
          {rights.canApprove ? (
            <button
              type="button"
              className="osr-btn osr-btn--primary"
              disabled={busy}
              onClick={() => setPanel('review')}
            >
              <i className="bi bi-patch-check" aria-hidden="true" /> Review
            </button>
          ) : null}
          {rights.canSupersede ? (
            <button
              type="button"
              className="osr-btn"
              disabled={busy}
              onClick={() => act({ status: 'superseded' })}
            >
              Mark superseded
            </button>
          ) : null}
          {rights.canEdit ? (
            <button type="button" className="osr-btn" onClick={() => setPanel('settings')}>
              <i className="bi bi-sliders" aria-hidden="true" /> Sharing and links
            </button>
          ) : null}
          {data.myCollections.length ? (
            <button type="button" className="osr-btn" onClick={() => setPanel('collections')}>
              <i className="bi bi-collection" aria-hidden="true" /> Collections
            </button>
          ) : null}
          {rights.canDelete ? (
            <button
              type="button"
              className="osr-btn osr-btn--danger"
              disabled={busy}
              onClick={remove}
            >
              Delete draft
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="osr-error" role="alert">
            {error}
          </p>
        ) : null}

        {panel === 'review' ? (
          <div className="osr-panel">
            <label className="osr-field">
              <span>Note to the author (optional)</span>
              <textarea
                value={note}
                maxLength={2000}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="osr-actions">
              <button
                type="button"
                className="osr-btn osr-btn--primary"
                disabled={busy}
                onClick={() => act({ status: 'approved', reviewNote: note })}
              >
                Approve version v{report.current_version}
              </button>
              <button
                type="button"
                className="osr-btn"
                disabled={busy}
                onClick={() => act({ status: 'draft', reviewNote: note })}
              >
                Return to the author
              </button>
              <button type="button" className="osr-btn" onClick={() => setPanel(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {panel === 'settings' ? (
          <SettingsPanel report={report} busy={busy} onSave={act} onClose={() => setPanel(null)} />
        ) : null}
        {panel === 'collections' ? (
          <div className="osr-panel">
            <p className="osr-h3">File in a Research Library collection</p>
            <ul className="osr-plain">
              {data.myCollections.map((c) => (
                <li key={c.id}>
                  <label className="osr-check">
                    <input
                      type="checkbox"
                      checked={c.has}
                      disabled={busy}
                      onChange={(e) => act({ collectionId: c.id, inCollection: e.target.checked })}
                    />
                    <span>{c.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>

      {data.challenges.length ? (
        <section className="osr-challenges" aria-label="Challenges">
          <p className="osr-h3">
            Challenged {data.challenges.length === 1 ? 'once' : `${data.challenges.length} times`}
          </p>
          <ul className="osr-plain">
            {data.challenges.map((c) => (
              <li key={c.id}>
                <Link className="osr-link" href={`/org-team-hub/sonar/${c.id}`}>
                  {c.title}
                </Link>{' '}
                <span className="osr-muted">
                  by {c.author_name}, {STATUS_LABEL[c.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="osr-body">
        <div className="osr-main">
          {versions.length > 1 ? (
            <div className="osr-versions" role="group" aria-label="Versions">
              {versions.map((v) => (
                <button
                  key={v.version}
                  type="button"
                  className={`osr-ver${v.version === version ? ' is-active' : ''}`}
                  onClick={() => load(v.version)}
                  aria-pressed={v.version === version}
                >
                  v{v.version}
                  {v.version === report.approved_version ? (
                    <i className="bi bi-patch-check" aria-label="approved" />
                  ) : null}
                </button>
              ))}
              {!current ? (
                <span className="osr-muted">An earlier version, kept as it was saved.</span>
              ) : null}
            </div>
          ) : null}
          <div className="osr-report force-dark-theme">
            {state ? <ResearchReport state={state} /> : <p className="osr-muted">No snapshot.</p>}
          </div>
        </div>
        <Comments reportId={reportId} anchors={data.anchors} version={version} />
      </div>
    </div>
  );
}

function SettingsPanel({ report, busy, onSave, onClose }) {
  const [title, setTitle] = useState(report.title);
  const [visibility, setVisibility] = useState(report.visibility);
  const [shared, setShared] = useState(report.shared_with || []);
  const [pitchId, setPitchId] = useState(report.pitch_id || '');
  const [members, setMembers] = useState([]);
  const [pitches, setPitches] = useState([]);
  useEffect(() => {
    Promise.all([
      fetch('/api/org/members', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/org/pitches', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([m, p]) => {
        setMembers((m?.members || []).filter((x) => x.is_active !== false));
        setPitches(p?.pitches || []);
      })
      .catch(() => {});
  }, []);
  const toggle = (id) =>
    setShared((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className="osr-panel">
      <label className="osr-field">
        <span>Title</span>
        <input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="osr-field">
        <span>Who can see it</span>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          {REPORT_VISIBILITY.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABEL[v]}
            </option>
          ))}
        </select>
      </label>
      {visibility === 'members' ? (
        <fieldset className="osr-members">
          <legend>Share with</legend>
          {members.map((m) => (
            <label key={m.user_id} className="osr-check">
              <input
                type="checkbox"
                checked={shared.includes(m.user_id)}
                onChange={() => toggle(m.user_id)}
              />
              <span>{m.display_name || 'Member'}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <label className="osr-field">
        <span>Supports a pitch</span>
        <select value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
          <option value="">No pitch</option>
          {pitches.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ticker ? `${p.ticker}, ` : ''}
              {p.company_name || 'Pitch'}
            </option>
          ))}
        </select>
      </label>
      <div className="osr-actions">
        <button
          type="button"
          className="osr-btn osr-btn--primary"
          disabled={busy || (visibility === 'members' && !shared.length)}
          onClick={() =>
            onSave({ title, visibility, sharedWith: shared, pitchId: pitchId || null })
          }
        >
          Save changes
        </button>
        <button type="button" className="osr-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Comments({ reportId, anchors, version }) {
  const [rows, setRows] = useState(null);
  const [anchor, setAnchor] = useState('report');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const labels = useMemo(() => new Map((anchors || []).map((a) => [a.id, a.label])), [anchors]);

  const load = useCallback(async () => {
    try {
      const d = await call(`/api/org/sonar-reports/${reportId}/comments`);
      setRows(d.comments || []);
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }, [reportId]);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await call(`/api/org/sonar-reports/${reportId}/comments`, 'POST', {
        body: text,
        anchor,
        version,
      });
      setText('');
      setError(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const resolve = async (c) => {
    try {
      await call(`/api/org/sonar-reports/${reportId}/comments`, 'PATCH', {
        commentId: c.id,
        resolved: !c.resolved,
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const visible = (rows || []).filter((c) => showResolved || !c.resolved);
  const resolvedCount = (rows || []).filter((c) => c.resolved).length;

  return (
    <aside className="osr-comments" aria-label="Comments">
      <p className="osr-h3">
        <i className="bi bi-chat-left-text" aria-hidden="true" /> Comments
      </p>
      <form onSubmit={post} className="osr-comment-form">
        <label className="osr-field">
          <span>On</span>
          <select value={anchor} onChange={(e) => setAnchor(e.target.value)}>
            {(anchors || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={text}
          rows={3}
          maxLength={4000}
          placeholder="Ask about the evidence, flag a gap, suggest a source"
          onChange={(e) => setText(e.target.value)}
          aria-label="Comment"
        />
        <button type="submit" className="osr-btn osr-btn--primary" disabled={!text.trim()}>
          Comment
        </button>
      </form>
      {error ? (
        <p className="osr-error" role="alert">
          {error}
        </p>
      ) : null}
      {rows === null ? (
        <p className="osr-muted">Loading comments.</p>
      ) : !visible.length ? (
        <p className="osr-muted">No open comments.</p>
      ) : (
        <ul className="osr-comment-list">
          {visible.map((c) => (
            <li key={c.id} className={`osr-comment${c.resolved ? ' is-resolved' : ''}`}>
              <p className="osr-comment-anchor">{labels.get(c.anchor) || 'Report'}</p>
              <p className="osr-comment-body">{c.body}</p>
              <p className="osr-row-meta">
                <span>{c.author_name}</span>
                {c.version ? <span>v{c.version}</span> : null}
                <span className="osr-mono">{day(c.created_at)}</span>
                <button type="button" className="osr-link" onClick={() => resolve(c)}>
                  {c.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
      {resolvedCount ? (
        <button type="button" className="osr-link" onClick={() => setShowResolved((s) => !s)}>
          {showResolved ? 'Hide' : 'Show'} {resolvedCount} resolved
        </button>
      ) : null}
    </aside>
  );
}
