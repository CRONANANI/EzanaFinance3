/**
 * Council Community (/community for council members, Nov 2026).
 *
 * The rules every council Community route enforces and the page draws from:
 * who may post, announce, pin, remove and add events; what a valid post,
 * reply, change and event look like; how stored rows become the feed; and
 * the small formatting helpers the page shares. The routes call the decide*
 * functions before every write, and RLS stays the gate underneath.
 *
 * Posts today are text, a type and an optional team tag. Replies, titles,
 * tickers, author edit and delete, executive remove and pinning arrive with
 * the database change in docs/redesigns/org-community/sql.md. Until it is
 * applied the loader reports those capabilities as off and the page shows
 * the controls as "not available yet" instead of failing.
 *
 * Pure: no React, no fetch, no server imports.
 */

export const NA = 'N/A';
export const MANAGER_ROLES = ['executive', 'portfolio_manager'];
export const POST_TYPES = ['discussion', 'question', 'update', 'announcement'];
export const TYPE_LABEL = {
  discussion: 'Discussion',
  question: 'Question',
  update: 'Update',
  announcement: 'Announcement',
};
export const TYPE_ICON = {
  discussion: 'bi-chat-left-text',
  question: 'bi-question-circle',
  update: 'bi-arrow-repeat',
  announcement: 'bi-megaphone',
};
export const EVENT_TYPES = ['meeting', 'presentation', 'deadline', 'review', 'other'];
export const EVENT_LABEL = {
  meeting: 'Meeting',
  presentation: 'Presentation',
  deadline: 'Deadline',
  review: 'Review',
  other: 'Other',
};
export const MAX_PINS = 3;
export const MAX_POST = 2000;
export const MAX_REPLY = 1000;
export const MAX_TITLE = 140;
export const MAX_EVENT_TITLE = 140;
export const MAX_EVENT_DESC = 1000;

/* Reactions are stored in the shared council reactions table, keyed by a
   character, and drawn as Bootstrap icons with a mono count. */
export const REACTIONS = [
  { key: 'like', stored: '\u{1F44D}', icon: 'bi-hand-thumbs-up', label: 'Like' },
  { key: 'idea', stored: '\u{1F4A1}', icon: 'bi-lightbulb', label: 'Useful' },
];
const REACTION_BY_STORED = new Map(REACTIONS.map((r) => [r.stored, r]));
export const reactionByKey = (k) => REACTIONS.find((r) => r.key === k) || null;

/* Pitch stages that are still taking feedback (before the vote decides). */
export const OPEN_PITCH_STAGES = [
  'idea',
  'screening',
  'deep_dive',
  'cross_desk_review',
  'pitch_scheduled',
  'ic_vote',
];

/* Capabilities that need the database change. All off until it is applied. */
export const NO_EXTRAS = Object.freeze({
  replies: false,
  titles: false,
  tickers: false,
  pinning: false,
  editing: false,
  removal: false,
});
export const ALL_EXTRAS = Object.freeze({
  replies: true,
  titles: true,
  tickers: true,
  pinning: true,
  editing: true,
  removal: true,
});

export const BASE_POST_COLUMNS = 'id, org_id, team_id, author_id, content, post_type, created_at';
export const EXTRA_POST_COLUMNS = 'parent_id, title, ticker, pinned_at, pinned_by, edited_at';

/** PostgREST / Postgres "column does not exist" (before the change is applied). */
export function isMissingColumn(error) {
  if (!error) return false;
  return error.code === '42703' || error.code === 'PGRST204';
}

/* ── Roles ──────────────────────────────────────────────────────────────── */

export const isManager = (m) => Boolean(m && MANAGER_ROLES.includes(m.role));
export const isExecutive = (m) => Boolean(m && m.role === 'executive');
export const isAdvisor = (m) => isExecutive(m) && /faculty\s*advisor/i.test(String(m?.title || ''));

