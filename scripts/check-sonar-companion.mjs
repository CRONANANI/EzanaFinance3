/**
 * Sonar Companion (Nov 28 2026). Deterministic tests with mocks and fixtures only: no model,
 * no network, no database. The 25 scenarios of the Companion brief, covered through the pure
 * layer (lib/sonar/companion) and static checks of the components.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-companion.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DEFAULT_PREFS, sanitizePrefs, loadPrefs, savePrefs, canDock, resizeStep, PREFS_KEY, WIDTH_MIN, WIDTH_MAX } from '../src/lib/sonar/companion/prefs.js';
import { contextFromRoute, mergeContext, contextItems, composeQuestion, FULL_SONAR } from '../src/lib/sonar/companion/page-context.js';
import { suggestionsFor } from '../src/lib/sonar/companion/suggestions.js';
import { scopeOf, entriesIn, addEntry, updateEntry, persistable, restorePlan, revokeScope, sameRunLock, releaseLock, questionKey, LOCK_TTL_MS } from '../src/lib/sonar/companion/session.js';
import { viewFromResearch, viewFromCouncil, forMode, fullScreenHref, MODE_LIMITS } from '../src/lib/sonar/companion/view.js';
import { availableActions, FORBIDDEN, COMPANION_ACTIONS } from '../src/lib/sonar/companion/actions.js';
import { reduceEvent, EMPTY_RESEARCH_STATE } from '../src/lib/sonar/research-state.js';
import { stateFromRunRow } from '../src/lib/sonar/saved.js';
import { canReadReport } from '../src/lib/org-sonar/reports.js';
import { authorizeAction } from '../src/lib/org-sonar/intelligence/actions.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const ORG_A = '00000000-0000-4000-8000-00000000a001';
const ORG_B = '00000000-0000-4000-8000-00000000b001';
const RUN = '00000000-0000-4000-8000-0000000000aa';

/* A stored run, as /api/sonar/history?id= returns it (fixture). */
const RUN_ROW = {
  id: RUN,
  question: 'NVDA fundamentals',
  depth: 'standard',
  report: {
    executiveConclusion: { text: 'Revenue grew on data-center demand.' },
    keyFindings: [1, 2, 3, 4, 5].map((i) => ({ id: `f${i}`, text: `Finding ${i}` })),
    metrics: [
      { id: 'rev', label: 'Revenue growth', value: 61.2, unit: 'percent' },
      { id: 'gm', label: 'Gross margin', value: 74.99, unit: 'percent' },
      { id: 'fcf', label: 'Free cash flow', value: 60_853_000_000, unit: 'usd' },
    ],
  },
};

const files = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url)).map((f) => `${dir}${f}`);
const COMPANION = [...files('src/components/sonar/companion/'), ...files('src/lib/sonar/companion/')];

/* 1, 2: available from the dashboard, mounted once for the authed segment. */
test('mounted once in the dashboard shell, so it survives navigation', () => {
  const layout = read('src/app/(dashboard)/layout.js');
  assert.match(layout, /<SonarCompanionProvider enabled=\{Boolean\(isAuthenticated\)\}>\{shell\}<\/SonarCompanionProvider>/);
  assert.equal((layout.match(/<SonarCompanionProvider /g) || []).length, 1, 'mounted once');
  const ctx = contextFromRoute('/home-dashboard', {});
  assert.equal(ctx.pageType, 'portfolio');
  assert.ok(suggestionsFor(ctx).length > 0, 'portfolio suggestions on the dashboard');
  assert.ok(FULL_SONAR.test('/sonar/history/abc') && !FULL_SONAR.test('/watchlist'), 'steps aside on full Sonar only');
});

