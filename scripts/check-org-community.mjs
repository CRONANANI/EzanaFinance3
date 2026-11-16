/**
 * Council Community (Nov 2026): /community for council members. The rules
 * the post, change and event routes enforce, the feed shaping, the
 * "not available yet" detection before the database change, the sample
 * bundle, and the server check that keeps council members out of the
 * public retail community.
 *   npm run test:org-community
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  ALL_EXTRAS,
  MAX_PINS,
  NO_EXTRAS,
  REACTIONS,
  applySampleAction,
  comingUp,
  decideEvent,
  decidePost,
  decidePostChange,
  filterFeed,
  roleLabel,
  shapeFeed,
  summarizeReactions,
  viewerRights,
} from '../src/lib/org-community-model.js';
import { buildCommunitySample } from '../src/lib/org-community-sample.js';
import {
  COUNCIL_POSTING_ERROR,
  councilMemberPostingRefusal,
} from '../src/lib/community/council-member-gate.js';
import { changePost, createPost, readPosts } from '../src/lib/org-community-server.js';

const ORG = 'org-1';
const exec = { id: 'm-ex', user_id: 'u-ex', org_id: ORG, role: 'executive', is_active: true };
const advisor = { ...exec, id: 'm-adv', user_id: 'u-adv', title: 'Faculty Advisor' };
const pm = {
  id: 'm-pm',
  user_id: 'u-pm',
  org_id: ORG,
  role: 'portfolio_manager',
  sub_role: 'PM',
  is_active: true,
};
const an = {
  id: 'm-an',
  user_id: 'u-an',
  org_id: ORG,
  role: 'analyst',
  sub_role: 'Analyst',
  is_active: true,
};
const teamIds = ['t-1', 't-2'];
const ok = (r) => assert.equal(r.ok, true, r.error);
const refused = (r, status) => {
  assert.equal(r.ok, false);
  assert.equal(r.status, status, r.error);
};

test('every active member posts; announcements are for executives and portfolio managers', () => {
  ok(
    decidePost(
      an,
      { content: 'Hello council', post_type: 'question' },
      { caps: NO_EXTRAS, teamIds },
    ),
  );
  refused(
    decidePost(
      an,
      { content: 'Big news', post_type: 'announcement' },
      { caps: NO_EXTRAS, teamIds },
    ),
    403,
  );
  ok(
    decidePost(
      pm,
      { content: 'Big news', post_type: 'announcement' },
      { caps: NO_EXTRAS, teamIds },
    ),
  );
  ok(
    decidePost(
      exec,
      { content: 'Big news', post_type: 'announcement' },
      { caps: NO_EXTRAS, teamIds },
    ),
  );
  refused(
    decidePost({ ...an, is_active: false }, { content: 'x' }, { caps: NO_EXTRAS, teamIds }),
    403,
  );
  refused(decidePost(an, { content: '   ' }, { caps: NO_EXTRAS, teamIds }), 400);
  refused(decidePost(an, { content: 'x'.repeat(2001) }, { caps: NO_EXTRAS, teamIds }), 400);
  refused(decidePost(an, { content: 'x', post_type: 'poll' }, { caps: NO_EXTRAS, teamIds }), 400);
});

test('the post row is built from the membership, never from the body', () => {
  const r = decidePost(
    an,
    { content: ' Hi ', team_id: 't-1', author_id: 'someone-else', org_id: 'other-org' },
    { caps: NO_EXTRAS, teamIds },
  );
  ok(r);
  assert.deepEqual(r.row, {
    org_id: ORG,
    author_id: 'u-an',
    content: 'Hi',
    post_type: 'discussion',
    team_id: 't-1',
  });
  refused(decidePost(an, { content: 'Hi', team_id: 't-other' }, { caps: NO_EXTRAS, teamIds }), 400);
});

test('replies, titles, tickers and pinning read "not available yet" before the database change', () => {
  refused(
    decidePost(
      an,
      { content: 'r', parent_id: '0f8fad5b-d9cb-469f-a165-70867728950e' },
      { caps: NO_EXTRAS, teamIds },
    ),
    409,
  );
  refused(decidePost(an, { content: 'x', title: 'A title' }, { caps: NO_EXTRAS, teamIds }), 409);
  refused(decidePost(an, { content: 'x', ticker: 'NVDA' }, { caps: NO_EXTRAS, teamIds }), 409);
  refused(decidePost(exec, { content: 'x', pin: true }, { caps: NO_EXTRAS, teamIds }), 409);
  for (const a of ['edit', 'delete', 'remove', 'pin', 'unpin']) {
    const post = { id: 'p', org_id: ORG, author_id: 'u-ex' };
    refused(decidePostChange(exec, post, a, { caps: NO_EXTRAS, body: { content: 'y' } }), 409);
  }
  const rights = viewerRights(exec, NO_EXTRAS);
  assert.equal(rights.pin, false);
  assert.equal(rights.pinPending, true);
  assert.equal(viewerRights(an, NO_EXTRAS).pinPending, false);
});

test('after the change: titles, tickers and replies validate', () => {
  const r = decidePost(
    an,
    { content: 'x', title: 'NIM risk', ticker: '$jpm' },
    { caps: ALL_EXTRAS, teamIds },
  );
  ok(r);
  assert.equal(r.row.ticker, 'JPM');
  refused(
    decidePost(an, { content: 'x', ticker: 'NOT A TICKER' }, { caps: ALL_EXTRAS, teamIds }),
    400,
  );
  const parent = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', org_id: ORG, parent_id: null };
  const reply = decidePost(
    an,
    { content: 'Agree', parent_id: parent.id, post_type: 'announcement' },
    { caps: ALL_EXTRAS, teamIds, parent },
  );
  ok(reply);
  assert.equal(reply.row.post_type, 'discussion');
  assert.equal(reply.row.parent_id, parent.id);
  refused(
    decidePost(
      an,
      { content: 'r', parent_id: parent.id },
      { caps: ALL_EXTRAS, teamIds, parent: { ...parent, org_id: 'other' } },
    ),
    404,
  );
  refused(
    decidePost(
      an,
      { content: 'r', parent_id: parent.id },
      { caps: ALL_EXTRAS, teamIds, parent: { ...parent, parent_id: 'x' } },
    ),
    400,
  );
});

test('authors edit and delete their own; executives remove any post and pin up to three', () => {
  const mine = { id: 'p1', org_id: ORG, author_id: 'u-an', parent_id: null };
  ok(decidePostChange(an, mine, 'edit', { caps: ALL_EXTRAS, body: { content: 'new' } }));
  ok(decidePostChange(an, mine, 'delete', { caps: ALL_EXTRAS }));
  refused(decidePostChange(pm, mine, 'edit', { caps: ALL_EXTRAS, body: { content: 'new' } }), 403);
  refused(decidePostChange(pm, mine, 'delete', { caps: ALL_EXTRAS }), 403);
  refused(decidePostChange(pm, mine, 'remove', { caps: ALL_EXTRAS }), 403);
  refused(decidePostChange(an, mine, 'remove', { caps: ALL_EXTRAS }), 403);
  ok(decidePostChange(exec, mine, 'remove', { caps: ALL_EXTRAS }));
  ok(decidePostChange(advisor, mine, 'remove', { caps: ALL_EXTRAS }));
  refused(
    decidePostChange(exec, { ...mine, org_id: 'other' }, 'remove', { caps: ALL_EXTRAS }),
    404,
  );
  ok(decidePostChange(exec, mine, 'pin', { caps: ALL_EXTRAS, pinnedCount: MAX_PINS - 1 }));
  refused(decidePostChange(exec, mine, 'pin', { caps: ALL_EXTRAS, pinnedCount: MAX_PINS }), 409);
  refused(decidePostChange(pm, mine, 'pin', { caps: ALL_EXTRAS, pinnedCount: 0 }), 403);
  refused(decidePostChange(exec, { ...mine, parent_id: 'p0' }, 'pin', { caps: ALL_EXTRAS }), 400);
  refused(
    decidePost(exec, { content: 'x', pin: true }, { caps: ALL_EXTRAS, teamIds, pinnedCount: 3 }),
    409,
  );
});

test('events: executives and portfolio managers, a real date, one of the council teams', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  const body = {
    title: 'IC',
    event_type: 'meeting',
    event_date: '2026-11-20T16:00:00Z',
    team_id: 't-1',
  };
  ok(decideEvent(pm, body, { teamIds, now }));
  ok(decideEvent(exec, body, { teamIds, now }));
  refused(decideEvent(an, body, { teamIds, now }), 403);
  refused(decideEvent(pm, { ...body, title: '' }, { teamIds, now }), 400);
  refused(decideEvent(pm, { ...body, event_type: 'party' }, { teamIds, now }), 400);
  refused(decideEvent(pm, { ...body, event_date: '2026-10-01T00:00:00Z' }, { teamIds, now }), 400);
  refused(decideEvent(pm, { ...body, team_id: 'nope' }, { teamIds, now }), 400);
  assert.equal(decideEvent(pm, body, { teamIds, now }).row.created_by, 'u-pm');
});

test('feed: replies nest under posts, reactions count per icon, rights per row', () => {
  const posts = [
    {
      id: 'a',
      org_id: ORG,
      author_id: 'u-an',
      content: 'A',
      post_type: 'question',
      created_at: '2026-11-15T10:00:00Z',
    },
    {
      id: 'b',
      org_id: ORG,
      author_id: 'u-pm',
      content: 'B',
      post_type: 'update',
      team_id: 't-1',
      created_at: '2026-11-16T10:00:00Z',
    },
    {
      id: 'r',
      org_id: ORG,
      author_id: 'u-pm',
      content: 'R',
      post_type: 'discussion',
      parent_id: 'a',
      created_at: '2026-11-15T11:00:00Z',
    },
  ];
  const reactions = summarizeReactions(
    [
      { target_id: 'a', user_id: 'u-ex', emoji: REACTIONS[0].stored },
      { target_id: 'a', user_id: 'u-pm', emoji: REACTIONS[0].stored },
      { target_id: 'a', user_id: 'u-pm', emoji: 'unknown' },
    ],
    'u-ex',
  );
  const feed = shapeFeed({
    posts,
    members: [an, pm, exec].map((m) => ({ ...m, display_name: m.role })),
    teams: [{ id: 't-1', name: 'Financials' }],
    reactions,
    viewer: exec,
    caps: ALL_EXTRAS,
  });
  assert.deepEqual(
    feed.map((p) => p.id),
    ['b', 'a'],
  );
  assert.equal(feed[1].replies.length, 1);
  assert.equal(feed[1].reactions.counts.like, 2);
  assert.deepEqual(feed[1].reactions.mine, ['like']);
  assert.equal(feed[0].teamName, 'Financials');
  assert.equal(feed[0].canRemove, true);
  assert.equal(feed[0].canDelete, false);
  assert.deepEqual(
    filterFeed(feed, 'question').map((p) => p.id),
    ['a'],
  );
  assert.deepEqual(
    filterFeed(feed, 'team:t-1').map((p) => p.id),
    ['b'],
  );
  const before = shapeFeed({ posts, members: [], teams: [], viewer: exec, caps: NO_EXTRAS });
  assert.equal(before[0].canRemove, false);
  assert.equal(before[0].authorName, 'Member');
  assert.equal(
    roleLabel({ role: 'portfolio_manager', sub_role: 'Senior PM' }),
    'Senior portfolio manager',
  );
  assert.equal(roleLabel(advisor), 'Faculty advisor');
});

test('coming up merges council events and scheduled meetings in date order', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  const items = comingUp({
    now,
    events: [
      { id: 'e', title: 'Memo due', event_type: 'deadline', event_date: '2026-11-18T17:00:00Z' },
    ],
    meetings: [
      { id: 'm', title: 'IC', status: 'scheduled', scheduled_at: '2026-11-17T17:00:00Z' },
      { id: 'c', title: 'Old', status: 'closed', scheduled_at: '2026-11-17T17:00:00Z' },
    ],
  });
  assert.deepEqual(
    items.map((i) => i.id),
    ['mtg-m', 'evt-e'],
  );
});

/* A client whose org_posts select fails like Postgres when the columns from
   the database change are missing, and whose writes change no rows (no rule
   allows them yet). */
