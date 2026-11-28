/**
 * Sonar for organizations: council intelligence (Nov 28 2026). Deterministic tests on
 * invented fixture councils (scripts/fixtures/org-sonar-councils.mjs). No model calls, no
 * database, no network.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-sonar-intelligence.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseOrgIntent, scenarioIn, tickersIn } from '../src/lib/org-sonar/intelligence/intent.js';
import { contextPlan, chooseOrg, authorizedCacheKey } from '../src/lib/org-sonar/intelligence/context.js';
import { concentration, policyObservations, scenarioExposure, limitationsFor, HYPOTHETICAL_LABEL } from '../src/lib/org-sonar/intelligence/portfolio.js';
import { coverageMap } from '../src/lib/org-sonar/intelligence/coverage.js';
import { thesisCompleteness, committeeQuestions } from '../src/lib/org-sonar/intelligence/red-team.js';
import { meetingBriefing, versionComparison, validateMonitor, evaluateMonitor, knowableAt } from '../src/lib/org-sonar/intelligence/briefing.js';
import { authorizeAction, classify, findingMessage } from '../src/lib/org-sonar/intelligence/actions.js';
import { runOrgCapability } from '../src/lib/org-sonar/intelligence/run.js';
import { ORG_CAPABILITIES, validateOrgAttachment } from '../src/lib/sonar/composer/org-capabilities.js';
import { CAPABILITIES } from '../src/lib/sonar/composer/registry.js';
import { COMPONENTS, getComponent, evaluate, isOrgComponent } from '../src/lib/sonar/presentation/registry.js';
import { planPresentation } from '../src/lib/sonar/presentation/planner.js';
import { canReadReport, canTransition, snapshotFromState, stateFromSnapshot } from '../src/lib/org-sonar/reports.js';
import * as F from './fixtures/org-sonar-councils.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const viewer = (m) => ({ user_id: m.user_id, org_id: m.org_id, role: m.role, team_id: m.team_id, is_active: true });
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

/* ── intent ──────────────────────────────────────────────────────────── */

test('council context is never forced onto a market question', () => {
  assert.equal(parseOrgIntent('How did Apple earnings look last quarter?').orgScoped, false);
  assert.equal(parseOrgIntent('What do we know about rates?').orgScoped, false);
  const our = parseOrgIntent('How concentrated is our fund in technology?');
  assert.equal(our.orgScoped, true);
  assert.equal(our.capability, 'org-portfolio-analysis');
  assert.equal(parseOrgIntent('Which of our holdings lack recent coverage?').capability, 'org-research-coverage');
  assert.equal(parseOrgIntent('Challenge the valuation assumptions in our Microsoft pitch.').capability, 'org-thesis-red-team');
  assert.equal(parseOrgIntent('Prepare questions for the next investment committee meeting.').orgScoped, true);
  assert.equal(parseOrgIntent('Compare the investment thesis our analysts wrote last semester with current NVIDIA fundamentals.').capability, 'org-research-memory');
  /* An explicitly chosen capability scopes the question even without "our". */
  assert.equal(parseOrgIntent('Coverage map', { explicitCapability: 'org-research-coverage' }).orgScoped, true);
});

test('scenario and tickers parse deterministically', () => {
  const i = parseOrgIntent('What would our technology sector exposure be if we increased Microsoft by $10,000?');
  assert.equal(i.capability, 'org-policy-observations');
  assert.deepEqual(i.scenario, { ticker: 'MSFT', direction: 1, amountUsd: 10000, sizePct: null });
  assert.equal(scenarioIn('trim NVDA by $5k', ['NVDA']).amountUsd, -5000);
  assert.ok(!tickersIn('our IPS and the IC').includes('IPS'));
});

/* ── 9, 10: organization isolation and switching ─────────────────────── */

