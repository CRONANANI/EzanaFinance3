/**
 * Server reads and writes for the council Community (/community for council
 * members). Every function takes the signed-in member's own Supabase client
 * (getUserClient) and the resolved membership, so row level security stays
 * the gate: nothing here uses the service role. Each section loads on its
 * own and returns { error } instead of throwing, so the page can fail one
 * section at a time.
 *
 * Rules live in src/lib/org-community-model.js; routes stay thin.
 */
import {
  ALL_EXTRAS,
  BASE_POST_COLUMNS,
  EXTRA_POST_COLUMNS,
  NO_EXTRAS,
  OPEN_PITCH_STAGES,
  decideEvent,
  decidePost,
  decidePostChange,
  isMissingColumn,
  viewerRights,
} from './org-community-model.js';
import { fetchPitches } from './org-pitch-api-helpers.js';
import { getOrgPositionBook, bookTotals } from './org-position-book.js';
import { loadCompetitions } from './competitions/loaders.js';
import { rankRows } from './council-rankings-model.js';

const FEED_LIMIT = 200;
const NOT_AVAILABLE = 'This is not available yet. Nothing was changed.';

/* ── Directory ──────────────────────────────────────────────────────────── */

export async function loadDirectory(supabase, orgId) {
  const [mRes, tRes] = await Promise.all([
    supabase
      .from('org_members')
      .select('id, user_id, display_name, role, sub_role, title, team_id, is_active')
      .eq('org_id', orgId),
    supabase.from('org_teams').select('id, name').eq('org_id', orgId).order('name'),
  ]);
  if (mRes.error || tRes.error) return { error: 'directory' };
  return { members: mRes.data || [], teams: tRes.data || [] };
}

/* ── Posts ──────────────────────────────────────────────────────────────── */

/**
 * Read the council's posts. Tries the columns the database change adds; when
 * they do not exist yet, reads the original columns and reports every extra
 * capability as off.
 */
export async function readPosts(supabase, orgId, { limit = FEED_LIMIT } = {}) {
  const run = (cols) =>
    supabase
      .from('org_posts')
      .select(cols)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);
  let res = await run(`${BASE_POST_COLUMNS}, ${EXTRA_POST_COLUMNS}`);
  let caps = ALL_EXTRAS;
  if (isMissingColumn(res.error)) {
    res = await run(BASE_POST_COLUMNS);
    caps = NO_EXTRAS;
  }
  if (res.error) return { error: 'posts' };
  return { posts: res.data || [], caps };
}

/** Detect the capabilities alone (for write routes). */
export async function postCapabilities(supabase, orgId) {
  const { error } = await supabase
    .from('org_posts')
    .select(`id, ${EXTRA_POST_COLUMNS}`)
    .eq('org_id', orgId)
    .limit(1);
  if (isMissingColumn(error)) return NO_EXTRAS;
  if (error) return null;
  return ALL_EXTRAS;
}

export async function loadFeed(supabase, member) {
  const [postsRes, dir] = await Promise.all([
    readPosts(supabase, member.org_id),
    loadDirectory(supabase, member.org_id),
  ]);
  if (postsRes.error || dir.error) return { error: 'feed' };
  const ids = postsRes.posts.map((p) => p.id);
  let reactions = [];
  if (ids.length) {
    const { data, error } = await supabase
      .from('org_reactions')
      .select('target_id, user_id, emoji')
      .eq('org_id', member.org_id)
      .eq('target_type', 'post')
      .in('target_id', ids);
    if (!error) reactions = data || [];
  }
  return {
    payload: {
      posts: postsRes.posts,
      reactions,
      members: dir.members,
      teams: dir.teams,
      caps: postsRes.caps,
      rights: viewerRights(member, postsRes.caps),
      viewer: viewerOf(member),
    },
  };
}

export function viewerOf(member) {
  return {
    id: member.id,
    user_id: member.user_id,
    org_id: member.org_id,
    role: member.role,
    sub_role: member.sub_role || null,
    title: member.title || null,
    display_name: member.display_name || null,
    is_active: member.is_active !== false,
  };
}

