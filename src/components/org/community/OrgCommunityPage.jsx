'use client';

/**
 * Council Community: /community for council members (Nov 2026).
 *
 * A private space for one university investment council, on the same
 * address as the retail Community and reached from the same top navigation
 * item. Council members never see or post to the public retail feed here.
 *
 *   row 1   search, Sample content, Messages, Add event, Announce, New post
 *   row 2   the KPI strip (council figures | fund headline)
 *   row 3   one line on what the viewer's role can do
 *   then    the main column (Feed, Pitches open for feedback, Research notes,
 *           Mentions, Inbox, Cross-council) and a side column split off by one
 *           full-height hairline (Recognition, Coming up, Mentions, Council
 *           inbox, Across Ezana).
 *
 * Who does what (every write is checked again on the server and by the
 * database): every active member posts discussions, questions and updates
 * and reacts; executives and portfolio managers also announce and add
 * events; executives (the faculty advisor included) pin up to three posts
 * and remove posts; authors edit and delete their own. Replies, titles,
 * tickers, edit, delete, remove and pin need the database change in sql.md
 * and read "not available yet" until it is applied.
 *
 * Every section loads and fails on its own. No Team Hub sidebar: this is a
 * top navigation page like Learning Center.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useOrg } from '@/contexts/OrgContext';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import {
  NA,
  EVENT_LABEL,
  REACTIONS,
  TYPE_ICON,
  TYPE_LABEL,
  describeMention,
  filterFeed,
  fmtAgo,
  fmtCount,
  fmtDay,
  fmtMoney,
  fmtSignedPct,
  fmtStamp,
  fmtWhen,
  initials,
  isAdvisor,
  pinnedOf,
  viewerRights,
} from '@/lib/org-community-model';
import { TIER_LABEL } from '@/lib/council-rankings-model';
import { designStageLabel } from '@/lib/org-pitch-state-machine';
import { useOrgCommunity } from './useOrgCommunity';
import { ConfirmPostDialog, EventDialog, PostDialog } from './OrgCommunityDialogs';
import '@/components/org/command-center/command-center.css';
import './org-community.css';
import '@/styles/home-canvas.css';

const OrgSendToTeamModal = dynamic(
  () => import('@/components/org/OrgSendToTeamModal').then((m) => m.OrgSendToTeamModal),
  { ssr: false },
);

const TABS = [
  { key: 'feed', label: 'Feed' },
  { key: 'pitches', label: 'Pitches open for feedback' },
  { key: 'notes', label: 'Research notes' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'across', label: 'Cross-council' },
];
const TYPE_FILTERS = [
  { key: 'announcement', label: 'Announcements' },
  { key: 'question', label: 'Questions' },
  { key: 'update', label: 'Updates' },
  { key: 'discussion', label: 'Discussions' },
];
const SIDE_ROWS = 3;
const WEEK = 7 * 86400000;
const HREF = {
  pitches: '/org-team-hub/pitches',
  notes: '/org-team-hub/research-library',
  recognition: '/org-team-hub/recognition',
  meetings: '/org-team-hub/meetings',
  rankings: '/council-rankings',
  competitions: '/org-competitions',
};
const pitchHref = (id) => `${HREF.pitches}?pitch=${encodeURIComponent(id)}`;
const noteHref = (id) => `${HREF.notes}?d=${encodeURIComponent(id)}`;

/* ── Small parts ────────────────────────────────────────────────────────── */

function Head({ id, title, aside }) {
  return (
    <div className="ocm-head">
      <h2 className="ocm-title" id={id}>
        {title}
      </h2>
      {aside ? <div className="ocm-head__aside">{aside}</div> : null}
    </div>
  );
}