/** What the viewer may do on the page. The routes check every one again. */
export function viewerRights(member, caps = NO_EXTRAS) {
  const active = Boolean(member && member.is_active !== false);
  return {
    post: active,
    announce: active && isManager(member),
    pin: active && isExecutive(member) && Boolean(caps.pinning),
    remove: active && isExecutive(member) && Boolean(caps.removal),
    addEvent: active && isManager(member),
    /* Shown, but "not available yet", until the change is applied. */
    pinPending: active && isExecutive(member) && !caps.pinning,
    removePending: active && isExecutive(member) && !caps.removal,
  };
}

export function roleLabel(m) {
  if (!m) return 'Member';
  if (isAdvisor(m)) return 'Faculty advisor';
  if (m.sub_role) {
    const t = String(m.sub_role)
      .replace(/\bPM\b/, 'portfolio manager')
      .toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (m.role === 'executive') return 'Executive';
  if (m.role === 'portfolio_manager') return 'Portfolio manager';
  if (m.role === 'analyst') return 'Analyst';
  return 'Member';
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'M';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

/* ── Validation ─────────────────────────────────────────────────────────── */

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const refuse = (status, error) => ({ ok: false, status, error });

const clean = (v) =>
  typeof v === 'string'
    ? v
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
        .trim()
    : '';

export function normalizeTicker(v) {
  const t = clean(v).toUpperCase().replace(/^\$/, '');
  return t || null;
}

/**
 * Decide a new post or reply.
 * @param {object} member  the signed-in membership (role, org_id, user_id)
 * @param {object} body    { content, post_type, team_id, title, ticker, parent_id, pin }
 * @param {{ caps: object, teamIds: string[], parent?: object|null, pinnedCount?: number }} ctx
 * @returns {{ ok: true, row: object, pin: boolean } | { ok: false, status: number, error: string }}
 */
export function decidePost(member, body, ctx) {
  const caps = ctx?.caps || NO_EXTRAS;
  if (!member || member.is_active === false) return refuse(403, 'Not a council member.');
  const b = body && typeof body === 'object' ? body : {};
  const parentId = b.parent_id ? String(b.parent_id) : null;
  const isReply = Boolean(parentId);
  const content = clean(b.content);
  const limit = isReply ? MAX_REPLY : MAX_POST;

  if (isReply) {
    if (!caps.replies) return refuse(409, 'Replies are not available yet.');
    if (!UUID_RE.test(parentId) && !String(parentId).startsWith('sample-'))
      return refuse(400, 'Post not found.');
    const parent = ctx?.parent;
    if (!parent || parent.org_id !== member.org_id) return refuse(404, 'Post not found.');
    if (parent.parent_id) return refuse(400, 'Replies go on the post, not on another reply.');
  }
  if (!content) return refuse(400, isReply ? 'Write a reply first.' : 'Write something first.');
  if (content.length > limit) return refuse(400, `Keep it under ${limit} characters.`);

  const type = isReply ? 'discussion' : String(b.post_type || 'discussion');
  if (!POST_TYPES.includes(type)) return refuse(400, 'Choose a post type.');
  if (type === 'announcement' && !isManager(member))
    return refuse(403, 'Only executives and portfolio managers can post announcements.');

  let teamId = null;
  if (!isReply && b.team_id) {
    teamId = String(b.team_id);
    if (!(ctx?.teamIds || []).includes(teamId))
      return refuse(400, 'Choose one of your sector teams.');
  }

  const row = {
    org_id: member.org_id,
    author_id: member.user_id,
    content,
    post_type: type,
    team_id: teamId,
  };

  if (!isReply) {
    const title = clean(b.title);
    if (title) {
      if (!caps.titles) return refuse(409, 'Post titles are not available yet.');
      if (title.length > MAX_TITLE)
        return refuse(400, `Keep the title under ${MAX_TITLE} characters.`);
      row.title = title;
    }
    const ticker = normalizeTicker(b.ticker);
    if (ticker) {
      if (!caps.tickers) return refuse(409, 'Tickers on posts are not available yet.');
      if (!TICKER_RE.test(ticker)) return refuse(400, 'Enter one ticker, for example NVDA.');
      row.ticker = ticker;
    }
  } else {
    row.parent_id = parentId;
  }

  let pin = false;
  if (!isReply && b.pin) {
    if (!isExecutive(member)) return refuse(403, 'Only executives can pin posts.');
    if (!caps.pinning) return refuse(409, 'Pinning is not available yet.');
    if ((ctx?.pinnedCount || 0) >= MAX_PINS)
      return refuse(409, `Up to ${MAX_PINS} posts can be pinned. Unpin one first.`);
    pin = true;
  }
  return { ok: true, row, pin };
}

/**
 * Decide a change to an existing post.
 * action: 'edit' (author), 'delete' (author), 'remove' (executive),
 *         'pin' / 'unpin' (executive).
 */
export function decidePostChange(member, post, action, ctx = {}) {
  const caps = ctx.caps || NO_EXTRAS;
  if (!member || member.is_active === false) return refuse(403, 'Not a council member.');
  if (!post || post.org_id !== member.org_id) return refuse(404, 'Post not found.');
  const mine = post.author_id === member.user_id;

  if (action === 'edit') {
    if (!caps.editing) return refuse(409, 'Editing posts is not available yet.');
    if (!mine) return refuse(403, 'Only the author can edit a post.');
    const content = clean(ctx.body?.content);
    const limit = post.parent_id ? MAX_REPLY : MAX_POST;
    if (!content) return refuse(400, 'Write something first.');
    if (content.length > limit) return refuse(400, `Keep it under ${limit} characters.`);
    const patch = { content, edited_at: new Date(ctx.now ?? Date.now()).toISOString() };
    if (!post.parent_id && ctx.body && 'title' in ctx.body) {
      const title = clean(ctx.body.title);
      if (title.length > MAX_TITLE)
        return refuse(400, `Keep the title under ${MAX_TITLE} characters.`);
      patch.title = title || null;
    }
    return { ok: true, patch };
  }
  if (action === 'delete') {
    if (!caps.removal) return refuse(409, 'Deleting posts is not available yet.');
    if (!mine) return refuse(403, 'Only the author can delete a post.');
    return { ok: true };
  }
  if (action === 'remove') {
    if (!caps.removal) return refuse(409, 'Removing posts is not available yet.');
    if (!isExecutive(member)) return refuse(403, 'Only executives can remove posts.');
    return { ok: true };
  }
  if (action === 'pin' || action === 'unpin') {
    if (!caps.pinning) return refuse(409, 'Pinning is not available yet.');
    if (!isExecutive(member)) return refuse(403, 'Only executives can pin posts.');
    if (post.parent_id) return refuse(400, 'Replies cannot be pinned.');
    if (action === 'pin') {
      if (post.pinned_at) return { ok: true, patch: {} };
      if ((ctx.pinnedCount || 0) >= MAX_PINS)
        return refuse(409, `Up to ${MAX_PINS} posts can be pinned. Unpin one first.`);
      return {
        ok: true,
        patch: {
          pinned_at: new Date(ctx.now ?? Date.now()).toISOString(),
          pinned_by: member.user_id,
        },
      };
    }
    return { ok: true, patch: { pinned_at: null, pinned_by: null } };
  }
  return refuse(400, 'Unknown change.');
}

/**
 * Decide a new council event. Executives and portfolio managers (the
 * existing database rule for council events).
 */
export function decideEvent(member, body, ctx = {}) {
  if (!member || member.is_active === false) return refuse(403, 'Not a council member.');
  if (!isManager(member))
    return refuse(403, 'Only executives and portfolio managers can add events.');
  const b = body && typeof body === 'object' ? body : {};
  const title = clean(b.title);
  if (!title) return refuse(400, 'Give the event a title.');
  if (title.length > MAX_EVENT_TITLE)
    return refuse(400, `Keep the title under ${MAX_EVENT_TITLE} characters.`);
  const type = String(b.event_type || 'meeting');
  if (!EVENT_TYPES.includes(type)) return refuse(400, 'Choose an event type.');
  const when = Date.parse(String(b.event_date || ''));
  if (!Number.isFinite(when)) return refuse(400, 'Choose a date and time.');
  const now = ctx.now ?? Date.now();
  if (when < now - 86400000) return refuse(400, 'Choose a date that has not passed.');
  if (when > now + 400 * 86400000) return refuse(400, 'Choose a date within the next year.');
  const description = clean(b.description);
  if (description.length > MAX_EVENT_DESC)
    return refuse(400, `Keep the description under ${MAX_EVENT_DESC} characters.`);
  let teamId = null;
  if (b.team_id) {
    teamId = String(b.team_id);
    if (!(ctx.teamIds || []).includes(teamId))
      return refuse(400, 'Choose one of your sector teams.');
  }
  return {
    ok: true,
    row: {
      org_id: member.org_id,
      team_id: teamId,
      title,
      description: description || null,
      event_type: type,
      event_date: new Date(when).toISOString(),
      created_by: member.user_id,
    },
  };
}

/* ── Shaping ────────────────────────────────────────────────────────────── */

/** Reaction rows to { [postId]: { counts: {like, idea}, mine: [keys] } }. */
export function summarizeReactions(rows, viewerUserId) {
  const out = {};
  for (const r of rows || []) {
    const def = REACTION_BY_STORED.get(r.emoji);
    if (!def) continue;
    const slot = (out[r.target_id] ||= { counts: {}, mine: [] });
    slot.counts[def.key] = (slot.counts[def.key] || 0) + 1;
    if (r.user_id === viewerUserId && !slot.mine.includes(def.key)) slot.mine.push(def.key);
  }
  return out;
}

/**
 * Stored posts to the feed: top-level posts newest first, each with its
 * replies (oldest first), author, team, reactions and what the viewer may do.
 */
export function shapeFeed({ posts, members, teams, reactions, viewer, caps = NO_EXTRAS }) {
  const byUser = new Map((members || []).map((m) => [m.user_id, m]));
  const teamName = new Map((teams || []).map((t) => [t.id, t.name]));
  const react = reactions || {};
  const rights = viewerRights(viewer, caps);
  const shape = (p) => {
    const a = byUser.get(p.author_id) || null;
    const name = a?.display_name || 'Member';
    const mine = Boolean(viewer && p.author_id === viewer.user_id);
    return {
      id: p.id,
      authorId: p.author_id,
      authorName: name,
      authorInitials: initials(name),
      authorRole: a ? roleLabel(a) : 'Former member',
      type: POST_TYPES.includes(p.post_type) ? p.post_type : 'discussion',
      teamId: p.team_id || null,
      teamName: p.team_id ? teamName.get(p.team_id) || 'Team' : 'All council',
      title: p.title || null,
      ticker: p.ticker || null,
      content: p.content || '',
      createdAt: p.created_at,
      editedAt: p.edited_at || null,
      pinnedAt: p.pinned_at || null,
      reactions: react[p.id] || { counts: {}, mine: [] },
      mine,
      canEdit: mine && Boolean(caps.editing),
      canDelete: mine && Boolean(caps.removal),
      canRemove: !mine && rights.remove,
      canPin: rights.pin && !p.parent_id,
      isDemo: Boolean(p.is_demo),
    };
  };
  const all = posts || [];
  const replies = new Map();
  for (const p of all) {
    if (!p.parent_id) continue;
    if (!replies.has(p.parent_id)) replies.set(p.parent_id, []);
    replies.get(p.parent_id).push(p);
  }
  const top = all
    .filter((p) => !p.parent_id)
    .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  return top.map((p) => ({
    ...shape(p),
    replies: (replies.get(p.id) || [])
      .sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)))
      .map(shape),
  }));
}