async function pinnedCount(supabase, orgId) {
  const { count, error } = await supabase
    .from('org_posts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .is('parent_id', null)
    .not('pinned_at', 'is', null);
  return error ? 0 : count || 0;
}

/** Create a post or reply. Returns { status, body }. */
export async function createPost(supabase, member, body) {
  const caps = await postCapabilities(supabase, member.org_id);
  if (!caps) return { status: 500, body: { error: 'Could not read council posts.' } };

  const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', member.org_id);
  let parent = null;
  if (body?.parent_id && caps.replies) {
    const { data } = await supabase
      .from('org_posts')
      .select('id, org_id, parent_id')
      .eq('id', String(body.parent_id))
      .maybeSingle();
    parent = data || null;
  }
  const pins = body?.pin && caps.pinning ? await pinnedCount(supabase, member.org_id) : 0;
  const d = decidePost(member, body, {
    caps,
    teamIds: (teams || []).map((t) => t.id),
    parent,
    pinnedCount: pins,
  });
  if (!d.ok)
    return {
      status: d.status,
      body: { error: d.error, code: d.status === 409 ? 'not_available' : undefined },
    };

  const row = { ...d.row };
  if (d.pin) {
    row.pinned_at = new Date().toISOString();
    row.pinned_by = member.user_id;
  }
  const cols =
    caps === NO_EXTRAS ? BASE_POST_COLUMNS : `${BASE_POST_COLUMNS}, ${EXTRA_POST_COLUMNS}`;
  const { data, error } = await supabase.from('org_posts').insert(row).select(cols).single();
  if (error) {
    /* A database rule refused it (for example the pin limit or the
       announcement rule from the change). Say so without the raw message. */
    if (error.code === '42501')
      return { status: 403, body: { error: 'Your role cannot post this. Nothing was saved.' } };
    if (error.code === 'P0001')
      return { status: 409, body: { error: 'Up to 3 posts can be pinned. Nothing was saved.' } };
    return { status: 500, body: { error: 'The post could not be saved.' } };
  }
  return { status: 200, body: { post: data } };
}

/**
 * Edit, delete, remove, pin or unpin. When the database change is not applied
 * (no column, or no rule allowing the write, which leaves zero rows changed)
 * the answer is 409 "not available yet".
 */
export async function changePost(supabase, member, id, action, body) {
  const caps = await postCapabilities(supabase, member.org_id);
  if (!caps) return { status: 500, body: { error: 'Could not read council posts.' } };
  const cols =
    caps === NO_EXTRAS ? BASE_POST_COLUMNS : `${BASE_POST_COLUMNS}, ${EXTRA_POST_COLUMNS}`;
  const { data: post, error: readErr } = await supabase
    .from('org_posts')
    .select(cols)
    .eq('id', id)
    .maybeSingle();
  if (readErr) return { status: 500, body: { error: 'Could not read the post.' } };
  const pins = action === 'pin' && caps.pinning ? await pinnedCount(supabase, member.org_id) : 0;
  const d = decidePostChange(member, post, action, { caps, pinnedCount: pins, body });
  if (!d.ok)
    return {
      status: d.status,
      body: { error: d.error, code: d.status === 409 ? 'not_available' : undefined },
    };

  if (action === 'delete' || action === 'remove') {
    let q = supabase.from('org_posts').delete().eq('id', id).eq('org_id', member.org_id);
    if (action === 'delete') q = q.eq('author_id', member.user_id);
    const { data, error } = await q.select('id');
    if (error) return { status: 500, body: { error: 'The post could not be removed.' } };
    if (!data || data.length === 0)
      return { status: 409, body: { error: NOT_AVAILABLE, code: 'not_available' } };
    return { status: 200, body: { ok: true, id } };
  }

  if (!d.patch || Object.keys(d.patch).length === 0) return { status: 200, body: { post } };
  let q = supabase.from('org_posts').update(d.patch).eq('id', id).eq('org_id', member.org_id);
  if (action === 'edit') q = q.eq('author_id', member.user_id);
  const { data, error } = await q.select(cols);
  if (error) {
    if (error.code === 'P0001')
      return { status: 409, body: { error: 'Up to 3 posts can be pinned. Nothing was changed.' } };
    return { status: 500, body: { error: 'The post could not be changed.' } };
  }
  if (!data || data.length === 0)
    return { status: 409, body: { error: NOT_AVAILABLE, code: 'not_available' } };
  return { status: 200, body: { post: data[0] } };
}

/* ── Coming up ──────────────────────────────────────────────────────────── */

export async function loadComingUp(supabase, member, now = Date.now()) {
  const since = new Date(now - 2 * 3600000).toISOString();
  const [eRes, mRes, tRes] = await Promise.all([
    supabase
      .from('org_events')
      .select('id, team_id, title, description, event_type, event_date, created_by')
      .eq('org_id', member.org_id)
      .gte('event_date', since)
      .order('event_date', { ascending: true })
      .limit(50),
    supabase
      .from('org_meetings')
      .select('id, title, status, scheduled_at, team_id, location')
      .eq('org_id', member.org_id)
      .gte('scheduled_at', since)
      .order('scheduled_at', { ascending: true })
      .limit(50),
    supabase.from('org_teams').select('id, name').eq('org_id', member.org_id),
  ]);
  if (eRes.error && mRes.error) return { error: 'events' };
  return {
    payload: {
      events: eRes.error ? [] : eRes.data || [],
      meetings: mRes.error ? [] : mRes.data || [],
      teams: tRes.data || [],
      partial: Boolean(eRes.error || mRes.error),
      canAdd: viewerRights(member).addEvent,
    },
  };
}

export async function createEvent(supabase, member, body) {
  const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', member.org_id);
  const d = decideEvent(member, body, { teamIds: (teams || []).map((t) => t.id) });
  if (!d.ok) return { status: d.status, body: { error: d.error } };
  const { data, error } = await supabase
    .from('org_events')
    .insert(d.row)
    .select('id, team_id, title, description, event_type, event_date, created_by')
    .single();
  if (error) {
    if (error.code === '42501')
      return { status: 403, body: { error: 'Your role cannot add events. Nothing was saved.' } };
    return { status: 500, body: { error: 'The event could not be saved.' } };
  }
  return { status: 200, body: { event: data } };
}

/* ── Mentions and inbox ─────────────────────────────────────────────────── */

export async function loadMentions(supabase, member) {
  const { data, error } = await supabase
    .from('org_mentions')
    .select('id, author_id, target_type, target_id, seen, created_at')
    .eq('mentioned_user_id', member.user_id)
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return { error: 'mentions' };
  const rows = data || [];
  const authorIds = [...new Set(rows.map((m) => m.author_id))];
  const threadIds = rows.filter((m) => m.target_type === 'thread').map((m) => m.target_id);
  const pitchIds = rows.filter((m) => m.target_type === 'pitch').map((m) => m.target_id);
  const [aRes, thRes, pRes] = await Promise.all([
    authorIds.length
      ? supabase
          .from('org_members')
          .select('user_id, display_name')
          .eq('org_id', member.org_id)
          .in('user_id', authorIds)
      : { data: [] },
    threadIds.length
      ? supabase.from('org_position_threads').select('id, ticker').in('id', threadIds)
      : { data: [] },
    pitchIds.length
      ? supabase.from('org_pitches').select('id, ticker').in('id', pitchIds)
      : { data: [] },
  ]);
  const names = new Map((aRes.data || []).map((m) => [m.user_id, m.display_name]));
  const tickers = new Map(
    [...(thRes.data || []), ...(pRes.data || [])].map((r) => [r.id, r.ticker]),
  );
  return {
    payload: {
      mentions: rows.map((m) => ({
        ...m,
        author_name: names.get(m.author_id) || 'Member',
        ticker: tickers.get(m.target_id) || null,
      })),
    },
  };
}

export async function loadInbox(supabase, member) {
  const { data, error } = await supabase
    .from('org_direct_messages')
    .select(
      'id, sender_member_id, subject, body, is_read, attachment_kind, attachment_label, created_at',
    )
    .eq('org_id', member.org_id)
    .eq('recipient_member_id', member.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return { error: 'inbox' };
  const rows = data || [];
  const senderIds = [...new Set(rows.map((m) => m.sender_member_id))];
  const { data: senders } = senderIds.length
    ? await supabase.from('org_members').select('id, display_name').in('id', senderIds)
    : { data: [] };
  const names = new Map((senders || []).map((s) => [s.id, s.display_name]));
  return {
    payload: {
      messages: rows.map((m) => ({ ...m, sender_name: names.get(m.sender_member_id) || 'Member' })),
    },
  };
}

/* ── Recognition ────────────────────────────────────────────────────────── */

export async function loadRecognition(supabase, member) {
  const { data, error } = await supabase
    .from('org_recognition')
    .select(
      'id, recipient_id, awarded_by, badge_type, title, reason, period, is_award, auto_generated, created_at',
    )
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) return { error: 'recognition' };
  const rows = data || [];
  const ids = [...new Set(rows.flatMap((r) => [r.recipient_id, r.awarded_by]).filter(Boolean))];
  const { data: people } = ids.length
    ? await supabase
        .from('org_members')
        .select('user_id, display_name')
        .eq('org_id', member.org_id)
        .in('user_id', ids)
    : { data: [] };
  const names = new Map((people || []).map((p) => [p.user_id, p.display_name]));
  return {
    payload: {
      awards: rows.map((r) => ({
        ...r,
        recipient_name: names.get(r.recipient_id) || 'Member',
        giver_name: r.auto_generated ? null : names.get(r.awarded_by) || null,
      })),
    },
  };
}

/* ── Pitches and research shared for feedback ───────────────────────────── */

export async function loadOpenPitches(supabase, member) {
  const rows = await fetchPitches(supabase, member.org_id, { statuses: ['active'] });
  const open = (rows || []).filter((p) => OPEN_PITCH_STAGES.includes(p.stage));
  const ids = open.map((p) => p.id);
  const [dir, dRes] = await Promise.all([
    loadDirectory(supabase, member.org_id),
    ids.length
      ? supabase.from('org_pitch_discussion_messages').select('pitch_id').in('pitch_id', ids)
      : { data: [] },
  ]);
  if (dir.error) return { error: 'pitches' };
  const byMember = new Map(dir.members.map((m) => [m.id, m.display_name]));
  const teamName = new Map(dir.teams.map((t) => [t.id, t.name]));
  const comments = {};
  for (const r of dRes.data || []) comments[r.pitch_id] = (comments[r.pitch_id] || 0) + 1;
  return {
    payload: {
      pitches: open.map((p) => ({
        id: p.id,
        ticker: p.ticker,
        company_name: p.company_name || null,
        stage: p.stage,
        analyst_name: byMember.get(p.analyst_member_id) || 'Unassigned',
        team_id: p.team_id || null,
        team_name: p.team_id ? teamName.get(p.team_id) || null : null,
        created_at: p.created_at,
        stage_entered_at: p.stage_entered_at || p.created_at,
        comments: dRes.error ? null : comments[p.id] || 0,
      })),
    },
  };
}

export async function loadNotes(supabase, member) {
  const { data, error } = await supabase
    .from('org_research_notes')
    .select(
      'id, author_id, title, ticker, sector, team_id, status, visibility, view_count, published_at, created_at',
    )
    .eq('org_id', member.org_id)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) return { error: 'notes' };
  const rows = data || [];
  const ids = rows.map((n) => n.id);
  const authorIds = [...new Set(rows.map((n) => n.author_id))];
  const [cRes, aRes] = await Promise.all([
    ids.length
      ? supabase.from('org_research_comments').select('note_id').in('note_id', ids)
      : { data: [] },
    authorIds.length
      ? supabase
          .from('org_members')
          .select('user_id, display_name')
          .eq('org_id', member.org_id)
          .in('user_id', authorIds)
      : { data: [] },
  ]);
  const comments = {};
  for (const r of cRes.data || []) comments[r.note_id] = (comments[r.note_id] || 0) + 1;
  const names = new Map((aRes.data || []).map((m) => [m.user_id, m.display_name]));
  return {
    payload: {
      notes: rows.map((n) => ({
        ...n,
        author_name: names.get(n.author_id) || 'Member',
        comments: cRes.error ? null : comments[n.id] || 0,
      })),
    },
  };
}