function preChangeClient() {
  const rows = [
    {
      id: '0f8fad5b-d9cb-469f-a165-70867728950e',
      org_id: ORG,
      author_id: 'u-an',
      content: 'x',
      post_type: 'discussion',
      created_at: '2026-11-16T00:00:00Z',
      team_id: null,
    },
  ];
  return {
    from(table) {
      const st = { cols: '', op: 'select' };
      const api = {
        select(cols) {
          if (st.op === 'select') st.cols = cols || '';
          return api;
        },
        insert() {
          st.op = 'insert';
          return api;
        },
        update() {
          st.op = 'update';
          return api;
        },
        delete() {
          st.op = 'delete';
          return api;
        },
        eq() {
          return api;
        },
        in() {
          return api;
        },
        is() {
          return api;
        },
        not() {
          return api;
        },
        order() {
          return api;
        },
        limit() {
          return api;
        },
        single() {
          return api.then((r) => r);
        },
        maybeSingle() {
          return Promise.resolve({ data: rows[0], error: null });
        },
        then(res, rej) {
          let out;
          if (table === 'org_posts' && /parent_id/.test(st.cols))
            out = {
              data: null,
              error: { code: '42703', message: 'column org_posts.parent_id does not exist' },
            };
          else if (st.op === 'delete' || st.op === 'update') out = { data: [], error: null };
          else if (table === 'org_teams') out = { data: [{ id: 't-1' }], error: null };
          else out = { data: rows, error: null };
          return Promise.resolve(out).then(res, rej);
        },
      };
      return api;
    },
  };
}