function Empty({ children, action, onAction, href }) {
  return (
    <p className="tcc-state ocm-state">
      <span>{children}</span>
      {href && action ? (
        <Link href={href} className="ocm-act">
          {action}
        </Link>
      ) : null}
      {!href && action && onAction ? (
        <button type="button" className="ocm-act" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </p>
  );
}

function ArrowLink({ href, children }) {
  return (
    <Link href={href} className="ocm-link">
      {children} <i className="bi bi-arrow-right" aria-hidden="true" />
    </Link>
  );
}

function ViewAll({ onClick, label = 'View all' }) {
  return (
    <button type="button" className="ocm-link" onClick={onClick}>
      {label} <i className="bi bi-arrow-right" aria-hidden="true" />
    </button>
  );
}

function RowsSkeleton({ rows = 3, lead = false }) {
  return (
    <ul className="ocm-skel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className={lead ? 'ocm-skel__row ocm-skel__row--lead' : 'ocm-skel__row'}>
          {lead ? <Skel w={24} h={14} /> : null}
          <span className="ocm-skel__lines">
            <Skel w="38%" h={12} />
            <Skel w={`${86 - (i % 3) * 9}%`} h={12} />
            {lead ? <Skel w={`${72 - (i % 2) * 14}%`} h={12} /> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NotAvailable({ children }) {
  return (
    <span className="ocm-na-line">
      <i className="bi bi-info-circle" aria-hidden="true" />
      {children}
    </span>
  );
}

/* ── KPI strip ──────────────────────────────────────────────────────────── */

function Kpi({ label, loading, na, tone, title, children }) {
  return (
    <div className="ocm-kpi" role="listitem" title={title}>
      <span className="ocm-kpi__label">{label}</span>
      <span className={`ocm-kpi__value tcc-mono${na ? ' tcc-na' : tone ? ` ${tone}` : ''}`}>
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

function KpiStrip({ view, feed, upcoming, now }) {
  const st = (k) => view[k].status;
  const council = view.council.data;
  const fund = council?.fund || null;
  const postsWeek = feed.filter((p) => now - Date.parse(p.createdAt) < WEEK).length;
  const openPitches = view.pitches.data?.pitches?.length;
  const unreadMentions = (view.mentions.data?.mentions || []).filter((m) => !m.seen).length;
  const unreadInbox = (view.inbox.data?.messages || []).filter((m) => !m.is_read).length;
  const soon = upcoming.filter((u) => Date.parse(u.date) - now < 14 * 86400000).length;
  const cell = (key, value) => {
    const s = st(key);
    return { loading: s === 'loading', na: s === 'error', value: s === 'error' ? NA : value };
  };
  const members = cell('council', fmtCount(council?.members));
  const posts = cell('feed', String(postsWeek));
  const open = cell('pitches', fmtCount(openPitches));
  const up = cell('events', String(soon));
  const men = cell('mentions', String(unreadMentions));
  const inb = cell('inbox', String(unreadInbox));
  const fundLoading = st('council') === 'loading';
  const fundNa = st('council') === 'error' || !fund;
  const ret = fund?.returnPct;
  return (
    <div
      className="ocm-kpis"
      role="list"
      aria-label="Council figures"
      aria-busy={fundLoading || undefined}
    >
      <Kpi label="Members" title="Active members of the council" {...members}>
        {members.value}
      </Kpi>
      <Kpi label="Posts this week" title="Council posts in the last 7 days" {...posts}>
        {posts.value}
      </Kpi>
      <Kpi
        label="Open for feedback"
        title="Pitches in a stage before the committee decides"
        {...open}
      >
        {open.value}
      </Kpi>
      <Kpi label="Coming up" title="Meetings and council events in the next 14 days" {...up}>
        {up.value}
      </Kpi>
      <Kpi label="Unread mentions" {...men}>
        {men.value}
      </Kpi>
      <Kpi label="Inbox unread" {...inb}>
        {inb.value}
      </Kpi>
      <span className="ocm-kpis__rule" aria-hidden="true" />
      <Kpi
        label="Fund value"
        loading={fundLoading}
        na={fundNa}
        title="Market value of the council's positions"
      >
        {fundNa ? NA : fmtMoney(fund.value)}
      </Kpi>
      <Kpi
        label="Return on cost"
        loading={fundLoading}
        na={fundNa || ret == null}
        tone={ret > 0 ? 'tcc-pos' : ret < 0 ? 'tcc-neg' : ''}
        title="Gain on the cost of current holdings, not time-weighted"
      >
        {fundNa ? NA : fmtSignedPct(ret)}
      </Kpi>
      <Kpi label="Positions" loading={fundLoading} na={fundNa}>
        {fundNa ? NA : fmtCount(fund.positions)}
      </Kpi>
    </div>
  );
}

/* ── Feed ───────────────────────────────────────────────────────────────── */

function Reactions({ post, onReact }) {
  return (
    <div className="ocm-reactions" role="group" aria-label="Reactions">
      {REACTIONS.map((r) => {
        const n = post.reactions.counts[r.key] || 0;
        const on = post.reactions.mine.includes(r.key);
        return (
          <button
            key={r.key}
            type="button"
            className={`ocm-react${on ? ' is-on' : ''}`}
            aria-pressed={on}
            aria-label={`${r.label}, ${n}`}
            onClick={() => onReact(post.id, r.key)}
          >
            <i className={`bi ${on ? `${r.icon}-fill` : r.icon}`} aria-hidden="true" />
            <span className="tcc-mono">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReplyBox({ postId, onReply }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    const r = await onReply({ parent_id: postId, content: text });
    setBusy(false);
    if (r.ok) setText('');
    else
      setErr(
        r.notAvailable ? 'Replies are not available yet.' : r.error || 'The reply was not saved.',
      );
  };
  return (
    <form className="ocm-reply" onSubmit={submit}>
      <label className="tcc-sr" htmlFor={`ocm-reply-${postId}`}>
        Reply
      </label>
      <input
        id={`ocm-reply-${postId}`}
        className="ocm-field ocm-reply__input"
        placeholder="Write a reply"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="ocm-act" disabled={busy || !text.trim()}>
        Reply
      </button>
      {err ? (
        <span className="ocm-reply__err" role="alert">
          {err}
        </span>
      ) : null}
    </form>
  );
}

function PostRow({ post, caps, onReact, onReply, onAsk, pinned = false }) {
  const [open, setOpen] = useState(false);
  const n = post.replies.length;
  const titleId = `ocm-post-${post.id}`;
  return (
    <article className="ocm-post" aria-labelledby={titleId}>
      <span className="ocm-post__initials tcc-mono" aria-hidden="true">
        {post.authorInitials}
      </span>
      <div className="ocm-post__body">
        <div className="ocm-post__top">
          <div className="ocm-post__who">
            <span className="ocm-post__name">{post.authorName}</span>
            <span className="ocm-dot" aria-hidden="true">
              ·
            </span>
            <time className="ocm-post__time tcc-mono" dateTime={post.createdAt}>
              {fmtStamp(post.createdAt)}
            </time>
            {post.editedAt ? <span className="ocm-post__edited">edited</span> : null}
            <span className="ocm-post__sub">
              <i className={`bi ${TYPE_ICON[post.type]}`} aria-hidden="true" />
              {TYPE_LABEL[post.type]} · {post.teamName} · {post.authorRole}
            </span>
          </div>
          <div className="ocm-post__actions">
            {post.canPin ? (
              <button
                type="button"
                className="ocm-tb"
                onClick={() => onAsk(pinned ? 'unpin' : 'pin', post)}
              >
                <i className="bi bi-pin-angle" aria-hidden="true" />
                {pinned ? 'Unpin' : 'Pin'}
              </button>
            ) : null}
            {post.canEdit ? (
              <button type="button" className="ocm-tb" onClick={() => onAsk('edit', post)}>
                <i className="bi bi-pencil" aria-hidden="true" />
                Edit
              </button>
            ) : null}
            {post.canDelete ? (
              <button
                type="button"
                className="ocm-tb ocm-tb--neg"
                onClick={() => onAsk('delete', post)}
              >
                <i className="bi bi-trash3" aria-hidden="true" />
                Delete
              </button>
            ) : null}
            {post.canRemove ? (
              <button
                type="button"
                className="ocm-tb ocm-tb--neg"
                onClick={() => onAsk('remove', post)}
              >
                <i className="bi bi-trash3" aria-hidden="true" />
                Remove
              </button>
            ) : null}
          </div>
        </div>
        <h3 className="ocm-post__title" id={titleId}>
          {post.title || (
            <span className="tcc-sr">{`${TYPE_LABEL[post.type]} by ${post.authorName}`}</span>
          )}
        </h3>
        <p className="ocm-post__text">{post.content}</p>
        {post.ticker ? (
          <p className="ocm-post__meta">
            <span className="ocm-ticker tcc-mono">{post.ticker}</span>
          </p>
        ) : null}
        <div className="ocm-post__foot">
          <Reactions post={post} onReact={onReact} />
          {caps.replies ? (
            <button
              type="button"
              className="ocm-tb"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <i className="bi bi-chat" aria-hidden="true" />
              {n ? (
                <>
                  <span className="tcc-mono">{n}</span> {n === 1 ? 'reply' : 'replies'}
                </>
              ) : (
                'Reply'
              )}
            </button>
          ) : post.type === 'question' ? (
            <NotAvailable>Replies not available yet</NotAvailable>
          ) : null}
        </div>
        {caps.replies && open ? (
          <div className="ocm-replies">
            {post.replies.map((r) => (
              <div key={r.id} className="ocm-replyrow">
                <span className="ocm-replyrow__initials tcc-mono" aria-hidden="true">
                  {r.authorInitials}
                </span>
                <div>
                  <p className="ocm-replyrow__who">
                    <span className="ocm-post__name">{r.authorName}</span>
                    <span className="ocm-dot" aria-hidden="true">
                      ·
                    </span>
                    <time className="ocm-post__time tcc-mono" dateTime={r.createdAt}>
                      {fmtStamp(r.createdAt)}
                    </time>
                    {r.canDelete ? (
                      <button
                        type="button"
                        className="ocm-tb ocm-tb--neg"
                        onClick={() => onAsk('delete', r)}
                      >
                        Delete
                      </button>
                    ) : null}
                    {r.canRemove ? (
                      <button
                        type="button"
                        className="ocm-tb ocm-tb--neg"
                        onClick={() => onAsk('remove', r)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </p>
                  <p className="ocm-replyrow__text">{r.content}</p>
                </div>
              </div>
            ))}
            <ReplyBox postId={post.id} onReply={onReply} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Digest({ state, onRetry }) {
  const c = state.data?.counts;
  const items = c
    ? [
        [
          'bi-file-earmark-text',
          c.pitches,
          c.pitches === 1 ? 'new pitch shared' : 'new pitches shared',
        ],
        [
          'bi-journal-text',
          c.notes,
          c.notes === 1 ? 'research note published' : 'research notes published',
        ],
        ['bi-briefcase', c.positions, c.positions === 1 ? 'position opened' : 'positions opened'],
        ['bi-trophy', c.recognitions, c.recognitions === 1 ? 'award given' : 'awards given'],
      ]
    : [];
  const quiet = c && items.every(([, n]) => !n);
  return (
    <section
      className="ocm-digest"
      aria-labelledby="ocm-digest-t"
      aria-busy={state.status === 'loading' || undefined}
    >
      <Head id="ocm-digest-t" title="This week in the council" />
      {state.status === 'loading' ? (
        <div className="ocm-digest__grid" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="ocm-skel__lines">
              <Skel w={32} h={18} />
              <Skel w="70%" h={12} />
            </span>
          ))}
        </div>
      ) : state.status === 'error' ? (
        <SectionError message="The weekly digest could not be loaded." onRetry={onRetry} />
      ) : quiet ? (
        <Empty href={HREF.pitches} action="Open the pitch pipeline">
          Nothing has been shared this week.
        </Empty>
      ) : (
        <ul className="ocm-digest__grid">
          {items.map(([icon, n, label]) => (
            <li key={label} className="ocm-digest__item">
              <i className={`bi ${icon}`} aria-hidden="true" />
              <span className="ocm-digest__n tcc-mono">{fmtCount(n)}</span>
              <span className="ocm-digest__label">{label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Main column tabs other than the feed ───────────────────────────────── */

function PitchList({ state, query, onRetry }) {
  if (state.status === 'loading') return <RowsSkeleton rows={4} />;
  if (state.status === 'error')
    return <SectionError message="Pitches could not be loaded." onRetry={onRetry} />;
  const q = query.trim().toLowerCase();
  const rows = (state.data?.pitches || []).filter(
    (p) =>
      !q ||
      [p.ticker, p.company_name, p.analyst_name, p.team_name].some((s) =>
        String(s || '')
          .toLowerCase()
          .includes(q),
      ),
  );
  if (!rows.length)
    return (
      <Empty href={HREF.pitches} action="Open the pitch pipeline">
        {q ? 'No pitches match your search.' : 'No pitches are open for feedback.'}
      </Empty>
    );
  return (
    <ul className="ocm-list">
      {rows.map((p) => (
        <li key={p.id} className="ocm-item">
          <Link href={pitchHref(p.id)} className="ocm-item__link">
            <span className="ocm-item__title">
              <span className="ocm-ticker tcc-mono">{p.ticker}</span> {p.company_name || ''}
            </span>
            <span className="ocm-item__sub">
              Stage: {designStageLabel(p.stage)} · {p.analyst_name} · {p.team_name || 'No team'}
            </span>
          </Link>
          <span className="ocm-item__meta">
            <span>
              <i className="bi bi-chat" aria-hidden="true" />{' '}
              <span className="tcc-mono">{p.comments == null ? NA : p.comments}</span>
            </span>
            <span className="tcc-mono">since {fmtDay(p.stage_entered_at)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function NoteList({ state, query, onRetry }) {
  if (state.status === 'loading') return <RowsSkeleton rows={4} />;
  if (state.status === 'error')
    return <SectionError message="Research notes could not be loaded." onRetry={onRetry} />;
  const q = query.trim().toLowerCase();
  const rows = (state.data?.notes || []).filter(
    (n) =>
      !q ||
      [n.title, n.ticker, n.author_name, n.sector].some((s) =>
        String(s || '')
          .toLowerCase()
          .includes(q),
      ),
  );
  if (!rows.length)
    return (
      <Empty href={HREF.notes} action="Open the research library">
        {q ? 'No notes match your search.' : 'No research notes are published yet.'}
      </Empty>
    );
  return (
    <ul className="ocm-list">
      {rows.map((n) => (
        <li key={n.id} className="ocm-item">
          <Link href={noteHref(n.id)} className="ocm-item__link">
            <span className="ocm-item__title">
              {n.ticker ? <span className="ocm-ticker tcc-mono">{n.ticker} </span> : null}
              {n.title}
            </span>
            <span className="ocm-item__sub">
              {n.author_name} · {n.sector || 'No sector'} · published{' '}
              <span className="tcc-mono">{fmtDay(n.published_at || n.created_at)}</span>
            </span>
          </Link>
          <span className="ocm-item__meta">
            <span title="Views">
              <i className="bi bi-eye" aria-hidden="true" />{' '}
              <span className="tcc-mono">{n.view_count == null ? NA : n.view_count}</span>
            </span>
            <span title="Comments">
              <i className="bi bi-chat" aria-hidden="true" />{' '}
              <span className="tcc-mono">{n.comments == null ? NA : n.comments}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function MentionRows({ rows, now, compact }) {
  return (
    <ul className="ocm-list">
      {rows.map((m) => {
        const d = describeMention(m);
        const inner = (
          <>
            <span className={`ocm-unread${m.seen ? '' : ' is-on'}`} aria-hidden="true" />
            <span className={`ocm-initials tcc-mono${m.seen ? '' : ' is-on'}`} aria-hidden="true">
              {initials(m.author_name)}
            </span>
            <span className="ocm-mrow__text">
              <span className="ocm-mrow__line">
                <strong>{m.author_name}</strong> mentioned you
                {m.seen ? null : <span className="tcc-sr"> (unread)</span>}
              </span>
              <span className="ocm-item__sub">{d.where}</span>
            </span>
            <time className="ocm-mrow__time tcc-mono" dateTime={m.created_at}>
              {fmtAgo(m.created_at, now)}
            </time>
          </>
        );
        return (
          <li key={m.id} className={`ocm-mrow${compact ? ' ocm-mrow--compact' : ''}`}>
            {d.href ? (
              <Link href={d.href} className="ocm-mrow__link">
                {inner}
              </Link>
            ) : (
              <div className="ocm-mrow__link">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function InboxRows({ rows, now, onOpen, openId, compact }) {
  return (
    <ul className="ocm-list">
      {rows.map((m) => {
        const expanded = openId === m.id;
        return (
          <li
            key={m.id}
            className={`ocm-mrow ocm-mrow--inbox${compact ? ' ocm-mrow--compact' : ''}`}
          >
            <button
              type="button"
              className="ocm-mrow__link"
              aria-expanded={compact ? undefined : expanded}
              onClick={() => onOpen(m)}
            >
              <span className={`ocm-unread${m.is_read ? '' : ' is-on'}`} aria-hidden="true" />
              <span
                className={`ocm-initials tcc-mono${m.is_read ? '' : ' is-on'}`}
                aria-hidden="true"
              >
                {initials(m.sender_name)}
              </span>
              <span className="ocm-mrow__text">
                <span className="ocm-mrow__line">
                  <strong>{m.sender_name}</strong>
                  {m.is_read ? null : <span className="tcc-sr"> (unread)</span>}
                </span>
                <span className="ocm-item__sub">
                  {m.subject || m.attachment_label || 'Message'}
                </span>
              </span>
              <span className="ocm-mrow__clip">
                {m.attachment_kind ? (
                  <i className="bi bi-paperclip" aria-label="Has an attachment" />
                ) : null}
              </span>
              <time className="ocm-mrow__time tcc-mono" dateTime={m.created_at}>
                {fmtAgo(m.created_at, now)}
              </time>
            </button>
            {!compact && expanded ? (
              <div className="ocm-msg">
                <p className="ocm-msg__body">{m.body}</p>
                {m.attachment_label ? (
                  <p className="ocm-item__sub">
                    <i className="bi bi-paperclip" aria-hidden="true" /> {m.attachment_label}
                  </p>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function AcrossBody({ state, onRetry, full = false }) {
  if (state.status === 'loading') return <RowsSkeleton rows={full ? 5 : 3} />;
  if (state.status === 'error')
    return <SectionError message="Council rankings could not be loaded." onRetry={onRetry} />;
  const d = state.data || {};
  const rows = d.rows || [];
  const mine = rows.find((r) => r.orgId === d.myOrgId) || null;
  const others = rows.filter((r) => r.orgId !== d.myOrgId).slice(0, full ? 10 : 2);
  const comps = d.competitions || [];
  if (!rows.length && !comps.length)
    return (
      <Empty href={HREF.competitions} action="View competitions">
        Rankings appear after councils report or compete.
      </Empty>
    );
  return (
    <div className="ocm-across">
      {mine ? (
        <div className="ocm-across__mine">
          <i className="bi bi-bar-chart" aria-hidden="true" />
          <div>
            <p className="ocm-item__title">{mine.name}</p>
            <p className="ocm-item__sub">
              Council rankings: <span className="tcc-mono ocm-strong">#{mine.rank}</span> of{' '}
              <span className="tcc-mono">{d.total}</span> · Rating{' '}
              <span className="tcc-mono ocm-strong">{mine.rating}</span> · Tier{' '}
              <span className="ocm-emerald">{TIER_LABEL[mine.tier] || mine.tier || NA}</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="ocm-item__sub">Your council is not rated yet.</p>
      )}
      {others.length ? (
        <>
          <p className="ocm-across__label">Other councils (read only)</p>
          <ol className="ocm-ranks">
            {others.map((r) => (
              <li key={r.orgId} className="ocm-rank">
                <span className="tcc-mono ocm-rank__n">{r.rank}</span>
                <span className="ocm-rank__name">{r.name}</span>
                <span className="ocm-rank__tier">{TIER_LABEL[r.tier] || r.tier || NA}</span>
                <span className="tcc-mono ocm-rank__rating">{r.rating}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {comps.length ? (
        <ul className="ocm-list ocm-comps">
          {comps.slice(0, full ? 5 : 1).map((c) => (
            <li key={c.id} className="ocm-comp">
              <i className="bi bi-trophy" aria-hidden="true" />
              <div>
                <p className="ocm-item__title">{c.name}</p>
                <p className="ocm-item__sub">
                  {c.status === 'open'
                    ? 'Open'
                    : c.status === 'judging'
                      ? 'Judging'
                      : 'In progress'}
                  {c.ends_at ? (
                    <>
                      {' '}
                      · until <span className="tcc-mono">{fmtDay(c.ends_at)}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="ocm-across__links">
        <ArrowLink href={HREF.competitions}>View competitions</ArrowLink>
        {full ? <ArrowLink href={HREF.rankings}>Open council rankings</ArrowLink> : null}
      </p>
    </div>
  );
}

/* ── The page ───────────────────────────────────────────────────────────── */

export function OrgCommunityPage() {
  const { orgData, hasPermission } = useOrg();
  const data = useOrgCommunity();
  const { view, feed, upcoming, sampleActive } = data;
  const [tab, setTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [openMsg, setOpenMsg] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const me = data.viewer || orgData?.member || null;
  const caps = data.caps;
  const rights = useMemo(() => viewerRights(me, caps), [me, caps]);
  const teams = view.feed.data?.teams || orgData?.teams || [];
  const councilName = sampleActive
    ? 'Sample council'
    : orgData?.org?.fund_display_name || orgData?.org?.name || 'Your council';
  const canMessage = !sampleActive && hasPermission?.('send_to_team');

  const pinned = useMemo(() => (caps.pinning ? pinnedOf(feed) : []), [feed, caps.pinning]);
  const pinnedIds = useMemo(() => new Set(pinned.map((p) => p.id)), [pinned]);
  const showPinned = filter === 'all' || filter === 'announcement';
  const rows = useMemo(() => {
    const list = filterFeed(feed, filter, query);
    return showPinned && !query ? list.filter((p) => !pinnedIds.has(p.id)) : list;
  }, [feed, filter, query, showPinned, pinnedIds]);
  const filterName =
    filter === 'all'
      ? null
      : filter.startsWith('team:')
        ? teams.find((t) => `team:${t.id}` === filter)?.name || 'this team'
        : TYPE_FILTERS.find((f) => f.key === filter)?.label.toLowerCase();

  const mentions = useMemo(() => view.mentions.data?.mentions || [], [view.mentions.data]);
  const messages = useMemo(() => view.inbox.data?.messages || [], [view.inbox.data]);
  const awards = view.recognition.data?.awards || [];
  const { markMentionsSeen } = data;

  /* Opening the Mentions tab marks what it shows as seen. */
  useEffect(() => {
    if (tab !== 'mentions' || view.mentions.status !== 'ready') return;
    const ids = mentions.filter((m) => !m.seen).map((m) => m.id);
    if (ids.length) markMentionsSeen(ids);
  }, [tab, view.mentions.status, mentions, markMentionsSeen]);

  const openMessage = (m) => {
    setTab('inbox');
    setOpenMsg((cur) => (cur === m.id ? null : m.id));
    if (!m.is_read) data.markRead(m.id);
  };

  const onReact = async (id, key) => {
    const r = await data.react(id, key);
    if (!r.ok) setToast('The reaction did not go through. Try again.');
  };

  const onAsk = (kind, post) => {
    if (kind === 'pin' || kind === 'unpin') {
      data.changePost(post.id, kind).then((r) => {
        if (r.ok) setToast(kind === 'pin' ? 'Post pinned.' : 'Post unpinned.');
        else
          setToast(
            r.notAvailable
              ? 'Pinning is not available yet.'
              : r.error || 'That did not go through.',
          );
      });
      return;
    }
    setDialog({ kind, post });
  };

  const openComposer = (type = 'discussion') => setDialog({ kind: 'new', type });
  const closeDialog = (message) => {
    setDialog(null);
    if (message) setToast(message);
  };

  const roleLine = (() => {
    if (!me) return null;
    const pending =
      view.feed.status === 'ready' && (rights.pinPending || rights.removePending)
        ? ' Pinning and removing posts are not available yet.'
        : '';
    if (isAdvisor(me))
      return [
        'Faculty advisor view.',
        ` You can post, announce, add events, pin up to three posts and remove posts.${pending}`,
      ];
    if (me.role === 'executive')
      return [
        'Executive view.',
        ` You can post, announce, add events, pin up to three posts and remove posts.${pending}`,
      ];
    if (me.role === 'portfolio_manager')
      return [
        'Portfolio manager view.',
        ' You can post, announce and add events. Executives pin and remove posts.',
      ];
    return [
      'Analyst view.',
      ' You can post discussions, questions and updates and react. Executives and portfolio managers announce and add events.',
    ];
  })();

  /* ── Side column sections ── */
  const side = (
    <aside className="ocm-side" aria-label="Council activity">
      <section
        className="ocm-sec"
        aria-labelledby="ocm-rec-t"
        aria-busy={view.recognition.status === 'loading' || undefined}
      >
        <Head
          id="ocm-rec-t"
          title="Recognition"
          aside={<ArrowLink href={HREF.recognition}>View all</ArrowLink>}
        />
        {view.recognition.status === 'loading' ? (
          <RowsSkeleton rows={3} lead />
        ) : view.recognition.status === 'error' ? (
          <SectionError
            message="Awards could not be loaded."
            onRetry={() => data.retry('recognition')}
          />
        ) : !awards.length ? (
          <Empty href={HREF.recognition} action="Open recognition">
            No awards given yet.
          </Empty>
        ) : (
          <>
            <p className="ocm-side__label">Recent awards</p>
            <ul className="ocm-list">
              {awards.slice(0, SIDE_ROWS).map((a) => (
                <li key={a.id} className={`ocm-award${a.is_award ? ' is-gold' : ''}`}>
                  <i
                    className={`bi ${a.is_award ? 'bi-trophy-fill' : 'bi-award'}`}
                    aria-hidden="true"
                  />
                  <div className="ocm-award__body">
                    <p className="ocm-award__title">
                      {a.title}
                      {a.is_award ? <span className="tcc-sr"> (gold award)</span> : null}
                    </p>
                    <p className="ocm-item__sub">
                      to <strong>{a.recipient_name}</strong>
                      {a.giver_name ? (
                        <> · by {a.giver_name}</>
                      ) : a.auto_generated ? (
                        <> · automatic</>
                      ) : null}
                    </p>
                    {a.reason ? <p className="ocm-award__reason">{a.reason}</p> : null}
                  </div>
                  <time className="ocm-mrow__time tcc-mono" dateTime={a.created_at}>
                    {fmtDay(a.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section
        className="ocm-sec"
        aria-labelledby="ocm-up-t"
        aria-busy={view.events.status === 'loading' || undefined}
      >
        <Head
          id="ocm-up-t"
          title="Coming up"
          aside={
            rights.addEvent ? (
              <button
                type="button"
                className="ocm-link"
                onClick={() => setDialog({ kind: 'event' })}
              >
                Add event
              </button>
            ) : (
              <ArrowLink href={HREF.meetings}>Meetings</ArrowLink>
            )
          }
        />
        {view.events.status === 'loading' ? (
          <RowsSkeleton rows={3} lead />
        ) : view.events.status === 'error' ? (
          <SectionError
            message="Events could not be loaded."
            onRetry={() => data.retry('events')}
          />
        ) : !upcoming.length ? (
          rights.addEvent ? (
            <Empty action="Add event" onAction={() => setDialog({ kind: 'event' })}>
              No meetings or deadlines scheduled.
            </Empty>
          ) : (
            <Empty href={HREF.meetings} action="Open meetings">
              No meetings or deadlines scheduled.
            </Empty>
          )
        ) : (
          <ul className="ocm-list">
            {upcoming.slice(0, 4).map((u) => {
              const inner = (
                <>
                  <i
                    className={`bi ${u.type === 'deadline' ? 'bi-flag' : 'bi-calendar3'}`}
                    aria-hidden="true"
                  />
                  <span className="ocm-mrow__text">
                    <span className="ocm-up__title">{u.title}</span>
                    <span className="ocm-item__sub">
                      <span className="tcc-mono">{fmtWhen(u.date)}</span> · {u.team} ·{' '}
                      {u.kind === 'meeting' ? 'Meeting' : EVENT_LABEL[u.type]}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={u.id} className="ocm-up">
                  {u.href ? (
                    <Link href={u.href} className="ocm-up__link">
                      {inner}
                    </Link>
                  ) : (
                    <div className="ocm-up__link" title={u.description || undefined}>
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {view.events.status === 'ready' && view.events.data?.partial ? (
          <p className="ocm-item__sub">Some events could not be loaded.</p>
        ) : null}
      </section>

      <section
        className="ocm-sec"
        aria-labelledby="ocm-men-t"
        aria-busy={view.mentions.status === 'loading' || undefined}
      >
        <Head
          id="ocm-men-t"
          title="Mentions"
          aside={<ViewAll onClick={() => setTab('mentions')} />}
        />
        {view.mentions.status === 'loading' ? (
          <RowsSkeleton rows={3} lead />
        ) : view.mentions.status === 'error' ? (
          <SectionError
            message="Mentions could not be loaded."
            onRetry={() => data.retry('mentions')}
          />
        ) : !mentions.length ? (
          <Empty>No one has mentioned you yet.</Empty>
        ) : (
          <MentionRows rows={mentions.slice(0, SIDE_ROWS)} now={now} compact />
        )}
      </section>

      <section
        className="ocm-sec"
        aria-labelledby="ocm-in-t"
        aria-busy={view.inbox.status === 'loading' || undefined}
      >
        <Head
          id="ocm-in-t"
          title="Council inbox"
          aside={<ViewAll onClick={() => setTab('inbox')} />}
        />
        {view.inbox.status === 'loading' ? (
          <>
            <p className="ocm-item__sub">Loading council inbox...</p>
            <RowsSkeleton rows={2} lead />
          </>
        ) : view.inbox.status === 'error' ? (
          <SectionError
            message="The inbox could not be loaded."
            onRetry={() => data.retry('inbox')}
          />
        ) : !messages.length ? (
          canMessage ? (
            <Empty action="New message" onAction={() => setSendOpen(true)}>
              Your council inbox is empty.
            </Empty>
          ) : (
            <Empty>Your council inbox is empty.</Empty>
          )
        ) : (
          <InboxRows rows={messages.slice(0, SIDE_ROWS)} now={now} onOpen={openMessage} compact />
        )}
      </section>

      <section
        className="ocm-sec"
        aria-labelledby="ocm-x-t"
        aria-busy={view.across.status === 'loading' || undefined}
      >
        <Head
          id="ocm-x-t"
          title="Across Ezana"
          aside={<ViewAll onClick={() => setTab('across')} label="Cross-council" />}
        />
        <AcrossBody state={view.across} onRetry={() => data.retry('across')} />
      </section>
    </aside>
  );

  /* ── Main column ── */
  const feedBody = (() => {
    const st = view.feed.status;
    if (st === 'loading') return <RowsSkeleton rows={3} lead />;
    if (st === 'error')
      return (
        <SectionError
          message="The council feed could not be loaded."
          onRetry={() => data.retry('feed')}
        />
      );
    if (!feed.length)
      return (
        <Empty action="Start a discussion" onAction={() => openComposer('discussion')}>
          {councilName} has no posts yet.
        </Empty>
      );
    return (
      <>
        {showPinned && !query && pinned.length ? (
          <div className="ocm-pinned">
            <p className="ocm-side__label">
              <i className="bi bi-pin-angle" aria-hidden="true" /> Pinned
              <span className="tcc-mono"> {pinned.length}</span>
              <span className="tcc-mono ocm-faint"> of 3</span>
            </p>
            {pinned.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                caps={caps}
                pinned
                onReact={onReact}
                onReply={data.createPost}
                onAsk={onAsk}
              />
            ))}
          </div>
        ) : null}
        {filter === 'all' && !query ? (
          <Digest state={view.digest} onRetry={() => data.retry('digest')} />
        ) : null}
        {rows.length ? (
          rows.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              caps={caps}
              onReact={onReact}
              onReply={data.createPost}
              onAsk={onAsk}
            />
          ))
        ) : query ? (
          <Empty>No posts match your search.</Empty>
        ) : (
          <Empty
            action="New post"
            onAction={() => openComposer(filter.startsWith('team:') ? 'discussion' : filter)}
          >
            {filter.startsWith('team:')
              ? `No posts yet in ${filterName}.`
              : `No ${filterName} yet.`}
          </Empty>
        )}
      </>
    );
  })();

  const mainBody = (() => {
    if (tab === 'feed') return feedBody;
    if (tab === 'pitches')
      return <PitchList state={view.pitches} query={query} onRetry={() => data.retry('pitches')} />;
    if (tab === 'notes')
      return <NoteList state={view.notes} query={query} onRetry={() => data.retry('notes')} />;
    if (tab === 'mentions') {
      if (view.mentions.status === 'loading') return <RowsSkeleton rows={3} lead />;
      if (view.mentions.status === 'error')
        return (
          <SectionError
            message="Mentions could not be loaded."
            onRetry={() => data.retry('mentions')}
          />
        );
      if (!mentions.length) return <Empty>No one has mentioned you yet.</Empty>;
      return <MentionRows rows={mentions} now={now} />;
    }
    if (tab === 'inbox') {
      if (view.inbox.status === 'loading') return <RowsSkeleton rows={3} lead />;
      if (view.inbox.status === 'error')
        return (
          <SectionError
            message="The inbox could not be loaded."
            onRetry={() => data.retry('inbox')}
          />
        );
      return (
        <>
          {canMessage ? (
            <p className="ocm-tabline">
              <button type="button" className="ocm-act" onClick={() => setSendOpen(true)}>
                <i className="bi bi-send" aria-hidden="true" /> New message
              </button>
            </p>
          ) : null}
          {messages.length ? (
            <InboxRows rows={messages} now={now} onOpen={openMessage} openId={openMsg} />
          ) : (
            <Empty>Your council inbox is empty.</Empty>
          )}
        </>
      );
    }
    return <AcrossBody state={view.across} onRetry={() => data.retry('across')} full />;
  })();

  return (
    <div className="ocm-page dashboard-page-inset ez-canvas">
      <h1 className="tcc-sr">{councilName} community</h1>

      <div className="ocm-bar">
        <label className="ocm-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="tcc-sr">Search council posts, pitches, notes or members</span>
          <input
            type="search"
            className="ocm-search__input"
            placeholder="Search council posts, pitches, notes or members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="ocm-bar__actions">
          {sampleActive || data.sampleAvailable ? (
            <span className="ocm-sample">
              {sampleActive ? <span className="ocm-sample__label">Sample content</span> : null}
              {data.sampleAvailable ? (
                <button
                  type="button"
                  className="ocm-tb"
                  onClick={() => data.setShowSample(!sampleActive)}
                >
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              ) : null}
            </span>
          ) : null}
          <button type="button" className="ocm-tb" onClick={() => setTab('inbox')}>
            Messages
          </button>
          {rights.addEvent ? (
            <button type="button" className="ocm-tb" onClick={() => setDialog({ kind: 'event' })}>
              Add event
            </button>
          ) : null}
          {rights.announce ? (
            <button type="button" className="ocm-tb" onClick={() => openComposer('announcement')}>
              Announce
            </button>
          ) : null}
          <button type="button" className="tcc-btn" onClick={() => openComposer('discussion')}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New post
          </button>
        </div>
      </div>

      <KpiStrip view={view} feed={feed} upcoming={upcoming} now={now} />

      {roleLine ? (
        <p className="ocm-roleline">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            <strong>{roleLine[0]}</strong>
            {roleLine[1]}
          </span>
        </p>
      ) : null}

      <div className="ocm-cols">
        <div className="ocm-main">
          <div className="ocm-tabs" role="tablist" aria-label="Community views">
            {TABS.map((t) => {
              const count =
                t.key === 'mentions'
                  ? mentions.filter((m) => !m.seen).length
                  : t.key === 'inbox'
                    ? messages.filter((m) => !m.is_read).length
                    : 0;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`ocm-tab-${t.key}`}
                  aria-selected={tab === t.key}
                  aria-controls="ocm-panel"
                  className={`ocm-tab${tab === t.key ? ' is-on' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {count ? <span className="ocm-tab__n tcc-mono">{count}</span> : null}
                </button>
              );
            })}
          </div>
          {tab === 'feed' ? (
            <div className="ocm-filters tcc-toggles" role="group" aria-label="Filter the feed">
              <TextToggle pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All council
              </TextToggle>
              {teams.map((t) => (
                <TextToggle
                  key={t.id}
                  pressed={filter === `team:${t.id}`}
                  onClick={() => setFilter(`team:${t.id}`)}
                >
                  {t.name}
                </TextToggle>
              ))}
              {TYPE_FILTERS.map((f) => (
                <TextToggle key={f.key} pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}
                </TextToggle>
              ))}
            </div>
          ) : null}
          <div
            id="ocm-panel"
            role="tabpanel"
            aria-labelledby={`ocm-tab-${tab}`}
            className="ocm-panel"
            aria-busy={view[tab === 'feed' ? 'feed' : tab]?.status === 'loading' || undefined}
          >
            {mainBody}
          </div>
          {sampleActive ? (
            <p className="ocm-foot">
              Sample content only. Names, figures and dates are invented, and nothing done to them
              is saved.
            </p>
          ) : null}
        </div>
        <span className="ocm-vrule" aria-hidden="true" />
        {side}
      </div>

      {dialog?.kind === 'new' || dialog?.kind === 'edit' ? (
        <PostDialog
          mode={dialog.kind}
          post={dialog.post || null}
          initialType={dialog.type}
          teams={teams}
          rights={rights}
          caps={caps}
          sample={sampleActive}
          onCreate={data.createPost}
          onEdit={(body) => data.changePost(dialog.post.id, 'edit', body)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'event' && rights.addEvent ? (
        <EventDialog
          teams={teams}
          sample={sampleActive}
          onSubmit={data.addEvent}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'delete' || dialog?.kind === 'remove' ? (
        <ConfirmPostDialog
          kind={dialog.kind}
          post={dialog.post}
          sample={sampleActive}
          onConfirm={() => data.changePost(dialog.post.id, dialog.kind)}
          onClose={closeDialog}
        />
      ) : null}
      {sendOpen ? <OrgSendToTeamModal onClose={() => setSendOpen(false)} /> : null}

      <div className="ocm-toast" role="status" aria-live="polite">
        {toast ? <span className="ocm-toast__msg">{toast}</span> : null}
      </div>
    </div>
  );
}