test('the active org is the member’s own; a browser org id only picks between memberships', () => {
  const ms = [F.members.analystA, F.members.analystB];
  assert.equal(chooseOrg(ms, F.FIXTURE.ORG_B, F.FIXTURE.ORG_A), F.FIXTURE.ORG_B, 'switch to own second org');
  assert.equal(chooseOrg(ms, '00000000-0000-4000-8000-0000000fffff', F.FIXTURE.ORG_A), F.FIXTURE.ORG_A, 'foreign org ignored');
  const a = contextPlan(parseOrgIntent('our fund concentration'), F.members.analystA);
  const b = contextPlan(parseOrgIntent('our fund concentration'), F.members.analystB);
  assert.notEqual(a.cacheKey, b.cacheKey, 'same user and question in two councils never share a cache entry');
  assert.ok(a.cacheKey.includes(F.FIXTURE.ORG_A) && b.cacheKey.includes(F.FIXTURE.ORG_B));
  assert.notEqual(authorizedCacheKey(F.members.analystA, 'x'), authorizedCacheKey(F.members.pmA, 'x'), 'role and member in the key');
});

test('two councils holding the same ticker get their own weights', () => {
  const a = concentration(F.bookA).rows.find((r) => r.ticker === 'MSFT');
  const b = concentration(F.bookB).rows.find((r) => r.ticker === 'MSFT');
  close(a.weightPct, 30);
  close(b.weightPct, (3000 / 9000) * 100);
});

test('context is selective: coverage never loads meetings; concentration never loads pitches', () => {
  const cov = contextPlan(parseOrgIntent('which of our holdings lack coverage'), F.members.analystA);
  assert.ok(!cov.sources.includes('meetings'));
  const con = contextPlan(parseOrgIntent('our fund concentration'), F.members.analystA);
  assert.ok(!con.sources.includes('pitch') && !con.sources.includes('notes'));
  const dropped = contextPlan(parseOrgIntent('our fund concentration'), F.members.analystA, { removed: ['ips', 'positions'] });
  assert.ok(!dropped.sources.includes('ips'), 'optional context removable');
  assert.ok(dropped.sources.includes('positions'), 'required context stays');
});

/* ── 11, 12, 13: fund calculations, IPS advisory, unsupported measures ─ */

test('concentration matches the fixture book exactly', () => {
  const c = concentration(F.bookA);
  assert.equal(c.totalValue, 100000);
  close(c.topFiveSharePct, 100);
  assert.equal(c.largest.ticker, 'MSFT');
  const tech = c.sectors.find((s) => s.sector === 'Technology');
  close(tech.pct, 70);
  assert.equal(c.coverage.atCost, 1, 'XOM is carried at cost and disclosed');
  assert.match(c.coverage.note, /1 of 5 positions/);
});

test('hypothetical scenario: exact before and after, labelled, nothing mutated', () => {
  const before = JSON.stringify(F.bookA);
  const s = scenarioExposure(F.bookA, { ticker: 'MSFT', amountUsd: 10000 });
  assert.equal(s.label, HYPOTHETICAL_LABEL);
  close(s.positionPctAfter, (40000 / 110000) * 100);
  close(s.sectorPctAfter, (80000 / 110000) * 100);
  assert.equal(JSON.stringify(F.bookA), before, 'the book was not modified');
  const missing = scenarioExposure(F.bookA, { ticker: 'AMD', amountUsd: 5000 });
  assert.deepEqual(missing.missing, ['sector'], 'a new ticker without a sector is not guessed');
});

test('IPS: potential policy concern, never "blocked"; rules read by the existing engine', () => {
  const pol = policyObservations({ rules: F.ipsA, book: F.bookA, scenario: { ticker: 'MSFT', amountUsd: 10000 } });
  assert.ok(pol.concerns >= 2, 'sector cap and position cap both exceeded in the scenario');
  const sector = pol.observations.find((o) => o.ruleType === 'max_sector_pct');
  assert.equal(sector.wording, 'Potential policy concern');
  assert.equal(sector.reviewRequired, true);
  const txt = JSON.stringify(pol);
  assert.doesNotMatch(txt, /trade blocked|order rejected/i);
  const tsla = policyObservations({ rules: F.ipsA, book: F.bookA, scenario: { ticker: 'TSLA', amountUsd: 1000, sector: 'Consumer Discretionary' } });
  assert.ok(tsla.observations.find((o) => o.ruleType === 'prohibited_ticker').concern);
  assert.equal(policyObservations({ rules: [], book: F.bookA }).rules, 0);
});