/* ── The council and the councils around it ─────────────────────────────── */

export async function loadCouncil(supabase, member) {
  const [book, mRes] = await Promise.all([
    getOrgPositionBook(supabase, member.org_id).catch(() => null),
    supabase
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', member.org_id)
      .eq('is_active', true),
  ]);
  if (mRes.error) return { error: 'council' };
  let fund = null;
  if (Array.isArray(book) && book.length) {
    const t = bookTotals(book);
    fund = {
      value: t.value,
      returnPct: t.cost > 0 ? (t.value / t.cost - 1) * 100 : null,
      positions: book.length,
    };
  }
  return { payload: { members: mRes.count ?? null, fund } };
}

const LIVE_COMPETITION = ['open', 'in_progress', 'judging'];

export async function loadAcross(supabase, member) {
  const { data: elo, error } = await supabase
    .from('council_elo')
    .select('org_id, current_rating, tier, competition_rating, fund_rating')
    .order('current_rating', { ascending: false })
    .limit(200);
  if (error) return { error: 'across' };
  const ids = (elo || []).map((r) => r.org_id);
  const [oRes, comps] = await Promise.all([
    ids.length
      ? supabase.from('organizations').select('id, name, university_name').in('id', ids)
      : { data: [] },
    loadCompetitions(supabase, member.org_id),
  ]);
  const names = new Map(
    (oRes.data || []).map((o) => [o.id, o.university_name || o.name || 'Council']),
  );
  const ranked = rankRows(
    (elo || []).map((r) => ({
      orgId: r.org_id,
      name: names.get(r.org_id) || 'Council',
      tier: r.tier,
      rating: r.current_rating,
      comp: r.competition_rating,
      fund: r.fund_rating,
    })),
    'overall',
  );
  return {
    payload: {
      myOrgId: member.org_id,
      rows: ranked.slice(0, 50),
      total: ranked.length,
      competitions: (comps || [])
        .filter((c) => LIVE_COMPETITION.includes(c.status))
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          starts_at: c.starts_at,
          ends_at: c.ends_at,
          isHost: c.isHost,
        })),
    },
  };
}

export const SECTIONS = {
  feed: loadFeed,
  events: loadComingUp,
  mentions: loadMentions,
  inbox: loadInbox,
  recognition: loadRecognition,
  pitches: loadOpenPitches,
  notes: loadNotes,
  council: loadCouncil,
  across: loadAcross,
};