test('server: before the change the feed reads the original columns and writes say not available yet', async () => {
  const db = preChangeClient();
  const r = await readPosts(db, ORG);
  assert.deepEqual(r.caps, NO_EXTRAS);
  assert.equal(r.posts.length, 1);
  const pin = await createPost(db, exec, { content: 'x', pin: true });
  assert.equal(pin.status, 409);
  assert.equal(pin.body.code, 'not_available');
  const del = await changePost(db, an, '0f8fad5b-d9cb-469f-a165-70867728950e', 'delete', null);
  assert.equal(del.status, 409);
  assert.equal(del.body.code, 'not_available');
});

test('server: a write the database lets through but changes no row reads not available yet', async () => {
  const db = preChangeClient();
  const real = db.from.bind(db);
  /* Columns exist (no 42703), but no policy allows the delete: zero rows. */
  db.from = (t) => {
    const b = real(t);
    const sel = b.select;
    b.select = (cols) =>
      sel(
        String(cols || '').replace(/parent_id|title|ticker|pinned_at|pinned_by|edited_at/g, 'id'),
      );
    return b;
  };
  const del = await changePost(db, exec, '0f8fad5b-d9cb-469f-a165-70867728950e', 'remove', null);
  assert.equal(del.status, 409);
  assert.equal(del.body.code, 'not_available');
});