test('unsupported calculations return the limitation, not a number', () => {
  const i = parseOrgIntent('What is our fund’s Sharpe ratio and time-weighted return?');
  assert.deepEqual(i.unsupported.sort(), ['Sharpe ratio', 'time-weighted return']);
  const r = runOrgCapability(i, { positions: F.bookA }, { now: F.NOW });
  assert.equal(r.limitations.length, 2);
  assert.doesNotMatch(JSON.stringify(r.desk), /sharpe/i);
  assert.ok(limitationsFor(['portfolio volatility'])[0].reason.length > 20);
});

/* ── 1, 2, 3, 4, 5, 18: research access ─────────────────────────────── */

test('private research: the author reads it, another analyst does not, a PM cannot see a draft', () => {
  const draft = F.reportsA[0];
  assert.equal(canReadReport(draft, viewer(F.members.analystA)), true);
  assert.equal(canReadReport(draft, viewer(F.members.analystA2)), false);
  assert.equal(canReadReport(draft, viewer(F.members.pmA)), false, 'managers never see drafts');
  assert.equal(canReadReport(draft, viewer(F.members.analystB)), false, 'other org');
});

test('shared reports: PM reads an executives report; everyone reads an org report', () => {
  assert.equal(canReadReport(F.reportsA[1], viewer(F.members.pmA)), true);
  assert.equal(canReadReport(F.reportsA[1], viewer(F.members.analystA)), false);
  assert.equal(canReadReport(F.reportsA[2], viewer(F.members.analystA2)), true);
  assert.equal(canReadReport(F.reportsA[2], viewer(F.members.execA)), true);
});

test('a finding cannot reach a recipient who cannot open its source report', () => {
  const base = { confirmed: true, report: F.reportsA[1], overrides: [] };
  const toAnalyst = authorizeAction('send_finding', F.members.execA, { ...base, recipients: [F.members.analystA] });
  assert.equal(toAnalyst.ok, false);
  assert.match(toAnalyst.reason, /cannot open this report/);
  const toPm = authorizeAction('send_finding', F.members.execA, { ...base, recipients: [F.members.pmA] });
  assert.equal(toPm.ok, true);
  const crossOrg = authorizeAction('send_finding', F.members.execA, { ...base, recipients: [F.members.analystB] });
  assert.equal(crossOrg.ok, false);
  const msg = findingMessage({ report: F.reportsA[1], version: 1, finding: { id: 'f1', text: 'Margins expanded.' }, evidenceIds: ['E1'], author: F.members.execA, now: new Date(F.NOW) });
  assert.equal(msg.attachment_meta.version, 1);
  assert.deepEqual(msg.attachment_meta.evidence_ids, ['E1']);
  assert.equal(msg.attachment_kind, 'document', 'uses an allowed direct-message kind');
});

test('analyst researching an assigned company: owner comes from the pitch record', () => {
  const cov = coverageMap({ book: F.bookA, reports: F.reportsA.filter((r) => canReadReport(r, viewer(F.members.analystA))), pitches: F.pitchesA, coverage: F.coverageA, members: Object.values(F.members), now: F.NOW });
  const msft = cov.rows.find((r) => r.ticker === 'MSFT');
  assert.equal(msft.owner, 'Fixture Analyst One');
  assert.equal(msft.ownerSource, 'pitch');
  const jpm = cov.rows.find((r) => r.ticker === 'JPM');
  assert.equal(jpm.ownerSource, 'sector_coverage');
  const xom = cov.rows.find((r) => r.ticker === 'XOM');
  assert.equal(xom.owner, null, 'no owner is invented');
});

/* ── 15: coverage gaps ───────────────────────────────────────────────── */

