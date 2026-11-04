/**
 * The no-em-dash house rule and its runtime guards (Nov 2026).
 *   npm run test:em-dash
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { removeEmDashes, deepRemoveEmDashes, hasEmDash, NA } = await import('@/lib/text/em-dash');
const { cleanResponse } = await import('@/lib/text/no-em-dash-response');
const { stripCoverageNotes } = await import('@/lib/sonar/groundingGuard');
const { topicForText, topicCovered, LOBBYING_TOPICS } = await import('@/lib/lobbying/topics');
const { DOMAINS } = await import('@/lib/sonar/engine/domains');

const D = '—';

test('the house rule rewrites every form of the dash', () => {
  const cases = [
    [D, NA],
    [` ${D} `, ' · '],
    [`${D} None ${D}`, 'None'],
    [`2020${D}2024`, '2020–2024'],
    [`$1.5M${D}$6M`, '$1.5M–$6M'],
    [`${D} Warren Buffett`, 'Warren Buffett'],
    [`Loading ${D}`, 'Loading'],
    [`Ezana Echo ${D} The Weekly`, 'Ezana Echo: The Weekly'],
    [`the market ${D} not the Fed ${D} moved`, 'the market, not the Fed, moved'],
    [`acquisitions${D}and earnings${D}but none`, 'acquisitions, and earnings, but none'],
    [`Ends with dash ${D}.`, 'Ends with dash.'],
    ['A &mdash; B', 'A: B'],
    ['no dash here', 'no dash here'],
  ];
  for (const [input, want] of cases) assert.equal(removeEmDashes(input), want, input);
  assert.ok(!hasEmDash(removeEmDashes(`x ― y &#8212; z`)));
});

test('deep rewrite keeps identity when nothing changes', () => {
  const clean = { a: ['x', { b: 1 }] };
  assert.equal(deepRemoveEmDashes(clean), clean);
  const dirty = { a: [`x ${D} y`, { b: D }], n: 5, u: null };
  assert.deepEqual(deepRemoveEmDashes(dirty), { a: ['x, y', { b: NA }], n: 5, u: null });
});

test('route responses: JSON and SSE are rewritten, headers kept', async () => {
  const json = new Response(JSON.stringify({ answer: `Lobbying rose ${D} sharply`, n: 1 }), {
    status: 201,
    headers: {
      'content-type': 'application/json',
      'set-cookie': 'snr_guest=1.x; Path=/',
      'content-length': '99',
    },
  });
  const out = await cleanResponse(json);
  assert.equal(out.status, 201);
  assert.equal(out.headers.get('content-length'), null);
  assert.match(out.headers.get('set-cookie'), /snr_guest/);
  assert.deepEqual(await out.json(), { answer: 'Lobbying rose, sharply', n: 1 });

  const enc = new TextEncoder();
  const body = new ReadableStream({
    start(c) {
      const ev = `event: findings\ndata: {"t":"A ${D} B"}\n\n`;
      const bytes = enc.encode(ev);
      c.enqueue(bytes.slice(0, 30));
      c.enqueue(bytes.slice(30));
      c.close();
    },
  });
  const sse = await cleanResponse(
    new Response(body, { headers: { 'content-type': 'text/event-stream' } }),
  );
  const text = await sse.text();
  assert.ok(!text.includes(D));
  assert.match(text, /"A: B"|"A, B"/);
});

test('a brief that talks about its own sources loses those sentences', () => {
  const draft = [
    `I don't have sources that identify which firms are lobbying hardest on AI regulation. The snippets provided cover AI-related business developments, but none contain lobbying activity data.`,
    'To answer this, I would need access to lobbying disclosures.',
    'Meta Platforms reported $75.4M across 12 filings [S1].',
  ].join('\n\n');
  assert.equal(stripCoverageNotes(draft), 'Meta Platforms reported $75.4M across 12 filings [S1].');
});

test('lobbying questions are recognised and their topic coverage is checked', () => {
  const q = 'Who is lobbying hardest on AI regulation?';
  assert.ok(DOMAINS.lobbying.cues[0].test(q));
  assert.equal(topicForText(q).key, 'ai');
  assert.equal(topicForText('who lobbies on stablecoins').key, 'crypto');
  assert.equal(topicForText('defense lobbying'), null);
  const rows = LOBBYING_TOPICS.ai.queries.flatMap((query) =>
    [2025, 2026].map((year) => ({ topic: 'ai', year, query, complete: true })),
  );
  assert.ok(topicCovered(rows, 'ai', { from: 2025, to: 2026 }));
  assert.ok(!topicCovered(rows, 'ai', { from: 2024, to: 2026 }), '2024 not ingested');
  assert.ok(!topicCovered(rows.slice(1), 'ai', { from: 2025, to: 2026 }), 'one phrase missing');
});