/* 3, 4, 5, 6, 16, 17: modes never send a request. */
test('opening, minimizing, resizing, docking and expanding never call the network', () => {
  const provider = read('src/components/sonar/companion/SonarCompanionProvider.jsx');
  /* Exactly two network calls exist: the history read (opening a stored run) and the council
     route; research only through useResearchStream's run(). */
  const fetches = provider.match(/fetch\(/g) || [];
  assert.equal(fetches.length, 2);
  assert.match(provider, /\/api\/sonar\/history\?id=/);
  assert.match(provider, /\/api\/org\/sonar\/intelligence/);
  for (const fn of ['open:', 'minimize:', 'setMode:', 'togglePrefs:', 'goFull:', 'newConversation:']) {
    const body = provider.slice(provider.indexOf(fn), provider.indexOf(fn) + 260);
    assert.doesNotMatch(body, /fetch\(|run\(/, `${fn} does not request`);
  }
  const win = read('src/components/sonar/companion/SonarCompanionWindow.jsx');
  assert.doesNotMatch(win, /fetch\(/);
  assert.equal(resizeStep(480, 'ArrowLeft'), 504);
  assert.equal(resizeStep(480, 'End'), WIDTH_MAX);
  assert.equal(resizeStep(9999, 'x'), WIDTH_MAX);
  assert.equal(canDock(1440, 480), true);
  assert.equal(canDock(1280, 480), false, 'falls back to overlay when the page would be squeezed');
});

test('modes show the same objects; only how many', () => {
  const st = { ...stateFromRunRow(RUN_ROW), runId: RUN };
  const view = viewFromResearch(st);
  const compact = forMode(view, 'compact');
  const side = forMode(view, 'sidebar');
  const full = forMode(view, 'full');
  assert.equal(compact.findings.length, MODE_LIMITS.compact.findings);
  assert.ok(compact.more, 'offers to expand');
  /* 19: identical numbers in every mode. */
  for (const i of [0, 1]) {
    assert.deepEqual(compact.metrics[i], side.metrics[i]);
    assert.deepEqual(side.metrics[i], full.metrics[i]);
  }
  assert.equal(side.metrics[0].text, '61.20%');
  assert.equal(full.metrics[2].text, '$60.85B');
  assert.equal(compact.summary, full.summary);
});

/* 5, 6: full screen uses the stored run's address, never the payload. */
test('full-screen handoff uses a stable id and the existing Sonar page', () => {
  const href = fullScreenHref(viewFromResearch({ ...stateFromRunRow(RUN_ROW), runId: RUN }));
  assert.equal(href, `/sonar/history/${RUN}`);
  assert.ok(href.length < 80, 'no report payload in the URL');
  const provider = read('src/components/sonar/companion/SonarCompanionProvider.jsx');
  assert.match(provider, /fullscreen: true, prevMode: u\.mode/);
  assert.match(provider, /mode: u\.prevMode \|\| u\.mode/, 'returns to the previous mode');
});

/* 7, 23: a run completes or fails while minimized; the run id is kept from the stream. */
test('the run id survives the stream; failures keep the error', () => {
  let s = { ...EMPTY_RESEARCH_STATE, status: 'running' };
  s = reduceEvent(s, ['done', { runId: RUN, remaining: null }]);
  assert.equal(s.runId, RUN);
  assert.equal(s.status, 'done');
  let f = reduceEvent({ ...EMPTY_RESEARCH_STATE, status: 'running' }, ['error', { runId: RUN, message: 'That research run did not complete. Nothing was spent.' }]);
  const v = viewFromResearch(f);
  assert.equal(v.status, 'error');
  assert.match(v.error, /Nothing was spent/);
  assert.equal(v.runId, RUN);
  assert.match(read('src/components/sonar/research/useResearchStream.js'), /X-Research-Run/);
});

/* 8: hard refresh. */
test('a hard refresh reopens finished runs by id and never restarts an interrupted one', () => {
  const entries = [
    { id: 'a', scope: 'personal', runId: RUN, status: 'done', question: 'private question text' },
    { id: 'b', scope: 'personal', runId: null, status: 'running', question: 'still going' },
    { id: 'c', scope: 'personal', runId: 'r2', status: 'running' },
  ];
  const stored = persistable(entries);
  assert.ok(!JSON.stringify(stored).includes('private question text'), 'no question text in storage');
  assert.deepEqual(stored.map((e) => e.id), ['a', 'c'], 'an entry with no id cannot be restored and is not kept');
  const plan = restorePlan(stored, 'personal');
  assert.equal(plan.find((e) => e.id === 'a').action, 'fetch_history');
  assert.equal(plan.find((e) => e.id === 'c').action, 'show_interrupted');
});

/* 9, 10: context. */
test('context follows the selected company and can be removed', () => {
  const a = contextFromRoute('/company-research', { ticker: 'nvda' });
  const b = contextFromRoute('/company-research', { ticker: 'AAPL' });
  assert.equal(a.entity.symbol, 'NVDA');
  assert.equal(b.entity.symbol, 'AAPL');
  assert.match(suggestionsFor(b)[0].label, /AAPL/);
  assert.equal(composeQuestion('What changed?', a), 'NVDA: What changed?');
  assert.equal(composeQuestion('What changed?', a, ['entity']), 'What changed?', 'removed context is not sent');
  assert.equal(contextFromRoute('/company-research', { ticker: 'DROP TABLE' }).entity, undefined);
});

/* 11, 12, 22: scopes. */
test('personal and organization scopes never mix; switching orgs hides the other org', () => {
  const personal = contextFromRoute('/watchlist', {}, { org: { orgId: ORG_A } });
  const orgA = contextFromRoute('/org-team-hub/sonar', {}, { org: { orgId: ORG_A } });
  const orgB = contextFromRoute('/org-team-hub/sonar', {}, { org: { orgId: ORG_B } });
  assert.equal(scopeOf(personal), 'personal');
  assert.equal(scopeOf(orgA), `org:${ORG_A}`);
  let entries = addEntry([], { id: '1', scope: scopeOf(orgA), runId: 'x', status: 'done' });
  entries = addEntry(entries, { id: '2', scope: 'personal', runId: 'y', status: 'done' });
  assert.deepEqual(entriesIn(entries, scopeOf(orgB)), []);
  assert.deepEqual(entriesIn(entries, 'personal').map((e) => e.id), ['2']);
  assert.deepEqual(revokeScope(entries, ORG_A).map((e) => e.id), ['2'], 'revoked membership drops that org');
  /* An org page without an authorized membership is treated as personal, not as the org. */
  assert.equal(contextFromRoute('/org-team-hub/sonar', {}, { org: null }).workspace, 'personal');
  /* A page cannot move itself into another organization. */
  const merged = mergeContext(personal, { organizationId: ORG_B, workspace: 'organization' });
  assert.equal(merged.workspace, 'personal');
  const provider = read('src/components/sonar/companion/SonarCompanionProvider.jsx');
  assert.match(provider, /results\.current\.delete\(e\.id\)/, 'answers from another scope are dropped from memory');
  assert.match(provider, /if \(scopeOf\(ctx\) !== scope\) return;/, 'a late council answer from a previous scope is discarded');
});

/* 13, 14, 15: permissions reuse the council rules. */
test('report and citation permissions come from the existing rules', () => {
  const analyst = { user_id: 'u1', org_id: ORG_A, role: 'analyst', team_id: 't1' };
  const execReport = { org_id: ORG_A, author_id: 'u9', status: 'approved', visibility: 'executives' };
  assert.equal(canReadReport(execReport, analyst), false);
  const send = authorizeAction('send_finding', { ...analyst, id: 'm1', is_active: true, sub_role: 'Junior Analyst' }, { confirmed: true, report: execReport, recipients: [] });
  assert.equal(send.ok, false);
  const stage = authorizeAction('change_pitch_stage', { ...analyst, is_active: true }, { confirmed: true });
  assert.equal(stage.ok, false, 'pitch stage changes are denied');
});

/* 15, 24: actions only when they can work; governance never offered. */
test('actions: only working ones; locked or org-only actions hidden', () => {
  const view = viewFromResearch({ ...stateFromRunRow(RUN_ROW), runId: RUN });
  const personal = availableActions(view, contextFromRoute('/watchlist', {}), { orgMember: false });
  assert.ok(personal.some((a) => a.key === 'open_full'));
  assert.ok(!personal.some((a) => COMPANION_ACTIONS[a.key].workspace === 'organization'));
  const org = availableActions(view, contextFromRoute('/org-team-hub/sonar', {}, { org: { orgId: ORG_A } }), { orgMember: true, permissions: [] });
  assert.ok(org.some((a) => a.key === 'save_to_org'));
  assert.ok(!org.some((a) => a.key === 'send_finding'), 'no send_to_team permission, no button');
  for (const k of FORBIDDEN) assert.ok(!COMPANION_ACTIONS[k], `${k} never in the registry`);
  const sugg = suggestionsFor(contextFromRoute('/org-team-hub/sonar', {}, { org: { orgId: ORG_A } }), { orgMember: false });
  assert.ok(!sugg.some((s) => s.kind === 'council'), 'council suggestions need an active membership');
});

/* 18, 21: explicit research uses the existing route; two tabs do not duplicate. */
test('explicit questions use the existing research stream; a second tab sees the first run', () => {
  const provider = read('src/components/sonar/companion/SonarCompanionProvider.jsx');
  assert.match(provider, /import \{ useResearchStream \} from '@\/components\/sonar\/research\/useResearchStream'/);
  assert.match(provider, /run\(q\);/);
  assert.doesNotMatch(provider, /depth: 'deep'/, 'never deep research from the Companion');
  const ls = memStore();
  const first = sameRunLock(ls, 'personal', 'NVDA fundamentals', 'tab1', 1000);
  const second = sameRunLock(ls, 'personal', ' nvda   fundamentals ', 'tab2', 2000);
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(sameRunLock(ls, 'personal', 'NVDA fundamentals', 'tab2', 1000 + LOCK_TTL_MS + 1).ok, true, 'stale lock expires');
  releaseLock(ls, first.key);
  assert.notEqual(questionKey('personal', 'x'), questionKey(`org:${ORG_A}`, 'x'), 'locks are scoped');
});

/* 16, 17: no model call anywhere in the Companion. */
test('no model or provider calls in Companion code; no random; no em dash', () => {
  for (const f of COMPANION) {
    const s = read(f);
    assert.doesNotMatch(s, /anthropic|messages\.create|claude-(opus|sonnet|haiku)|openai/i, f);
    assert.doesNotMatch(s, /Math\.random/, f);
    assert.ok(!s.includes('—'), `${f}: em dash`);
    assert.doesNotMatch(s, /setInterval\(/, `${f}: no background polling`);
  }
});

/* Preferences: non-sensitive only. */
test('preferences: clean, clamped, never research payloads', () => {
  assert.deepEqual(sanitizePrefs({ width: 10, side: 'up', secret: 'x', report: { a: 1 } }), { ...DEFAULT_PREFS, width: WIDTH_MIN });
  const ls = memStore();
  savePrefs(ls, { ...DEFAULT_PREFS, docked: true, report: 'should not be stored' });
  assert.ok(!ls.getItem(PREFS_KEY).includes('should not be stored'));
  assert.equal(loadPrefs(ls).docked, true);
  assert.deepEqual(loadPrefs({ getItem: () => '{bad json' }), { ...DEFAULT_PREFS });
});

test('council answers render through the same view, with limitations and proposals', () => {
  const v = viewFromCouncil({ result: { capability: 'org-portfolio-analysis', desk: { headline: 'MSFT is the largest position at 30.0% of the fund', paragraphs: ['x'] }, visuals: [], evidence: [{ id: 'org_positions', label: 'Council position book' }], limitations: [{ measure: 'Sharpe ratio', reason: 'r' }], proposals: [], hypothetical: false } });
  assert.equal(v.kind, 'council');
  assert.equal(fullScreenHref(v), '/org-team-hub/sonar?tab=intelligence');
  assert.equal(forMode(v, 'sidebar').limitations.length, 1);
});

/* 20, 25: mobile and motion. */
test('mobile: launcher above the tab bar and safe area; reduced motion respected', () => {
  const css = read('src/components/sonar/companion/sonar-companion.css');
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.scc-launcher \{[\s\S]*bottom: calc\(76px \+ env\(safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'tokens only');
  assert.match(css, /z-index: 990;/, 'below design-system modals');
});

test('accessibility: dialog label, Escape, live region, keyboard resize, focus restore', () => {
  const win = read('src/components/sonar/companion/SonarCompanionWindow.jsx');
  assert.match(win, /role="dialog"/);
  assert.match(win, /aria-label="Sonar Companion"/);
  assert.match(win, /e\.key === 'Escape'/);
  assert.match(win, /aria-live="polite"/);
  assert.match(win, /role="separator"[\s\S]{0,600}tabIndex=\{0\}/);
  assert.match(win, /getElementById\('scc-launcher'\)\?\.focus\(\)/);
  const launcher = read('src/components/sonar/companion/SonarCompanionLauncher.jsx');
  assert.match(launcher, /aria-label=/);
});
