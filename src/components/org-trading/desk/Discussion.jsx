'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '@/components/ds';
import { MentionInput } from '@/components/org/social2/MentionInput';
import { fmtAgo } from '@/lib/org-trading-desk';
import { Empty, Section, SectionError, Skel } from '@/components/org/command-center/parts';

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};

function initials(name) {
  return (
    String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/* Mentions are of members and read as emerald text. */
function Body({ text }) {
  const parts = String(text).split(/(@[\w][\w'-]*(?:\s[\w][\w'-]*)?)/g);
  return (
    <p className="otd-comment__body">
      {parts.map((p, i) =>
        p.startsWith('@') ? (
          <span key={i} className="otd-mention">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

/** A like on a comment: a thumbs-up and its count, as text. */
function Like({ comment, data }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const { fetchLikes, toggleLike } = data;
  useEffect(() => {
    let cancelled = false;
    fetchLikes(comment).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
    /* Re-read when the comment itself changes, not on every render. */
  }, [comment.id, comment.likes, comment.liked, fetchLikes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = await toggleLike(comment);
    setBusy(false);
    if (next) setState(next);
  };
  const count = state?.count ?? 0;
  return (
    <button
      type="button"
      className={`tcc-textbtn otd-action otd-like${state?.mine ? ' is-on' : ''}`}
      aria-pressed={Boolean(state?.mine)}
      aria-label={`Like, ${count} so far`}
      onClick={toggle}
      disabled={busy || state == null}
    >
      <i
        className={`bi ${state?.mine ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}
        aria-hidden="true"
      />
      <span className="tcc-mono">{count}</span>
    </button>
  );
}

function Comment({ comment, data, onReply, replyCount, isReply }) {
  return (
    <div className={`otd-comment__row${isReply ? ' is-reply' : ''}`}>
      <span className="otd-avatar" aria-hidden="true">
        {initials(comment.author_name)}
      </span>
      <div className="otd-comment__main">
        <div className="otd-comment__head">
          <span className="otd-comment__who">{comment.author_name}</span>
          {comment.author_role && (
            <span className="otd-comment__role">
              {ROLE_LABEL[comment.author_role] || comment.author_role}
            </span>
          )}
          <span className="otd-comment__when tcc-mono">{fmtAgo(comment.created_at)}</span>
        </div>
        <Body text={comment.body} />
        <div className="otd-comment__actions">
          <Like comment={comment} data={data} />
          {!isReply && (
            <button
              type="button"
              className="tcc-textbtn otd-action"
              onClick={() => onReply(comment)}
            >
              <i className="bi bi-chat" aria-hidden="true" />
              Reply
              {replyCount > 0 && <span className="tcc-mono">{replyCount}</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Position discussion: one thread per holding, with one level of replies,
 * mentions of members and likes. Open to every council member for the
 * holdings in their scope.
 */
export function Discussion({ data, rows, loading, failed, ticker, onTicker }) {
  const { fetchThread, postComment, sampleRevision, sampleActive, sampleThreadTickers } = data;
  const [state, setState] = useState({ status: 'idle', comments: [], members: [] });
  const [text, setText] = useState('');
  const [mentionIds, setMentionIds] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const tickers = useMemo(() => [...new Set((rows || []).map((r) => r.ticker))].sort(), [rows]);
  /* Open on a holding, so the section is never a blank picker: the one the
     member chose, else (sample content) one with a thread, else the first. */
  const current =
    ticker && tickers.includes(ticker)
      ? ticker
      : sampleThreadTickers.find((t) => tickers.includes(t)) || tickers[0] || null;

  const load = useCallback(async () => {
    if (!current) return;
    const out = await fetchThread(current);
    setState(
      out.ok
        ? { status: 'ready', ticker: current, comments: out.comments, members: out.members }
        : { status: 'error', ticker: current, comments: [], members: [] },
    );
  }, [current, fetchThread]);

  useEffect(() => {
    if (!current) return;
    setState((s) =>
      s.ticker === current && s.status === 'ready'
        ? s
        : { status: 'loading', ticker: current, comments: [], members: [] },
    );
    load();
  }, [current, load, sampleRevision]);
  useEffect(() => {
    setText('');
    setReplyTo(null);
    setError(null);
  }, [current]);

  const tree = useMemo(() => {
    const replies = new Map();
    for (const c of state.comments) {
      if (!c.parent_id) continue;
      if (!replies.has(c.parent_id)) replies.set(c.parent_id, []);
      replies.get(c.parent_id).push(c);
    }
    return state.comments
      .filter((c) => !c.parent_id)
      .map((root) => ({ root, replies: replies.get(root.id) || [] }));
  }, [state.comments]);

  const submit = async () => {
    if (sending || !current) return;
    setError(null);
    setSending(true);
    const out = await postComment(current, {
      body: text,
      parentId: replyTo?.id || null,
      mentionIds,
    });
    setSending(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setText('');
    setMentionIds([]);
    setReplyTo(null);
    if (!out.sample) load();
  };

  return (
    <Section
      id="otd-discussion"
      title="Position discussion"
      className="otd-discussion"
      aside={
        tickers.length > 1 ? (
          <Select
            id="otd-discussion-ticker"
            aria-label="Holding to discuss"
            className="otd-select tcc-mono"
            value={current || ''}
            options={tickers}
            onChange={(e) => onTicker(e.target.value)}
          />
        ) : current ? (
          <span className="tcc-mono otd-scope">{current}</span>
        ) : null
      }
    >
      {loading ? (
        <div className="otd-skelrows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skel key={i} h={40} />
          ))}
        </div>
      ) : failed ? (
        <p className="tcc-state">
          <span>Discussion opens once the holdings above have loaded.</span>
        </p>
      ) : !current ? (
        <Empty>No holding in your scope to discuss yet.</Empty>
      ) : state.status === 'error' ? (
        <SectionError message={`Could not load the discussion on ${current}.`} onRetry={load} />
      ) : state.status !== 'ready' ? (
        <div className="otd-skelrows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skel key={i} h={40} />
          ))}
        </div>
      ) : (
        <>
          {tree.length === 0 ? (
            <p className="tcc-state">
              <span>
                No discussion on <span className="tcc-mono">{current}</span> yet. Start the thread
                below.
              </span>
            </p>
          ) : (
            <ul className="otd-thread">
              {tree.map(({ root, replies }) => (
                <li key={root.id}>
                  <Comment
                    comment={root}
                    data={data}
                    onReply={setReplyTo}
                    replyCount={replies.length}
                  />
                  {replies.length > 0 && (
                    <ul className="otd-replies">
                      {replies.map((r) => (
                        <li key={r.id}>
                          <Comment comment={r} data={data} isReply />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="otd-compose">
            {replyTo && (
              <p className="otd-compose__reply">
                Replying to {replyTo.author_name}
                <button
                  type="button"
                  className="tcc-textbtn otd-action"
                  onClick={() => setReplyTo(null)}
                >
                  Cancel reply
                </button>
              </p>
            )}
            <MentionInput
              value={text}
              onChange={setText}
              members={state.members}
              onMentionsChange={setMentionIds}
              placeholder={`Comment on ${current}. Type @ to mention a member.`}
              rows={2}
            />
            {error && (
              <p className="tcc-state tcc-state--error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
            <div className="otd-compose__foot">
              <span className="otd-compose__note">
                {sampleActive ? 'Sample content: comments stay on this page.' : ''}
              </span>
              <button
                type="button"
                className="tcc-btn"
                onClick={submit}
                disabled={sending || !text.trim()}
              >
                {replyTo ? 'Reply' : 'Comment'}
              </button>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
