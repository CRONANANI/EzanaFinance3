#!/usr/bin/env node
/**
 * Message requests (Nov 2026): rules in src/lib/messages/requests.js, plus
 * source checks that the Messages page and API use them.
 *
 *   node --no-warnings --test scripts/check-message-requests.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  decideSend,
  decideRespond,
  viewFor,
  chatTime,
  handleOf,
  REQUEST_PENDING_CAP,
  DECLINED_ERROR,
} from '../src/lib/messages/requests.js';

const A = 'user-a';
const B = 'user-b';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('friends go straight to the inbox', () => {
  const p = decideSend({ convo: null, senderId: A, mutual: true });
  assert.equal(p.ok, true);
  assert.equal(p.status, 'active');
  assert.equal(p.create, true);
  assert.equal(p.notify, 'message');
});

test('friends reopen an old request or decline as active', () => {
  for (const status of ['request', 'declined']) {
    const p = decideSend({ convo: { status, requested_by: A }, senderId: A, mutual: true });
    assert.equal(p.ok, true);
    assert.equal(p.activate, true);
    assert.equal(p.status, 'active');
  }
});

test('a non-friend opens a request', () => {
  const p = decideSend({ convo: null, senderId: A, mutual: false });
  assert.equal(p.status, 'request');
  assert.equal(p.requestedBy, A);
  assert.equal(p.notify, 'request');
});

test('follow-ups on your own request are capped and do not re-notify', () => {
  const convo = { status: 'request', requested_by: A };
  const ok = decideSend({ convo, senderId: A, mutual: false, pendingSent: 1 });
  assert.equal(ok.ok, true);
  assert.equal(ok.notify, 'none');
  const capped = decideSend({
    convo,
    senderId: A,
    mutual: false,
    pendingSent: REQUEST_PENDING_CAP,
  });
  assert.equal(capped.ok, false);
  assert.equal(capped.code, 429);
});

test('the recipient replying accepts the request', () => {
  const p = decideSend({
    convo: { status: 'request', requested_by: A },
    senderId: B,
    mutual: false,
  });
  assert.equal(p.ok, true);
  assert.equal(p.activate, true);
  assert.equal(p.status, 'active');
});

test('a declined requester cannot keep sending; the decliner can reopen', () => {
  const convo = { status: 'declined', requested_by: A };
  const blocked = decideSend({ convo, senderId: A, mutual: false });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, DECLINED_ERROR);
  const reopen = decideSend({ convo, senderId: B, mutual: false });
  assert.equal(reopen.ok, true);
  assert.equal(reopen.activate, true);
});

test('an accepted request stays open to both, friends or not', () => {
  const p = decideSend({
    convo: { status: 'active', requested_by: A },
    senderId: B,
    mutual: false,
  });
  assert.equal(p.ok, true);
  assert.equal(p.activate, false);
});

test('only the recipient answers an open request', () => {
  const convo = { participant_a: A, participant_b: B, status: 'request', requested_by: A };
  assert.equal(decideRespond({ convo, userId: A, action: 'accept' }).code, 403);
  assert.equal(decideRespond({ convo, userId: 'x', action: 'accept' }).code, 404);
  assert.equal(decideRespond({ convo, userId: B, action: 'nope' }).code, 400);
  assert.deepEqual(decideRespond({ convo, userId: B, action: 'accept' }), {
    ok: true,
    status: 'active',
  });
  assert.deepEqual(decideRespond({ convo, userId: B, action: 'decline' }), {
    ok: true,
    status: 'declined',
  });
  assert.equal(
    decideRespond({ convo: { ...convo, status: 'active' }, userId: B, action: 'accept' }).code,
    409,
  );
});

test('views: requester never sees "declined"; decliner stops seeing the chat', () => {
  const declined = { status: 'declined', requested_by: A };
  assert.equal(viewFor(declined, A).status, 'request');
  assert.equal(viewFor(declined, A).is_outgoing_request, true);
  assert.equal(viewFor(declined, B).hidden, true);
  const open = { status: 'request', requested_by: A };
  assert.equal(viewFor(open, B).is_incoming_request, true);
  assert.equal(viewFor(open, A).is_incoming_request, false);
  assert.equal(viewFor({ status: 'active' }, A).hidden, false);
  assert.equal(viewFor({}, A).status, 'active');
});

test('chat times read like the reference', () => {
  const now = new Date(2026, 10, 9, 15, 0).getTime();
  const ago = (ms) => new Date(now - ms).toISOString();
  assert.equal(chatTime(ago(20 * 1000), now), 'Now');
  assert.equal(chatTime(ago(2 * 60000), now), '2m ago');
  assert.equal(chatTime(ago(60 * 60000), now), '1h ago');
  assert.equal(chatTime(new Date(2026, 10, 8, 20, 0).toISOString(), now), 'Yesterday');
  assert.equal(chatTime(new Date(2026, 10, 5, 9, 0).toISOString(), now), 'Thursday');
  assert.equal(chatTime(new Date(2026, 9, 4, 9, 0).toISOString(), now), 'Oct 4');
  assert.equal(chatTime(new Date(2025, 9, 4, 9, 0).toISOString(), now), 'Oct 4, 2025');
  assert.equal(chatTime(null, now), '');
});

test('handles', () => {
  assert.equal(handleOf('noah'), '@noah');
  assert.equal(handleOf('@@noah '), '@noah');
  assert.equal(handleOf(''), '');
  assert.equal(handleOf(null), '');
});

test('API uses the request rules', () => {
  const route = read('src/app/api/messages/route.js');
  assert.match(route, /decideSend\(/);
  assert.match(route, /viewFor\(/);
  assert.doesNotMatch(route, /You can only message friends/);
  const respond = read('src/app/api/messages/[conversationId]/request/route.js');
  assert.match(respond, /decideRespond\(/);
  assert.match(respond, /\.eq\('status', STATUS\.REQUEST\)/);
});

test('migration adds status and drops browser write policies', () => {
  const sql = read('supabase/migrations/20261112090000_message_requests.sql');
  assert.match(sql, /add column if not exists status/);
  assert.match(sql, /check \(status in \('active', 'request', 'declined'\)\)/);
  assert.match(sql, /drop policy if exists "Users can insert messages in their conversations"/);
});

test('page: no header copy, Chats column, any-member search', () => {
  const page = read('src/components/community/MessagesPageClient.jsx');
  assert.doesNotMatch(page, /MessagesHeader/);
  assert.doesNotMatch(page, /Handle all messages/);
  const list = read('src/components/community/messages/ConversationList.jsx');
  assert.match(list, />Chats</);
  assert.match(list, /Search chats\.\.\./);
  const dialog = read('src/components/community/messages/NewMessageDialog.jsx');
  assert.match(dialog, /\/api\/community\/search/);
  for (const f of [
    'src/components/community/MessagesPageClient.jsx',
    'src/components/community/messages/ConversationList.jsx',
    'src/components/community/messages/ConversationRow.jsx',
    'src/components/community/messages/NewMessageDialog.jsx',
    'src/components/community/messages/MessageThread.jsx',
    'src/components/community/messages/EmptyConversationState.jsx',
  ]) {
    const src = read(f);
    assert.doesNotMatch(src, /lucide-react/, `${f} uses Bootstrap Icons`);
    assert.doesNotMatch(src, /\u2014/, `${f} has no em dash`);
  }
});

test('css: transparent page and columns, no panel border or shadow', () => {
  const css = read('src/app/(dashboard)/community/messages/messages.css');
  const block = (sel) => {
    const i = css.indexOf(`${sel} {`);
    assert.ok(i >= 0, `${sel} exists`);
    return css.slice(i, css.indexOf('}', i));
  };
  assert.match(block('.m-page'), /background: transparent/);
  const panel = block('.m-panel');
  assert.match(panel, /background: transparent/);
  assert.match(panel, /border: 0/);
  assert.match(panel, /box-shadow: none/);
  assert.doesNotMatch(css, /\.m-header\b/);
  assert.match(block('.m-unread'), /background: var\(--emerald\)/);
});