test('sample: the shared sample council, every row flagged, nothing typed twice', () => {
  const b = buildCommunitySample({
    userId: 'u-me',
    memberId: 'm-me',
    role: 'executive',
    displayName: 'Viewer',
    now: Date.parse('2026-11-16T12:00:00Z'),
  });
  assert.equal(b.is_demo, true);
  assert.equal(b.council.fund.value, 240050);
  assert.equal(b.council.fund.positions, 12);
  assert.equal(Math.round(b.council.fund.returnPct * 100) / 100, 46.73);
  for (const k of [
    'posts',
    'events',
    'meetings',
    'mentions',
    'inbox',
    'awards',
    'pitches',
    'notes',
  ])
    for (const r of b[k]) assert.equal(r.is_demo, true, `${k} row flagged`);
  const names = b.members.map((m) => m.display_name);
  for (const n of [
    'Amara Tesfaye',
    'Mikael Bekele',
    'Selam Haile',
    'Chidi Okoye',
    'Ingrid Lindqvist',
    'Daniel Park',
    'Elena Rossi',
    'Jonas Weber',
    'Tomas Alvarez',
    'Hana Girma',
  ])
    assert.ok(names.includes(n), n);
  assert.equal(b.posts.filter((p) => p.pinned_at && !p.parent_id).length <= MAX_PINS, true);
  assert.ok(b.across.rows.some((r) => r.name === 'Sample council'));
  assert.ok(
    b.across.rows.every((r) => !('roi' in r)),
    'other councils show rating and tier, not a return',
  );
  /* Actions run the same rules and stay on the page. */
  const analystBundle = buildCommunitySample({
    userId: 'u-a',
    memberId: 'sample-member-002',
    role: 'analyst',
    displayName: 'Mikael Bekele',
  });
  const refusedAnnounce = applySampleAction(
    analystBundle,
    { type: 'post', body: { content: 'x', post_type: 'announcement' } },
    { viewer: { ...analystBundle.viewer, role: 'analyst' } },
  );
  assert.equal(refusedAnnounce.ok, false);
  const posted = applySampleAction(
    b,
    { type: 'post', body: { content: 'Hello' } },
    { viewer: b.viewer },
  );
  ok(posted);
  assert.equal(posted.bundle.posts.length, b.posts.length + 1);
  const removed = applySampleAction(
    b,
    { type: 'remove', id: 'sample-post-nim' },
    { viewer: b.viewer },
  );
  ok(removed);
  assert.ok(
    !removed.bundle.posts.some(
      (p) => p.id === 'sample-post-nim' || p.parent_id === 'sample-post-nim',
    ),
  );
});