test('coverage gaps use the last substantive update and never blame an analyst', () => {
  const visible = F.reportsA.filter((r) => canReadReport(r, viewer(F.members.pmA)));
  const cov = coverageMap({ book: F.bookA, reports: visible, now: F.NOW, staleDays: 90 });
  const nvda = cov.rows.find((r) => r.ticker === 'NVDA');
  assert.equal(nvda.status, 'stale', 'approved in April, older than 90 days');
  assert.equal(cov.rows.find((r) => r.ticker === 'JPM').status, 'current');
  assert.equal(cov.rows.find((r) => r.ticker === 'XOM').status, 'no_research');
  assert.match(cov.note, /not an analyst/);
});

/* ── 6, 7, 8, 20: red team, pitch links, governance ─────────────────── */

test('red team questions are linked to the pitch’s own records', () => {
  const q = committeeQuestions(F.pitchesA[0], null, { policy: policyObservations({ rules: F.ipsA, book: F.bookA }) });
  assert.ok(q.count >= 5);
  for (const g of q.groups) for (const x of g.questions) assert.ok(x.motive?.text, `motive for: ${x.question}`);
  const flat = q.groups.flatMap((g) => g.questions);
  assert.ok(flat.some((x) => x.motive.kind === 'missing' && /valuation method/i.test(x.motive.text)), 'target price without method is challenged');
  assert.ok(flat.some((x) => x.motive.kind === 'assumption' && /Cloud revenue/.test(x.motive.text)));
  assert.ok(flat.some((x) => x.motive.kind === 'missing' && /bear case/i.test(x.motive.text)));
});

test('thesis checklist is a transparent list, not a score', () => {
  const t = thesisCompleteness(F.pitchesA[0]);
  assert.equal(t.total, 9);
  assert.ok(t.missing.includes('Source quality'));
  assert.doesNotMatch(JSON.stringify(t), /score|%/i);
});

test('governance is never performed by Sonar, and model output cannot write', () => {
  for (const a of ['change_pitch_stage', 'cast_vote', 'approve_pitch', 'add_position', 'execute_trade', 'unknown_thing'])
    assert.equal(authorizeAction(a, F.members.execA, { confirmed: true }).ok, false, a);
  assert.equal(classify('unknown_thing'), 'governance', 'unknown actions are treated as governance');
  const fromModel = authorizeAction('send_finding', F.members.execA, { fromModel: true, confirmed: true, report: F.reportsA[2], recipients: [F.members.pmA] });
  assert.equal(fromModel.ok, false);
  assert.match(fromModel.reason, /member has to confirm/);
  assert.equal(authorizeAction('propose_assignment', F.members.analystA).ok, true, 'proposals are allowed');
});

test('linking research to a pitch: author yes, another analyst no', () => {
  const ctx = { confirmed: true, report: F.reportsA[0], pitch: F.pitchesA[0] };
  assert.equal(authorizeAction('link_pitch', F.members.analystA, ctx).ok, true);
  assert.equal(authorizeAction('link_pitch', F.members.analystA2, ctx).ok, false);
});

test('review requests go to members who can actually approve', () => {
  const ctx = { confirmed: true, report: F.reportsA[0] };
  assert.equal(authorizeAction('request_review', F.members.analystA, { ...ctx, reviewer: F.members.analystA2 }).ok, false);
  assert.equal(authorizeAction('request_review', F.members.analystA, { ...ctx, reviewer: F.members.pmA }).ok, true);
  assert.equal(authorizeAction('request_review', F.members.analystA, { ...ctx, reviewer: F.members.analystB }).ok, false, 'other org');
});

test('sending a finding needs the send_to_team permission key, not a role name', () => {
  const res = authorizeAction('send_finding', F.members.analystA, { confirmed: true, report: F.reportsA[2], recipients: [F.members.analystA2] });
  assert.equal(res.ok, false);
  assert.match(res.reason, /send to team/);
});

/* ── 14, 16, 17, 19: briefings, versions, memory, saved reports ─────── */

