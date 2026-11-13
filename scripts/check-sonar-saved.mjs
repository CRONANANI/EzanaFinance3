/**
 * Saved research, the research library and share links (Sonar research workspace, Nov 13 2026):
 * the pure rules and, at source level, the routes' guards.
 * Run: node --no-warnings --test scripts/check-sonar-saved.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  cleanSaveBody,
  cleanCollectionName,
  cleanSavedPatch,
  stripPrivate,
  seatCanShare,
  fitSnapshot,
  stateFromRunRow,
  SAVED_SNAPSHOT_MAX_BYTES,
  PRIVATE_KEYS,
} from '../src/lib/sonar/saved.js';
import { isShareToken, publicSnapshot } from '../src/lib/sonar/workspace.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const RUN = '0b6a3c9e-1f2d-4c5b-8a7e-9d0c1b2a3f4e';

const ROUTES = {
  history: 'src/app/api/sonar/history/route.js',
  saved: 'src/app/api/sonar/saved/route.js',
  savedId: 'src/app/api/sonar/saved/[id]/route.js',
  collections: 'src/app/api/sonar/collections/route.js',
  collectionId: 'src/app/api/sonar/collections/[id]/route.js',
  shared: 'src/app/api/sonar/shared/[token]/route.js',
};

test('the share route refuses a malformed token before any query', () => {
  for (const bad of ['', 'abc', 'G'.repeat(64), 'a'.repeat(63), 'A'.repeat(64), null, 42])
    assert.equal(isShareToken(bad), false, String(bad));
  assert.equal(isShareToken('ab'.repeat(32)), true);
  const src = read(ROUTES.shared);
  const guard = src.indexOf('if (!isShareToken(token)) return GONE();');
  const query = src.indexOf(".rpc('sonar_shared_research'");
  assert.ok(guard > 0 && query > guard, 'the token is checked before the function is called');
  assert.match(src, /requireAuth: false/);
  assert.doesNotMatch(src, /console\.(log|warn|error)\([^)]*token/, 'the token is never logged');
  const page = read('src/app/sonar/shared/[token]/page.js');
  assert.ok(page.indexOf('if (!isShareToken(token)) return null;') < page.indexOf('.rpc('));
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});

test('the public payload is only the publicSnapshot keys', () => {
  const pub = publicSnapshot({
    question: 'Q',
    headline: 'H',
    summary: 'S',
    takeaways: ['a'],
    sources: [{ name: 'A', url: 'https://a.example' }],
    depth: 'quick',
    answeredAt: '2026-11-13T00:00:00Z',
    user_id: 'u',
    planTier: 3,
    org: { id: 'o' },
    note: 'private',
    controls: { focus: 'risk' },
  });
  assert.deepEqual(Object.keys(pub).sort(), [
    'answeredAt',
    'depth',
    'headline',
    'question',
    'sources',
    'summary',
    'takeaways',
  ]);
  const src = read(ROUTES.shared);
  assert.match(src, /const pub = publicSnapshot\(/);
  assert.match(src, /return NextResponse\.json\(pub, \{ headers: HEADERS \}\);/);
  assert.equal((src.match(/NextResponse\.json\(/g) || []).length, 2, 'the payload or the 404');
});

test('saving strips user, plan, org and attachment fields from a snapshot', () => {
  const body = {
    kind: 'ping',
    question: '  Is the lira under pressure?  ',
    ticker: 'nvda',
    depth: 'quick',
    controls: { focus: 'nonsense' },
    snapshot: {
      headline: 'The lira is under pressure.',
      user_id: 'u1',
      userId: 'u1',
      planTier: 4,
      quota: { remaining: 2 },
      remaining: 2,
      org_id: 'o1',
      org: { id: 'o1' },
      attachment: { name: 'f.pdf', text: 'secret contents' },
      attachmentText: 'secret',
      run: { evidence: [{ title: 'x', userId: 'u1' }], plan: { tasks: [] } },
    },
  };
  const out = cleanSaveBody(body);
  assert.equal(out.ok, true);
  const text = JSON.stringify(out.row.snapshot);
  for (const k of [
    'user_id',
    'userId',
    'planTier',
    'quota',
    'remaining',
    'org_id',
    '"org"',
    'attachment',
    'secret',
  ])
    assert.ok(!text.includes(k), `stripped ${k}`);
  assert.ok(out.row.snapshot.run.plan, 'the research plan is not a subscription plan');
  assert.equal(out.row.question, 'Is the lira under pressure?');
  assert.equal(out.row.title, 'The lira is under pressure.');
  assert.equal(out.row.ticker, 'NVDA');
  assert.equal('user_id' in out.row, false, 'the route adds the caller, never the body');
  assert.ok(PRIVATE_KEYS.has('attachmentText'));
  assert.deepEqual(stripPrivate({ a: [{ email: 'x', b: 1 }] }), { a: [{ b: 1 }] });
});

test('save validation: kind, question, run id, size cap', () => {
  assert.equal(cleanSaveBody({ kind: 'x', question: 'q', snapshot: {} }).ok, false);
  assert.equal(cleanSaveBody({ kind: 'ping', question: ' ', snapshot: {} }).ok, false);
  assert.equal(
    cleanSaveBody({ kind: 'research', question: 'q', snapshot: {} }).ok,
    false,
    'needs a run',
  );
  assert.equal(
    cleanSaveBody({ kind: 'ping', question: 'q', runId: 'nope', snapshot: {} }).ok,
    false,
  );
  assert.equal(
    cleanSaveBody({ kind: 'research', question: 'q', runId: RUN, snapshot: {} }).ok,
    true,
  );
  const big = { blob: 'x'.repeat(SAVED_SNAPSHOT_MAX_BYTES + 10) };
  const r = cleanSaveBody({ kind: 'ping', question: 'q', snapshot: big });
  assert.equal(r.ok, false);
  assert.equal(r.status, 413);
  const fit = fitSnapshot({ report: {}, panels: { p: 'x'.repeat(SAVED_SNAPSHOT_MAX_BYTES) } });
  assert.deepEqual(fit.trimmed, ['panels']);
  assert.equal(fitSnapshot({ report: { x: 'y'.repeat(SAVED_SNAPSHOT_MAX_BYTES + 1) } }), null);
});

test('folders and patches are validated', () => {
  assert.equal(cleanCollectionName('  Semis  '), 'Semis');
  assert.equal(cleanCollectionName(''), null);
  assert.equal(cleanCollectionName('x'.repeat(61)), null);
  assert.deepEqual(cleanSavedPatch({ share: true }), { ok: true, patch: {}, share: true });
  assert.equal(cleanSavedPatch({ collectionId: 'nope' }).ok, false);
  assert.equal(cleanSavedPatch({}).ok, false);
  assert.equal(cleanSavedPatch({ share_token: 'a'.repeat(64) }).ok, false, 'never a client token');
  assert.deepEqual(cleanSavedPatch({ collectionId: null }).patch, { collection_id: null });
});

test('organization and partner seats are refused sharing on the server', () => {
  assert.equal(seatCanShare('regular'), true);
  assert.equal(seatCanShare('org'), false);
  assert.equal(seatCanShare('partner'), false);
  const src = read(ROUTES.savedId);
  const seat = src.indexOf('const seat = await sonarSeat(supabase, user);');
  const refuse = src.indexOf('if (!seatCanShare(seat))');
  const token = src.indexOf('patch.share_token = newShareToken();');
  assert.ok(
    seat > 0 && refuse > seat && token > refuse,
    'the seat is checked before a link is made',
  );
  assert.match(src, /status|403/);
  assert.match(
    read('src/lib/sonar/saved-server.js'),
    /crypto\.randomBytes\(32\)\.toString\('hex'\)/,
  );
});

test('every route uses withApiGuard, user-scoped reads, private no-store; writes are strict', () => {
  for (const [name, f] of Object.entries(ROUTES)) {
    const src = read(f);
    assert.match(src, /withApiGuard\(/, `${name}: withApiGuard`);
    assert.match(src, /safeErrorResponse/, `${name}: safeErrorResponse`);
    assert.match(src, /getUserClient\(\)/, `${name}: RLS client`);
    assert.doesNotMatch(src, /getAdminClient/, `${name}: never the admin client`);
    assert.match(src, /private, no-store|json\(/, `${name}: private, no-store`);
    for (const m of src.matchAll(/export const (POST|PATCH|DELETE) = withApiGuard\(/g)) {
      const rest = src.slice(m.index);
      const end = rest.indexOf('\n);');
      assert.match(rest.slice(0, end), /\{ strict: true \}/, `${name} ${m[1]}: strict`);
    }
  }
  assert.match(read('src/lib/sonar/saved-server.js'), /'Cache-Control': 'private, no-store'/);
  assert.match(read(ROUTES.saved), /SAVED_MAX/);
  assert.match(
    read(ROUTES.saved),
    /run\.user_id !== user\.id/,
    'a research run must be the caller own',
  );
  assert.match(read(ROUTES.collections), /COLLECTIONS_MAX/);
});

test('the share link is public in the middleware; the pages exist', () => {
  assert.match(
    read('src/lib/auth/protected-routes.js'),
    /PUBLIC_ROUTE_EXCEPTIONS = \['\/sonar\/shared'\]/,
  );
  const mw = read('src/middleware.js');
  assert.match(mw, /!matchesRoutePrefix\(pathname, PUBLIC_ROUTE_EXCEPTIONS\)/);
  for (const p of [
    'src/app/(dashboard)/sonar/history/page.js',
    'src/app/(dashboard)/sonar/history/[id]/page.js',
    'src/app/(dashboard)/sonar/saved/page.js',
    'src/app/(dashboard)/sonar/saved/[id]/page.js',
    'src/app/(dashboard)/sonar/library/page.js',
    'src/app/sonar/shared/[token]/page.js',
  ])
    assert.ok(existsSync(new URL(`../${p}`, import.meta.url)), p);
  const css = read('src/components/sonar/workspace-pages/research-workspace.css');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'tokens only');
  for (const f of [
    'src/components/sonar/SonarSaveActions.jsx',
    'src/components/sonar/workspace-pages/HistoryClient.jsx',
    'src/components/sonar/workspace-pages/SharedResearchView.jsx',
  ])
    assert.ok(!read(f).includes('—'), `${f}: no em dash`);
});

test('a past run opens with the report renderer the org reader uses', () => {
  const state = stateFromRunRow({
    id: RUN,
    question: 'Which countries produce the most oil?',
    depth: 'standard',
    subject: { kind: 'theme', label: 'Crude oil' },
    created_at: '2026-11-12T10:00:00Z',
    report: { executiveConclusion: { text: 'The US.' }, keyFindings: [], evidence: [{ id: 'e1' }] },
  });
  assert.equal(state.status, 'done');
  assert.equal(state.run.runId, RUN);
  assert.equal(state.report.executiveConclusion.text, 'The US.');
  assert.equal(state.run.evidence.length, 1);
  assert.equal(stateFromRunRow({ id: RUN }), null);
  assert.match(
    read('src/components/sonar/workspace-pages/PastRunClient.jsx'),
    /<ResearchReport state=\{research\} \/>/,
  );
  assert.match(
    read('src/components/sonar/workspace-pages/SavedItemClient.jsx'),
    /stateFromSnapshot\(item\.snapshot\)/,
  );
});

test('the migration matches SQL_01: every statement, additive', () => {
  const sql = read('supabase/migrations/20261118090000_sonar_research_workspace.sql');
  for (const s of [
    'create table if not exists public.sonar_research_collections',
    'create unique index if not exists sonar_research_collections_name_uidx',
    'alter table public.sonar_research_collections enable row level security',
    'create policy sonar_research_collections_own on public.sonar_research_collections',
    'create table if not exists public.sonar_saved_research',
    'check (octet_length(snapshot::text) <= 600000)',
    "share_token   text        unique check (share_token is null or share_token ~ '^[0-9a-f]{64}$')",
    'create policy sonar_saved_research_own on public.sonar_saved_research',
    'create or replace function public.sonar_shared_research(p_token text)',
    'security definer',
    'revoke all on function public.sonar_shared_research(text) from public;',
    'grant execute on function public.sonar_shared_research(text) to anon, authenticated;',
    "add column if not exists controls jsonb not null default '{}'::jsonb",
    'add column if not exists parent_run_id uuid references public.sonar_research_runs (id) on delete set null',
    'add column if not exists attachment_name text',
    'create index if not exists sonar_research_runs_parent_idx',
  ])
    assert.ok(sql.includes(s), s);
  assert.equal((sql.match(/;/g) || []).length, 22, 'the 22 statements of SQL_01');
  assert.doesNotMatch(sql, /\bdrop table\b|\balter column\b/i, 'additive only');
});
