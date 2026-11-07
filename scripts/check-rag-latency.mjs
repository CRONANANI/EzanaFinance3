/**
 * RAG latency (Nov 2026): the per-request timer behind rag_request_timings.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-rag-latency.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { createRequestTimer } = await import('@/lib/rag/request-timer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A stub admin client that records inserts. */
function stubAdmin({ throws = false } = {}) {
  const inserts = [];
  return {
    inserts,
    from(table) {
      if (throws) throw new Error('boom');
      return {
        insert(row) {
          inserts.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

const quiet = (fn) => async () => {
  const info = console.info;
  console.info = () => {};
  try {
    await fn();
  } finally {
    console.info = info;
  }
};

test('time() records a stage on success and returns the value', async () => {
  const t = createRequestTimer('sonar-query');
  const v = await t.time(
    'retrieve',
    sleep(12).then(() => 42),
  );
  assert.equal(v, 42);
  assert.ok(t.stages().retrieve >= 10, 'ms recorded');
  const w = await t.time('synth', () => Promise.resolve('ok'));
  assert.equal(w, 'ok', 'accepts a function too');
  assert.ok('synth' in t.stages());
});

test('time() records a stage when the work throws, then rethrows', async () => {
  const t = createRequestTimer('help-center');
  await assert.rejects(
    t.time('synth', async () => {
      await sleep(5);
      throw new Error('model down');
    }),
    /model down/,
  );
  assert.ok(t.stages().synth >= 0);
});

test('firstByte() records once', async () => {
  const t = createRequestTimer('sonar-query');
  await sleep(5);
  const a = t.firstByte();
  await sleep(10);
  const b = t.firstByte();
  assert.equal(a, b);
});

test(
  'finish() inserts one row, at most once, with timings only',
  quiet(async () => {
    const admin = stubAdmin();
    const t = createRequestTimer('sonar-query');
    t.set('gate', 12.6);
    t.set('grounding_regen', 1);
    t.firstByte();
    t.finish(admin, { cacheHit: true, streamed: true, degraded: 'stream_cut' });
    t.finish(admin, { cacheHit: false });
    assert.equal(admin.inserts.length, 1);
    const { table, row } = admin.inserts[0];
    assert.equal(table, 'rag_request_timings');
    assert.equal(row.surface, 'sonar-query');
    assert.equal(row.stages.gate, 13, 'rounded to integer ms');
    assert.equal(row.stages.grounding_regen, 1);
    assert.equal(row.cache_hit, true);
    assert.equal(row.streamed, true);
    assert.equal(row.degraded, 'stream_cut');
    assert.ok(Number.isInteger(row.total_ms) && Number.isInteger(row.first_byte_ms));
    assert.deepEqual(
      Object.keys(row).sort(),
      ['cache_hit', 'degraded', 'first_byte_ms', 'stages', 'streamed', 'surface', 'total_ms'],
      'no query text, user id or IP',
    );
  }),
);

test(
  'finish() never throws: null admin, a throwing client, a rejected insert',
  quiet(async () => {
    assert.doesNotThrow(() => createRequestTimer('help-center').finish(null));
    assert.doesNotThrow(() =>
      createRequestTimer('help-center').finish(stubAdmin({ throws: true })),
    );
    const rejecting = {
      from: () => ({ insert: () => Promise.reject(new Error('db down')) }),
    };
    assert.doesNotThrow(() => createRequestTimer('help-center').finish(rejecting));
    await sleep(5); /* the rejection is swallowed, not unhandled */
  }),
);

/* ------------------------------------------------------------------ help center (PROMPT_3) */

const H = await import('@/lib/help-center-ask');

const userRow = {
  audience: 'user',
  slug: 'reset-password',
  title: 'Reset your password',
  category: 'Account',
  content: 'Open Settings, then Security.',
};

test('a partner question with no partner match is answered from the user center in one call', async () => {
  const calls = [];
  const searchHelp = (q, { audience }) => {
    calls.push(audience);
    return audience === 'user' ? [userRow] : [];
  };
  const timer = createRequestTimer('help-center');
  const out = await H.retrieveHelpSources('how do I reset my password', 'partner', {
    admin: null,
    searchHelp,
    timer,
  });
  assert.equal(out.answeredFrom, 'user');
  assert.equal(out.sources[0].slug, 'reset-password');
  assert.equal(out.sources[0].audience, 'user');
  assert.deepEqual(calls, ['partner', 'user']);
  assert.ok('retrieve' in timer.stages() && 'retrieve_fallback' in timer.stages());
});

test('a partner match stays partner, and a user question never falls back', async () => {
  const partnerRow = { ...userRow, audience: 'partner', slug: 'payouts' };
  const searchHelp = (q, { audience }) => (audience === 'partner' ? [partnerRow] : [userRow]);
  const p = await H.retrieveHelpSources('payouts', 'partner', { searchHelp });
  assert.equal(p.answeredFrom, 'partner');
  assert.equal(p.sources[0].slug, 'payouts');
  const calls = [];
  const none = (q, { audience }) => (calls.push(audience), []);
  const u = await H.retrieveHelpSources('nothing matches', 'user', { searchHelp: none });
  assert.equal(u.answeredFrom, 'user');
  assert.equal(u.sources.length, 0);
  assert.deepEqual(calls, ['user'], 'no second retrieval for user questions');
});

test('the help cache key differs by audience and normalizes the query', () => {
  const a = H.helpCacheKey('partner', '  Reset   Password ');
  assert.equal(a, 'help:ask:v1:partner:reset password');
  assert.notEqual(a, H.helpCacheKey('user', 'reset password'));
  assert.equal(H.helpCacheKey(null, 'x y'), 'help:ask:v1:all:x y');
});

test('only grounded, sourced, non-degraded answers are cached', () => {
  const src = [{ slug: 's' }];
  assert.equal(H.shouldCacheHelp({ answer: 'A.', grounded: true, sources: src }), true);
  assert.equal(
    H.shouldCacheHelp({ answer: null, grounded: false, degraded: 'llm 529', sources: src }),
    false,
  );
  assert.equal(H.shouldCacheHelp({ answer: 'A.', grounded: true, sources: [] }), false);
  assert.equal(
    H.shouldCacheHelp({ answer: 'A.', grounded: true, degraded: 'timeout', sources: src }),
    false,
  );
});

test('the client makes one call and reads answeredFrom for the label', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(
    new URL('../src/components/help-center/SupportCenter.jsx', import.meta.url),
    'utf8',
  );
  assert.ok(!/call\('user'\)/.test(src), 'no second request for the user audience');
  assert.match(src, /data\?\.answeredFrom === 'user'/);
  const route = readFileSync(
    new URL('../src/app/api/help-center/ask/route.js', import.meta.url),
    'utf8',
  );
  assert.match(route, /SYNTH_TIMEOUT_MS = 8000/);
  assert.ok(!/new Map\(\)/.test(route), 'no per-instance answer cache');
});

/* ------------------------------------------------------------------ Sonar streaming (PROMPT_2) */

const G = await import('@/lib/sonar/groundingGuard');
const L = await import('@/lib/sonar/llm-providers');
const C = await import('@/lib/sonar/answer-cache');

/* Feed text in small chunks, as a stream would arrive. */
function feed(gate, text, size = 5) {
  let sent = '';
  for (let i = 0; i < text.length; i += size) sent += gate.push(text.slice(i, i + size));
  return sent;
}

test('the gate releases only complete sentences and keeps $135.00 and U.S. whole', () => {
  const gate = G.createSentenceGate([]);
  const before = feed(gate, 'Lockheed closed at $135.00 in U.S. trading. Volume rose');
  assert.equal(before, 'Lockheed closed at $135.00 in U.S. trading.');
  assert.equal(gate.flush(), ' Volume rose');
  assert.equal(gate.text(), 'Lockheed closed at $135.00 in U.S. trading. Volume rose');
});

test('the gate drops an unsupported negative claim, and keeps it when a finding says so', () => {
  const claim = 'SpaceX has not held an IPO.';
  const drop = G.createSentenceGate(['SpaceX won a NASA contract.']);
  const sent =
    feed(drop, `SpaceX won a NASA contract. ${claim} Shares are not listed`) + drop.flush();
  assert.ok(!sent.includes('has not held'));
  assert.deepEqual(drop.removed, [claim]);
  const keep = G.createSentenceGate(['SpaceX has not held an IPO, per its filings.']);
  const ok = feed(keep, `${claim} It remains a major contractor.`) + keep.flush();
  assert.ok(ok.includes(claim));
  assert.deepEqual(keep.removed, []);
});

test('the gate drops coverage notes and keeps paragraph breaks', () => {
  const gate = G.createSentenceGate([]);
  const text =
    'Ezana tracks 12 trades. Our datasets returned no record of a merger.\n\nSecond paragraph here. It ends.';
  const sent = feed(gate, text, 3) + gate.flush();
  assert.equal(sent, 'Ezana tracks 12 trades.\n\nSecond paragraph here. It ends.');
  assert.equal(gate.removed.length, 1);
});

test('flush() checks the tail, and held sentences are re-checked against final findings', () => {
  const tail = G.createSentenceGate([]);
  tail.push('Revenue rose. The company has never paid a dividend');
  assert.equal(tail.flush(), '');
  assert.equal(tail.text(), 'Revenue rose.');
  /* Web search on: a flagged sentence (and what follows) waits for the final citations. */
  const cites = [];
  const held = G.createSentenceGate(() => cites, { holdFlagged: true });
  const live = feed(held, 'Acme filed a 10-K. Acme has never paid a dividend. Shares rose 4%. ');
  assert.equal(live, 'Acme filed a 10-K.', 'later sentences wait behind the held one');
  cites.push('Acme has never paid a dividend since its 2019 listing.');
  assert.equal(held.flush(), ' Acme has never paid a dividend. Shares rose 4%.');
  assert.deepEqual(held.removed, []);
});

test('the stream assembler rebuilds content that parses like the non-streamed reply', () => {
  const citation = {
    type: 'web_search_result_location',
    url: 'https://example.com/acme',
    title: 'Acme results',
    cited_text: 'Acme reported revenue of $2.1 billion.',
  };
  const events = [
    { type: 'message_start', message: { model: 'claude-haiku-4-5', usage: { input_tokens: 900 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Checking the ' } },
    {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'latest figures. ' },
    },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'content_block_start',
      index: 1,
      content_block: { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: {} },
    },
    {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '{"query":' },
    },
    {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '"acme revenue"}' },
    },
    { type: 'content_block_stop', index: 1 },
    {
      type: 'content_block_start',
      index: 2,
      content_block: {
        type: 'web_search_tool_result',
        tool_use_id: 'srv_1',
        content: [
          {
            type: 'web_search_result',
            url: 'https://example.com/acme',
            title: 'Acme results',
            page_age: '2026-11-01',
          },
        ],
      },
    },
    { type: 'content_block_stop', index: 2 },
    { type: 'content_block_start', index: 3, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 3, delta: { type: 'citations_delta', citation } },
    {
      type: 'content_block_delta',
      index: 3,
      delta: { type: 'text_delta', text: 'Revenue was $2.1 billion.' },
    },
    { type: 'content_block_stop', index: 3 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 40 } },
    { type: 'message_stop' },
  ];
  const asm = L.createAnthropicStreamAssembler();
  let streamed = '';
  for (const ev of events) streamed += asm.event(ev);
  const nonStreamed = [
    { type: 'text', text: 'Checking the latest figures. ' },
    { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'acme revenue' } },
    {
      type: 'web_search_tool_result',
      tool_use_id: 'srv_1',
      content: [
        {
          type: 'web_search_result',
          url: 'https://example.com/acme',
          title: 'Acme results',
          page_age: '2026-11-01',
        },
      ],
    },
    { type: 'text', text: 'Revenue was $2.1 billion.', citations: [citation] },
  ];
  assert.deepEqual(L.parseAnthropicContent(asm.content()), L.parseAnthropicContent(nonStreamed));
  assert.equal(streamed, 'Checking the latest figures. Revenue was $2.1 billion.');
  assert.deepEqual(asm.citedText(), ['Acme reported revenue of $2.1 billion.']);
  assert.equal(asm.usage().output_tokens, 40);
});

test('the answer cache key varies by depth and entitlements, and org notes are never cached', () => {
  const base = {
    query: 'NVDA congress trades',
    context: '',
    datasets: ['echo', 'congress'],
    webSearch: true,
  };
  const a = C.sonarAnswerCacheKey({ ...base, depth: 'summary' });
  assert.match(a, /^sonar:qa:v1:[0-9a-f]{64}$/);
  assert.notEqual(a, C.sonarAnswerCacheKey({ ...base, depth: 'deep' }));
  assert.equal(
    a,
    C.sonarAnswerCacheKey({
      ...base,
      query: '  nvda   CONGRESS trades ',
      depth: 'summary',
      datasets: ['congress', 'echo'],
    }),
  );
  assert.notEqual(a, C.sonarAnswerCacheKey({ ...base, depth: 'summary', webSearch: false }));
  const good = { briefing: 'NVDA saw 12 trades. [S1]', grounded: true, empty: false };
  assert.equal(C.shouldCacheSonarAnswer(good, { corporaSearched: ['echo', 'congress'] }), true);
  assert.equal(
    C.shouldCacheSonarAnswer(good, { corporaSearched: ['echo', 'research_notes'] }),
    false,
  );
  assert.equal(C.shouldCacheSonarAnswer(good, { corporaUsed: ['research_notes'] }), false);
  assert.equal(C.cacheableSearch(['echo', 'research_notes']), false);
  assert.equal(C.shouldCacheSonarAnswer({ ...good, degraded: 'stream_cut' }), false);
  assert.equal(C.shouldCacheSonarAnswer({ ...good, advice_flagged: true }), false);
  assert.equal(C.shouldCacheSonarAnswer({ ...good, briefing: null, grounded: false }), false);
});

test('the quick-answer route streams with the gate, bounds retrieval and keeps JSON for others', async () => {
  const { readFileSync } = await import('node:fs');
  const route = readFileSync(
    new URL('../src/app/api/sonar/query/route.js', import.meta.url),
    'utf8',
  );
  assert.match(route, /text\\\/event-stream/);
  assert.match(
    route,
    /embedTimeoutMs: 1500,\s*rerankTimeoutMs: 1800,\s*retrieverTimeoutMs: 4000,\s*speculativeEmbed: true/,
  );
  assert.match(route, /createSentenceGate\(/);
  assert.match(route, /streamSynthesis\(/);
  assert.match(route, /enforceGrounding\(/, 'the JSON path keeps regenerate-then-strip');
  assert.match(route, /55_000/);
  const live = readFileSync(
    new URL('../src/components/sonar/SonarLiveAnswer.jsx', import.meta.url),
    'utf8',
  );
  assert.ok(!/setInterval/.test(live), 'no artificial typewriter');
});

test('streamSynthesis reads a live event stream, and falls back to the chain before any text', async () => {
  const sse = (events) =>
    events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  const body = sse([
    { type: 'message_start', message: { model: 'claude-haiku-4-5', usage: { input_tokens: 10 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Acme won ' } },
    {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'a $4.2B award. [S1]' },
    },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 9 } },
    { type: 'message_stop' },
  ]);
  const realFetch = globalThis.fetch;
  const key = process.env.ANTHROPIC_API_KEY;
  const log = console.log;
  const warn = console.warn;
  const error = console.error;
  console.log = console.warn = console.error = () => {};
  process.env.ANTHROPIC_API_KEY = 'test-key';
  try {
    /* Split the body across chunks, as the network would. */
    globalThis.fetch = async () => {
      const enc = new TextEncoder();
      const chunks = body.match(/[\s\S]{1,37}/g).map((c) => enc.encode(c));
      return new Response(
        new ReadableStream({
          start(c) {
            for (const ch of chunks) c.enqueue(ch);
            c.close();
          },
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      );
    };
    let got = '';
    const out = await L.streamSynthesis(
      { system: 's', user: 'u', maxTokens: 100, model: 'claude-haiku-4-5', webSearch: null },
      { onText: (t) => (got += t) },
    );
    assert.equal(got, 'Acme won a $4.2B award. [S1]');
    assert.equal(out.answer, 'Acme won a $4.2B award. [S1]');
    assert.equal(out.provider, 'anthropic');
    assert.equal(out.streamed, true);

    /* A 529 before any text: the existing chain answers and its text goes through onText. */
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response('{"error":{"type":"overloaded_error"}}', { status: 529 });
    };
    let fell = '';
    const out2 = await L.streamSynthesis(
      { system: 's', user: 'u', maxTokens: 100, model: 'claude-haiku-4-5', webSearch: null },
      { onText: (t) => (fell += t) },
    );
    assert.ok(calls >= 2, 'the stream, then the chain');
    assert.equal(out2.streamed, false);
    assert.equal(fell, out2.answer || '', 'whatever the chain answered went through onText');
  } finally {
    globalThis.fetch = realFetch;
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = key;
    console.log = log;
    console.warn = warn;
    console.error = error;
  }
});