test('meeting briefing: only recorded items, research since the previous meeting', () => {
  const b = meetingBriefing({ meeting: F.meetingsA[1], meetings: F.meetingsA, pitches: F.pitchesA, reports: F.reportsA, flags: F.flagsA });
  const get = (k) => b.sections.find((s) => s.key === k).items;
  assert.deepEqual(get('agenda').map((i) => i.text), ['MSFT pitch', 'Sector cap review']);
  assert.deepEqual(get('pitches').map((i) => i.ref.id), [F.pitchesA[0].id]);
  assert.deepEqual(get('research').map((i) => i.ref.id), [F.reportsA[2].id], 'only JPM was approved after the October meeting');
  assert.equal(get('review').length, 1);
  assert.equal(get('flags').length, 1);
  assert.equal(meetingBriefing({ meeting: null }).ok, false);
});

test('approved versions are immutable; supersede follows the existing rules', () => {
  const approved = { ...F.reportsA[2] };
  assert.equal(canTransition(approved, 'superseded', viewer(F.members.pmA)).ok, true);
  assert.equal(canTransition(approved, 'draft', viewer(F.members.pmA)).ok, false);
  const original = Object.freeze({ reportId: approved.id, version: 1, createdAt: '2026-04-10', findings: Object.freeze([{ id: 'a', text: 'Old view.' }]), assumptions: Object.freeze(['Cloud revenue grows above 20% a year']) });
  const cmp = versionComparison({ original, current: { asOf: '2026-11-10', findings: [{ id: 'b', text: 'New view.' }] } });
  assert.equal(cmp.original.findings[0].text, 'Old view.', 'the original is reported as approved');
  assert.equal(cmp.untested, 1, 'no monitor, so untested');
});

test('historical thesis vs current evidence through a recorded monitor, with reporting lag', () => {
  const m = { metric: 'operating_margin', baseline: 42, threshold: 40, operator: 'below', frequency: 'quarterly', lagDays: 30, analystMemberId: F.members.analystA.id, reportId: F.reportsA[2].id, reportVersion: 2 };
  assert.equal(validateMonitor(m).ok, true);
  assert.equal(validateMonitor({ ...m, metric: 'vibes' }).ok, false);
  const series = [
    { date: '2026-09-30', value: 43 },
    { date: '2026-11-15', value: 38 },
  ];
  assert.equal(evaluateMonitor(m, series, F.NOW).result, 'confirmed', 'the November print is inside the 30-day lag');
  assert.equal(evaluateMonitor(m, series, Date.parse('2026-12-31')).result, 'contradicted');
  assert.deepEqual(knowableAt(series, '2026-10-01').map((s) => s.value), [43], 'no look-ahead');
});

test('an org report reopened from saved research renders the same state', () => {
  const state = { status: 'done', plan: { spec: { question: 'x' } }, report: { executiveConclusion: { text: 'y' } }, run: { summary: 'z' } };
  const back = stateFromSnapshot(snapshotFromState(state));
  assert.equal(back.report.executiveConclusion.text, 'y');
  assert.match(read('src/components/org/sonar/SonarReportPage.jsx'), /ResearchReport/, 'saved org reports use the shared report shell');
});

/* ── capabilities, registry, end-to-end run ──────────────────────────── */

test('council capabilities never leak into the retail Composer', () => {
  for (const k of Object.keys(ORG_CAPABILITIES)) assert.ok(!CAPABILITIES[k], `${k} not in the retail registry`);
  assert.equal(validateOrgAttachment({ capability: 'org-research-coverage', params: { staleDays: 3 } }).ok, false);
  assert.equal(validateOrgAttachment({ capability: 'org-thesis-red-team', params: { pitchId: 'not-a-uuid' } }).ok, false);
  assert.equal(validateOrgAttachment({ capability: 'nope' }).ok, false);
});

test('registry: twelve council cards plus coverage reuse, all org-gated and wired', () => {
  const ids = ['council-portfolio-exposure', 'investment-thesis', 'valuation-assumption', 'ips-observation', 'research-coverage-matrix', 'ic-questions', 'research-version-comparison', 'team-research-activity', 'pitch-evidence-summary', 'meeting-briefing', 'thesis-monitoring', 'hindsight-analysis'];
  for (const id of ids) {
    assert.ok(getComponent(id), id);
    assert.ok(isOrgComponent(id), `${id} org-gated`);
  }
  assert.equal(isOrgComponent('exposure-breakdown'), false);
  const visual = read('src/components/sonar/layout/SonarAdaptiveVisual.jsx');
  for (const c of COMPONENTS) assert.match(visual, new RegExp(`${c.impl}: dynamic\\(`));
});

