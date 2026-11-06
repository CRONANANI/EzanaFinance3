/**
 * Research team state (Nov 2026): the reducer cases for the `team`, `analyst`
 * and `audit` events, and the selectors the run screen and the report read.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-research-team.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_RESEARCH_STATE as EMPTY,
  reduceEvent,
  parseSseBlock,
  selectTeam,
  teamProgress,
  splitRefs,
  analystTitle,
} from '../src/lib/sonar/research-state.js';

const TEAM = {
  mode: 'deep',
  lead: {
    id: 'fx-strategist',
    title: 'Senior FX and Currency Strategist',
    reason: 'Leads currency questions.',
  },
  supporting: [
    {
      id: 'macroeconomist',
      title: 'Senior Macroeconomic Analyst',
      reason: 'Inflation and rates context.',
    },
    {
      id: 'sovereign-risk',
      title: 'Senior Sovereign Risk and Emerging Markets Analyst',
      reason: 'Reserves and external debt.',
    },
  ],
  controls: ['research-director', 'methodology-auditor', 'red-team'],
};

const fold = (events, s = EMPTY) => events.reduce(reduceEvent, s);

test('empty state carries the team fields', () => {
  assert.equal(EMPTY.team, null);
  assert.deepEqual(EMPTY.analysts, {});
  assert.equal(EMPTY.audit, null);
});

test('team event stores the routing decision', () => {
  const s = fold([['team', TEAM]]);
  assert.deepEqual(s.team, TEAM);
  assert.equal(fold([['team', null]]).team, null, 'a malformed team event is ignored');
});

test('analyst events keep the latest status and role per id', () => {
  const s = fold([
    [
      'analyst',
      {
        id: 'fx-strategist',
        title: 'Senior FX and Currency Strategist',
        role: 'lead',
        status: 'started',
      },
    ],
    [
      'analyst',
      {
        id: 'macroeconomist',
        title: 'Senior Macroeconomic Analyst',
        role: 'supporting',
        status: 'started',
      },
    ],
    ['analyst', { id: 'fx-strategist', status: 'done' }],
  ]);
  assert.equal(s.analysts['fx-strategist'].status, 'done');
  assert.equal(s.analysts['fx-strategist'].role, 'lead', 'role survives an event that omits it');
  assert.equal(s.analysts['fx-strategist'].title, 'Senior FX and Currency Strategist');
  assert.equal(s.analysts.macroeconomist.status, 'started');
  assert.ok(s.analysts['fx-strategist'].seq > s.analysts.macroeconomist.seq, 'seq orders events');
});

test('analyst events with no id or an unknown status are ignored', () => {
  const s = fold([
    ['analyst', { status: 'started' }],
    ['analyst', { id: 'fx-strategist', status: 'thinking' }],
  ]);
  assert.deepEqual(s.analysts, {});
});

test('an unknown role is not stored', () => {
  const s = fold([['analyst', { id: 'x', role: 'wizard', status: 'started' }]]);
  assert.equal(s.analysts.x.role, null);
});

test('audit event stores the checks', () => {
  const audit = {
    passed: 9,
    total: 10,
    checks: [
      {
        id: 'periods',
        label: 'Every figure has a period',
        pass: false,
        detail: 'One figure undated.',
      },
    ],
  };
  assert.deepEqual(fold([['audit', audit]]).audit, audit);
});

test('events fold from SSE blocks as the browser reads them', () => {
  const ev = parseSseBlock(`event: team\ndata: ${JSON.stringify(TEAM)}`);
  assert.equal(ev[0], 'team');
  assert.equal(fold([ev]).team.lead.id, 'fx-strategist');
});

test('the reducer does not mutate the previous state', () => {
  const a = fold([['analyst', { id: 'fx-strategist', role: 'lead', status: 'started' }]]);
  const before = JSON.stringify(a);
  reduceEvent(a, ['analyst', { id: 'fx-strategist', status: 'done' }]);
  assert.equal(JSON.stringify(a), before);
});

test('teamProgress: null before routing, then statuses from real events', () => {
  assert.equal(teamProgress(EMPTY), null);
  let s = fold([['team', TEAM]]);
  let p = teamProgress(s);
  assert.equal(p.lead.title, 'Senior FX and Currency Strategist');
  assert.equal(p.lead.status, 'pending');
  assert.equal(p.supporting.length, 2);
  assert.equal(p.redTeam, 'pending');
  assert.equal(p.audit, 'pending');
  assert.equal(p.afterSynthesis, false);
  s = fold(
    [
      ['analyst', { id: 'fx-strategist', role: 'lead', status: 'started' }],
      ['analyst', { id: 'macroeconomist', role: 'supporting', status: 'failed' }],
      [
        'analyst',
        {
          id: 'red-team',
          title: 'Independent Bear-Case and Red-Team Analyst',
          role: 'red-team',
          status: 'started',
        },
      ],
    ],
    s,
  );
  p = teamProgress(s);
  assert.equal(p.lead.status, 'active');
  assert.equal(p.supporting[0].status, 'failed');
  assert.equal(p.redTeam, 'active');
  assert.equal(p.afterSynthesis, true);
  s = fold([['analyst', { id: 'methodology-auditor', role: 'auditor', status: 'started' }]], s);
  assert.equal(teamProgress(s).audit, 'active');
  s = fold([['audit', { passed: 8, total: 9, checks: [] }]], s);
  assert.equal(teamProgress(s).audit, 'done');
  assert.deepEqual(teamProgress(s).auditResult, { passed: 8, total: 9 });
});

test('teamProgress: standard mode has no red-team step', () => {
  const p = teamProgress(
    fold([
      [
        'team',
        { ...TEAM, mode: 'standard', controls: ['research-director', 'methodology-auditor'] },
      ],
    ]),
  );
  assert.equal(p.redTeam, null);
  assert.equal(p.audit, 'pending');
});

test('teamProgress: quick mode routing shows no team steps', () => {
  assert.equal(teamProgress(fold([['team', { ...TEAM, mode: 'quick' }]])), null);
});

test('selectTeam: live fallback lists the routed analysts with status', () => {
  const s = fold([
    ['team', TEAM],
    ['analyst', { id: 'fx-strategist', role: 'lead', status: 'done' }],
    ['analyst', { id: 'macroeconomist', role: 'supporting', status: 'started' }],
  ]);
  const t = selectTeam(s);
  assert.equal(t.live, true);
  assert.deepEqual(
    t.specialists.map((x) => [x.role, x.status]),
    [
      ['lead', 'done'],
      ['supporting', 'working'],
      ['supporting', 'waiting'],
    ],
  );
  assert.equal(t.specialists[0].reason, 'Leads currency questions.');
});

test('selectTeam: the final report.team wins over live state', () => {
  const final = {
    mode: 'deep',
    lead: TEAM.lead,
    supporting: TEAM.supporting.slice(0, 1),
    specialists: [
      {
        id: 'macroeconomist',
        title: 'Senior Macroeconomic Analyst',
        role: 'supporting',
        status: 'done',
        conclusion: 'Inflation is high.',
        confidence: 'moderate',
        findings: [],
      },
      {
        id: 'fx-strategist',
        title: 'Senior FX and Currency Strategist',
        role: 'lead',
        status: 'done',
        conclusion: 'The lira is under pressure.',
        confidence: 'high',
        findings: [{ claim: 'x', label: 'fact', refs: ['S1'] }],
      },
    ],
    audit: { passed: 10, total: 10, checks: [] },
    redTeam: { verdict: 'holds', points: [] },
    methodology: { analysts: [], calculations: [], freshness: [], gaps: [] },
  };
  const s = fold([
    ['team', TEAM],
    ['report', { team: final }],
  ]);
  const t = selectTeam(s);
  assert.equal(t.live, false);
  assert.equal(t.specialists[0].role, 'lead', 'the lead is listed first');
  assert.equal(
    t.specialists[0].reason,
    'Leads currency questions.',
    'reason filled from the routing',
  );
  assert.equal(t.redTeam.verdict, 'holds');
  assert.equal(t.audit.passed, 10);
});

test('selectTeam: absent or quick team renders nothing', () => {
  assert.equal(selectTeam(EMPTY), null);
  assert.equal(selectTeam(fold([['report', { team: { mode: 'quick' } }]])), null);
  assert.equal(selectTeam({ run: { evidence: [] } }), null, 'older saved snapshot');
});

test('titles never fall back to an internal id', () => {
  assert.equal(analystTitle({ id: 'fx-strategist' }), 'Senior FX and Currency Strategist');
  assert.equal(analystTitle({ id: 'not-a-real-id' }), 'Specialist analyst');
  const t = selectTeam(
    fold([['team', { mode: 'standard', lead: { id: 'valuation' }, supporting: [] }]]),
  );
  assert.equal(t.specialists[0].title, 'Senior Valuation and Financial Modelling Analyst');
});

test('splitRefs separates evidence markers from metric ids', () => {
  assert.deepEqual(splitRefs(['S3', '[S12]', 'M:fx_both_1y', 'junk', null]), {
    evidence: ['S3', 'S12'],
    metrics: ['fx_both_1y'],
  });
  assert.deepEqual(splitRefs(undefined), { evidence: [], metrics: [] });
});

test('teamProgress: a specialist added on a handoff appears as supporting', () => {
  const s = fold([
    ['team', TEAM],
    [
      'analyst',
      {
        id: 'rates-strategist',
        title: 'Senior Fixed Income and Rates Strategist',
        role: 'supporting',
        status: 'started',
      },
    ],
  ]);
  const p = teamProgress(s);
  assert.equal(p.supporting.length, 3);
  assert.equal(p.supporting[2].title, 'Senior Fixed Income and Rates Strategist');
  assert.equal(p.supporting[2].status, 'active');
});