/** Filter keys: 'all', 'team:<id>', 'announcement', 'question', 'update', 'discussion'. */
export function filterFeed(feed, filter, query = '') {
  let rows = feed || [];
  if (filter && filter !== 'all') {
    if (filter.startsWith('team:')) {
      const id = filter.slice(5);
      rows = rows.filter((p) => p.teamId === id);
    } else rows = rows.filter((p) => p.type === filter);
  }
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (q)
    rows = rows.filter((p) =>
      [p.title, p.content, p.authorName, p.ticker, p.teamName]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  return rows;
}

export const pinnedOf = (feed) =>
  (feed || [])
    .filter((p) => p.pinnedAt)
    .sort((a, b) => String(b.pinnedAt).localeCompare(String(a.pinnedAt)));

/** One "Coming up" list from council events and scheduled meetings. */
export function comingUp({ events, meetings, teams, now = Date.now(), horizonDays = 60 }) {
  const teamName = new Map((teams || []).map((t) => [t.id, t.name]));
  const from = now - 2 * 3600000;
  const to = now + horizonDays * 86400000;
  const items = [];
  for (const e of events || []) {
    const t = Date.parse(e.event_date);
    if (!Number.isFinite(t) || t < from || t > to) continue;
    items.push({
      id: `evt-${e.id}`,
      kind: 'event',
      type: EVENT_TYPES.includes(e.event_type) ? e.event_type : 'other',
      title: e.title || 'Event',
      date: new Date(t).toISOString(),
      team: e.team_id ? teamName.get(e.team_id) || 'Team' : 'All council',
      description: e.description || null,
      href: null,
      isDemo: Boolean(e.is_demo),
    });
  }
  for (const m of meetings || []) {
    if (m.status === 'closed' || m.status === 'cancelled') continue;
    const t = Date.parse(m.scheduled_at);
    if (!Number.isFinite(t) || t < from || t > to) continue;
    items.push({
      id: `mtg-${m.id}`,
      kind: 'meeting',
      type: 'meeting',
      title: m.title || 'Meeting',
      date: new Date(t).toISOString(),
      team: m.team_id ? teamName.get(m.team_id) || 'Team' : 'All council',
      description: m.location || null,
      href: '/org-team-hub/meetings',
      isDemo: Boolean(m.is_demo),
    });
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return items;
}

/** Where a mention was made, in words, and where it leads. */
export function describeMention(m) {
  const t = m.target_type;
  if (t === 'thread')
    return {
      where: m.ticker ? `In a position discussion on ${m.ticker}` : 'In a position discussion',
      href: '/org-trading',
    };
  if (t === 'pitch')
    return {
      where: m.ticker ? `In the ${m.ticker} pitch discussion` : 'In a pitch discussion',
      href: `/org-team-hub/pitches?pitch=${encodeURIComponent(m.target_id)}`,
    };
  if (t === 'note')
    return {
      where: 'On a research note',
      href: `/org-team-hub/research-library?d=${encodeURIComponent(m.target_id)}`,
    };
  if (t === 'post') return { where: 'In a council post', href: null };
  return { where: 'In the council', href: null };
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

/** "Nov 14, 16:41" (local time). */
export function fmtStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** "Nov 14". */
export function fmtDay(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
/** "Tue, Nov 18, 17:30". */
export function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** "2h ago" within a day, else the day. */
export function fmtAgo(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return NA;
  const mins = Math.round((now - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return fmtDay(iso);
}
export function fmtMoney(v) {
  if (v == null || !Number.isFinite(Number(v))) return NA;
  return Number(v).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function fmtSignedPct(v) {
  if (v == null || !Number.isFinite(Number(v))) return NA;
  const n = Number(v);
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2)}%`;
}
export const fmtCount = (v) => (v == null || !Number.isFinite(Number(v)) ? NA : String(v));

/* ── Sample content: actions applied on the page only ───────────────────── */

let sampleSeq = 0;
const sampleId = (p) => `sample-${p}-local-${Date.now().toString(36)}-${(sampleSeq += 1)}`;

/**
 * Apply an action to the sample bundle with the same rules the routes use.
 * Nothing is sent anywhere. Returns { ok, bundle } or { ok: false, error }.
 */
export function applySampleAction(bundle, action, { viewer, now = Date.now() } = {}) {
  const caps = ALL_EXTRAS;
  const teamIds = (bundle.teams || []).map((t) => t.id);
  const posts = bundle.posts || [];
  const find = (id) => posts.find((p) => p.id === id) || null;
  const pinnedCount = posts.filter((p) => p.pinned_at && !p.parent_id).length;
  const me = { ...viewer, org_id: 'sample', is_active: true };

  if (action.type === 'post') {
    const parent = action.body?.parent_id ? find(action.body.parent_id) : null;
    const d = decidePost(me, action.body, {
      caps,
      teamIds,
      parent: parent ? { ...parent, org_id: 'sample' } : null,
      pinnedCount,
    });
    if (!d.ok) return d;
    const row = {
      ...d.row,
      org_id: 'sample',
      id: sampleId('post'),
      created_at: new Date(now).toISOString(),
      pinned_at: d.pin ? new Date(now).toISOString() : null,
      is_demo: true,
    };
    return { ok: true, bundle: { ...bundle, posts: [row, ...posts] } };
  }
  if (['edit', 'delete', 'remove', 'pin', 'unpin'].includes(action.type)) {
    const post = find(action.id);
    const d = decidePostChange(me, post ? { ...post, org_id: 'sample' } : null, action.type, {
      caps,
      pinnedCount,
      body: action.body,
      now,
    });
    if (!d.ok) return d;
    if (action.type === 'delete' || action.type === 'remove') {
      const gone = new Set([
        action.id,
        ...posts.filter((p) => p.parent_id === action.id).map((p) => p.id),
      ]);
      return { ok: true, bundle: { ...bundle, posts: posts.filter((p) => !gone.has(p.id)) } };
    }
    return {
      ok: true,
      bundle: {
        ...bundle,
        posts: posts.map((p) => (p.id === action.id ? { ...p, ...d.patch } : p)),
      },
    };
  }
  if (action.type === 'react') {
    const def = reactionByKey(action.key);
    if (!def || !find(action.id)) return refuse(400, 'Unknown reaction.');
    const rows = bundle.reactions || [];
    const has = rows.some(
      (r) => r.target_id === action.id && r.user_id === viewer.user_id && r.emoji === def.stored,
    );
    const next = has
      ? rows.filter(
          (r) =>
            !(r.target_id === action.id && r.user_id === viewer.user_id && r.emoji === def.stored),
        )
      : [...rows, { target_id: action.id, user_id: viewer.user_id, emoji: def.stored }];
    return { ok: true, bundle: { ...bundle, reactions: next } };
  }
  if (action.type === 'event') {
    const d = decideEvent(me, action.body, { teamIds, now });
    if (!d.ok) return d;
    const row = { ...d.row, id: sampleId('event'), is_demo: true };
    return { ok: true, bundle: { ...bundle, events: [...(bundle.events || []), row] } };
  }
  if (action.type === 'mentions-seen') {
    const ids = new Set(action.ids || []);
    return {
      ok: true,
      bundle: {
        ...bundle,
        mentions: (bundle.mentions || []).map((m) => (ids.has(m.id) ? { ...m, seen: true } : m)),
      },
    };
  }
  if (action.type === 'message-read') {
    return {
      ok: true,
      bundle: {
        ...bundle,
        inbox: (bundle.inbox || []).map((m) => (m.id === action.id ? { ...m, is_read: true } : m)),
      },
    };
  }
  return refuse(400, 'Unknown action.');
}