test('end to end on fixtures: concentration, coverage, red team, briefing, policy', () => {
  const ctx = { positions: F.bookA, ips: F.ipsA, flags: F.flagsA, reports: F.reportsA, pitches: F.pitchesA, coverage: F.coverageA, members: Object.values(F.members), meetings: F.meetingsA, meeting: F.meetingsA[1], pitch: F.pitchesA[0] };
  const con = runOrgCapability(parseOrgIntent('Which holdings drive our concentration?'), ctx, { now: F.NOW });
  assert.match(con.desk.headline, /MSFT is the largest position at 30\.0%/);
  const plan = planPresentation(con.visuals, { depth: 'deep' });
  const exp = plan.items.find((i) => i.componentId === 'council-portfolio-exposure');
  assert.ok(exp, 'council exposure card planned');
  assert.equal(evaluate(exp.payload).ok, true);
  const cov = runOrgCapability(parseOrgIntent('Which of our holdings have not been reviewed recently?'), ctx, { now: F.NOW });
  assert.ok(cov.proposals.every((p) => p.action === 'propose_assignment'), 'only proposals, never assignments');
  const red = runOrgCapability(parseOrgIntent('Red team our MSFT pitch'), ctx, { now: F.NOW });
  assert.match(red.desk.qualification, /does not approve, reject, vote or move/);
  const brief = runOrgCapability(parseOrgIntent('Prepare a briefing for our next committee meeting'), ctx, { now: F.NOW });
  assert.match(brief.desk.headline, /Fixture IC, December/);
  const pol = runOrgCapability(parseOrgIntent('Would increasing our MSFT position by $10,000 create an IPS concern?'), ctx, { now: F.NOW });
  assert.equal(pol.hypothetical, true);
  assert.match(pol.desk.paragraphs[0], /Hypothetical, no trade executed/);
});

/* ── static guarantees ───────────────────────────────────────────────── */

test('server: session-resolved org, caller client for reads, no model calls, no hidden writes', () => {
  const route = read('src/app/api/org/sonar/intelligence/route.js');
  const server = read('src/lib/org-sonar/intelligence-server.js');
  assert.match(route, /getCurrentOrgMember\(supabase\)/);
  assert.match(route, /chooseOrg\(/);
  assert.doesNotMatch(route + server, /getAdminClient|service_role/i, 'reads never use the service role');
  assert.doesNotMatch(server, /\.(insert|update|upsert|delete)\(/, 'the provider never writes');
  const files = [
    ...readdirSync(new URL('../src/lib/org-sonar/intelligence/', import.meta.url)).map((f) => `src/lib/org-sonar/intelligence/${f}`),
    'src/lib/org-sonar/intelligence-server.js',
    'src/app/api/org/sonar/intelligence/route.js',
    'src/app/api/org/sonar/actions/route.js',
    'src/components/org/sonar/CouncilIntelligenceTab.jsx',
    'src/components/sonar/cards/SonarOrgChecklistCard.jsx',
    'src/components/sonar/cards/SonarVersionComparison.jsx',
  ];
  for (const f of files) {
    const s = read(f);
    assert.doesNotMatch(s, /anthropic|claude-|messages\.create|callModel|runAnalyst/i, `${f}: no model calls`);
    assert.doesNotMatch(s, /Math\.random/, f);
    assert.ok(!s.includes('—'), `${f}: em dash`);
    assert.doesNotMatch(s, /trade blocked|order rejected/i, f);
  }
  const actions = read('src/app/api/org/sonar/actions/route.js');
  assert.match(actions, /classify\(action\) === 'governance'/);
  assert.match(actions, /body\.confirmed === true/);
});