test('sample route serves the bundle only to master admin and demo accounts', () => {
  const src = fs.readFileSync(
    new URL('../src/app/api/org/community/sample/route.js', import.meta.url),
    'utf8',
  );
  assert.match(src, /isCommunityDemoViewer\(user\)/);
  assert.match(src, /sample: null/);
});

test('council members cannot post in the public retail community', async () => {
  const member = createMockSupabase({
    seed: { org_members: [{ id: 'm1', user_id: 'u1', is_active: true }] },
  });
  const r = await councilMemberPostingRefusal(member, 'u1');
  assert.deepEqual(r, { status: 403, error: COUNCIL_POSTING_ERROR });
  assert.equal(
    await councilMemberPostingRefusal(member, 'u2'),
    null,
    'a retail member still posts',
  );
  const former = createMockSupabase({
    seed: { org_members: [{ id: 'm1', user_id: 'u1', is_active: false }] },
  });
  assert.equal(
    await councilMemberPostingRefusal(former, 'u1'),
    null,
    'a former member posts as retail',
  );
  const broken = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ limit: async () => ({ data: null, error: { message: 'down' } }) }),
        }),
      }),
    }),
  };
  const quiet = console.error;
  console.error = () => {};
  assert.equal(await councilMemberPostingRefusal(broken, 'u1'), null);
  console.error = quiet;

  /* The retail post route runs the check, with the caller's own client,
     before it inserts anything. */
  const route = fs.readFileSync(
    new URL('../src/app/api/community/posts/route.js', import.meta.url),
    'utf8',
  );
  const post = route.slice(route.indexOf('export async function POST'));
  const gate = post.indexOf('councilMemberPostingRefusal(supabase, user.id)');
  const insert = post.indexOf(".from('community_posts')\n      .insert(");
  assert.ok(gate > 0, 'POST calls the council check');
  assert.ok(insert > gate, 'the check runs before the insert');
  assert.match(post.slice(gate, gate + 300), /status: councilRefusal\.status/);
});

test('/community shows the council version to council members, the retail page to everyone else', () => {
  const page = fs.readFileSync(
    new URL('../src/app/(dashboard)/community/page.js', import.meta.url),
    'utf8',
  );
  assert.match(page, /isOrgUser \? <OrgCommunityPage \/> : <CommunityPage \/>/);
  assert.match(page, /if \(isLoading\) return <Pending \/>/);
  const nav = fs.readFileSync(
    new URL('../src/components/Layout/Navbar.js', import.meta.url),
    'utf8',
  );
  const community = nav.indexOf("title: 'Community'");
  const learning = nav.indexOf("title: 'Learning Center'");
  assert.ok(
    community > 0 && learning > community,
    'Community sits directly before Learning Center',
  );
  assert.doesNotMatch(nav.slice(community - 300, community), /isOrgUser/);
});

test('page copy: no em dash, no emoji, no invented vote counts or notifications', () => {
  for (const f of [
    'OrgCommunityPage.jsx',
    'OrgCommunityDialogs.jsx',
    'useOrgCommunity.js',
    'org-community.css',
  ]) {
    const src = fs.readFileSync(
      new URL(`../src/components/org/community/${f}`, import.meta.url),
      'utf8',
    );
    assert.ok(!src.includes('—'), `${f}: no em dash`);
    assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}]/u, `${f}: no emoji`);
    assert.doesNotMatch(src, /will be notified|Votes:/, `${f}: nothing the product does not do`);
  }
  const css = fs.readFileSync(
    new URL('../src/components/org/community/org-community.css', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'tokens only');
});
