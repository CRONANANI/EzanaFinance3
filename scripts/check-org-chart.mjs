/**
 * Org chart (/org-team-hub/org-chart, Nov 2026 redesign).
 *   npm run test:org-chart
 *
 * Pure checks on the page model and the sample bundle, plus source guards for
 * the rules that are easy to regress: every member is drawn somewhere, a team
 * with no portfolio manager is a team with no sector head, the routing lines
 * follow the server's routing, the sample council is the other org pages'
 * council, and the page only offers what the server routes accept.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GICS_SECTORS,
  applyMemberEdit,
  applyRankChange,
  buildStructure,
  changeRows,
  councilCounts,
  coverageMap,
  flagRoutingRows,
  memberEditBody,
  rankOptions,
  resolveFlagRouting,
  rosterRows,
  scopeNote,
  sectorCoverageBodies,
  successionRows,
  teamTableRows,
  withEditRights,
  wouldLoop,
} from '../src/lib/org-chart-model.js';
import { ORG_TIERS } from '../src/lib/org-hierarchy.js';
import { buildOrgChartSample } from '../src/lib/org-chart-sample.js';
import { buildTradingDeskSample } from '../src/lib/org-trading-desk-sample.js';
import { buildFundAnalyticsSample } from '../src/lib/org-fund-analytics-sample.js';
import { buildAssignmentsSample } from '../src/lib/org-assignments-sample.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const who = (role, tier) => ({
  userId: 'me',
  memberId: 'm-me',
  role,
  tier,
  displayName: 'Sample Viewer',
  now: NOW,
});

const m = (id, tier, team, extra = {}) => ({
  id,
  display_name: id,
  tier,
  role: ORG_TIERS.find((t) => t.id === tier).role,
  team_id: team,
  reports_to: null,
  sectors: [],
  ...extra,
});
/* Join order is array order. */
const COUNCIL = [
  m('pres', 'president', 't-exec'),
  m('vp', 'vice_president', null, { reports_to: 'pres' }),
  m('pm-late-senior', 'analyst', 't-fin'),
  m('pm-fin', 'portfolio_manager', 't-fin', { reports_to: 'vp' }),
  m('spm-fin', 'senior_portfolio_manager', 't-fin', { reports_to: 'vp' }),
  m('an-fin', 'analyst', 't-fin', {
    reports_to: 'pm-fin',
    sectors: [{ sector: 'Financials', isPrimary: true }],
  }),
  m('sa-en', 'senior_analyst', 't-en'),
  m('an-en', 'analyst', 't-en', { reports_to: 'sa-en' }),
  m('pm-on-exec', 'portfolio_manager', 't-exec'),
  m('an-none', 'analyst', null),
  m('an-gone', 'junior_analyst', 't-deleted'),
];
const TEAMS = [
  { id: 't-fin', name: 'Financials' },
  { id: 't-en', name: 'Energy' },
  { id: 't-exec', name: 'Executive' },
  { id: 't-empty', name: 'Utilities' },
];

test('every member is drawn exactly once; nobody is dropped', () => {
  const s = buildStructure({ members: COUNCIL, teams: TEAMS });
  const drawn = [
    ...s.leadership,
    ...s.teams.flatMap((t) => [t.head, ...t.others].filter(Boolean)),
    ...s.unassigned.map((u) => u.member),
  ].map((x) => x.id);
  assert.equal(drawn.length, COUNCIL.length);
  assert.equal(new Set(drawn).size, COUNCIL.length);
  assert.deepEqual(
    s.unassigned.map((u) => [u.member.id, u.reason]),
    [
      ['pm-on-exec', 'Seated on the leadership team'],
      ['an-none', 'No team set'],
      ['an-gone', 'Team no longer exists'],
    ],
  );
  assert.ok(!s.teams.some((t) => t.id === 't-exec'), 'the leadership team is not a sector team');
  const rows = rosterRows(COUNCIL, s, 'all');
  assert.equal(rows.length, COUNCIL.length);
  assert.equal(rosterRows(COUNCIL, s, 'unassigned').length, 3);
});

test('the sector head is the portfolio manager routing uses, not the highest rank', () => {
  const s = buildStructure({ members: COUNCIL, teams: TEAMS });
  const fin = s.teams.find((t) => t.id === 't-fin');
  assert.equal(fin.head.id, 'pm-fin', 'first portfolio manager in join order');
  assert.equal(fin.topRanked.id, 'spm-fin');
  assert.equal(fin.headDiffers, true);
  const en = s.teams.find((t) => t.id === 't-en');
  assert.equal(en.head, null, 'a team of analysts has no sector head');
  assert.equal(en.headDiffers, true);
  const c = councilCounts(COUNCIL, s);
  assert.equal(c.noSectorHead, 2);
  assert.equal(c.teams, 3);
  assert.equal(c.committee, 5);
  assert.equal(c.sectorsCovered, 1);
});

test('flag routing mirrors the server rules', () => {
  const r = (flag) => resolveFlagRouting(COUNCIL, flag);
  /* pitch analyst first, then sector coverage, then the first analyst on the team */
  assert.equal(
    r({ teamId: 't-fin', sector: 'Financials', pitchAnalystId: 'an-en' }).coveringAnalyst.id,
    'an-en',
  );
  assert.equal(r({ teamId: 't-fin', sector: 'Financials' }).coveringAnalyst.id, 'an-fin');
  assert.equal(r({ teamId: 't-fin' }).coveringAnalyst.id, 'pm-late-senior');
  assert.equal(r({ teamId: 't-fin' }).sectorHead.id, 'pm-fin');
  /* a covering member outside the analyst group is not picked */
  const withPmCover = COUNCIL.map((x) =>
    x.id === 'pm-fin' ? { ...x, sectors: [{ sector: 'Energy', isPrimary: true }] } : x,
  );
  assert.equal(resolveFlagRouting(withPmCover, { sector: 'Energy' }).coveringAnalyst, null);
  /* no portfolio manager: no sector head */
  assert.equal(r({ teamId: 't-en' }).sectorHead, null);
  assert.equal(r({ teamId: 't-en' }).recipient.id, 'sa-en');
  /* the covering analyst flagging: it goes to the sector head, else an executive */
  assert.equal(r({ teamId: 't-fin', raiserId: 'pm-late-senior' }).recipient.id, 'pm-fin');
  assert.equal(r({ teamId: 't-en', raiserId: 'sa-en' }).recipient.id, 'pres');
  /* nobody on the team: the first executive, never the person flagging */
  assert.equal(r({ teamId: 't-empty' }).recipient.id, 'pres');
  assert.equal(r({ teamId: 't-empty' }).usedFallback, true);
  /* a council's only reachable executive flagging: it lands on them, as on the server */
  assert.equal(r({ teamId: 't-empty', raiserId: 'pres' }).recipient.id, 'pres');

  const rows = flagRoutingRows(COUNCIL, buildStructure({ members: COUNCIL, teams: TEAMS }));
  assert.equal(rows.at(-1).unassigned, true);
  assert.equal(rows.find((x) => x.teamId === 't-empty').noOneOnTeam, true);

  /* The server function this mirrors still reads the same things. */
  const server = read('src/lib/org-trading-server.js');
  for (const marker of [
    "c.member.role === 'analyst'",
    'c.is_primary',
    ".eq('role', 'analyst')",
    ".eq('role', 'portfolio_manager')",
    ".eq('role', 'executive')",
  ]) {
    assert.ok(server.includes(marker), `routing changed on the server: ${marker}`);
  }
});

test('coverage map lists the eleven sectors and who routing would pick', () => {
  const map = coverageMap(COUNCIL);
  assert.equal(map.length, 11);
  assert.deepEqual(
    map.map((x) => x.sector),
    GICS_SECTORS,
  );
  const fin = map.find((x) => x.sector === 'Financials');
  assert.equal(fin.routingAnalyst.id, 'an-fin');
  /* The route keeps its own list of sectors: the two must match. */
  const route = read('src/app/api/org/chart/route.js');
  for (const s of GICS_SECTORS) assert.ok(route.includes(`'${s}'`), s);
});

test('team rows join the fund book and never invent a figure', () => {
  const s = buildStructure({ members: COUNCIL, teams: TEAMS });
  const none = teamTableRows(s, null);
  assert.equal(none.rows[0].value, null);
  assert.equal(none.total.value, null);
  assert.equal(none.total.roiPct, null);
  assert.equal(none.total.members, COUNCIL.length);
  const some = teamTableRows(s, [
    { teamId: 't-fin', value: 150, roiPct: 50 },
    { teamId: 't-en', value: 100, roiPct: 0 },
    { teamId: 't-empty', value: 0, roiPct: null },
  ]);
  assert.equal(some.total.value, 250);
  assert.ok(Math.abs(some.total.roiPct - 25) < 1e-9);
  const unknown = teamTableRows(s, [
    { teamId: 't-fin', value: 150, roiPct: 50 },
    { teamId: 't-en', value: 100, roiPct: null },
    { teamId: 't-empty', value: 0, roiPct: null },
  ]);
  assert.equal(unknown.total.roiPct, null, 'a sleeve with value and no return makes the total N/A');
});

test('rank rules are the server rules', () => {
  const asPm = withEditRights(COUNCIL, 'pm-fin');
  const editable = asPm.members.filter((x) => x.editable).map((x) => x.id);
  assert.deepEqual(editable.sort(), ['an-fin', 'pm-late-senior']);
  assert.equal(asPm.viewer.canManage, true);
  const opts = rankOptions(
    asPm.members.find((x) => x.id === 'an-fin'),
    asPm.viewer,
  ).map((t) => t.id);
  assert.deepEqual(opts, [
    'junior_portfolio_manager',
    'senior_analyst',
    'quant_analyst',
    'junior_analyst',
  ]);
  assert.deepEqual(
    rankOptions(
      asPm.members.find((x) => x.id === 'vp'),
      asPm.viewer,
    ),
    [],
  );
  const asPres = withEditRights(COUNCIL, 'pres');
  assert.equal(asPres.members.filter((x) => x.editable).length, COUNCIL.length - 1);
  assert.equal(asPres.members.find((x) => x.id === 'pres').editable, false, 'never your own rank');
  const asAnalyst = withEditRights(COUNCIL, 'an-none');
  assert.equal(asAnalyst.viewer.canManage, false);
  assert.match(
    scopeNote(asAnalyst.viewer, asAnalyst.members),
    /edited by executives and portfolio managers/,
  );

  /* Sample rank change: role group and default title follow, custom title stays, logged. */
  const chart = { ...asPres, changes: [] };
  const next = applyRankChange(chart, 'an-fin', 'portfolio_manager', NOW);
  const row = next.members.find((x) => x.id === 'an-fin');
  assert.equal(row.role, 'portfolio_manager');
  assert.equal(row.title, 'Portfolio Manager');
  assert.equal(next.changes[0].old_tier, 'analyst');
  assert.equal(next.changes[0].changed_by_member_id, 'pres');
  const custom = applyRankChange(
    {
      ...chart,
      members: chart.members.map((x) => (x.id === 'an-en' ? { ...x, title: 'Head of oil' } : x)),
    },
    'an-en',
    'senior_analyst',
    NOW,
  );
  assert.equal(custom.members.find((x) => x.id === 'an-en').title, 'Head of oil');
  assert.equal(applyRankChange({ ...asPm, changes: [] }, 'vp', 'analyst', NOW), null, 'refused');
  assert.equal(
    applyRankChange({ ...asPm, changes: [] }, 'an-fin', 'president', NOW),
    null,
    'refused',
  );
});

test('member edits send only what changed, in the shape the chart route reads', () => {
  const target = {
    ...COUNCIL[5],
    title: 'Analyst',
    term_start: null,
    term_end: null,
    is_graduating: false,
  };
  const same = {
    title: 'Analyst',
    reports_to: 'pm-fin',
    term_start: '',
    term_end: '',
    is_graduating: false,
    sectors: ['Financials'],
  };
  assert.deepEqual(memberEditBody(target, same, COUNCIL), { ok: true, body: null });
  const out = memberEditBody(
    target,
    {
      ...same,
      title: ' Bank analyst ',
      term_end: '2027-05-15',
      sectors: ['Utilities', 'Financials'],
    },
    COUNCIL,
  );
  assert.deepEqual(out.body, {
    member_id: 'an-fin',
    title: 'Bank analyst',
    term_end: '2027-05-15',
    sectors: ['Financials', 'Utilities'],
  });
  assert.equal(
    memberEditBody(target, { ...same, term_start: '2027-01-01', term_end: '2026-01-01' }, COUNCIL)
      .ok,
    false,
  );
  assert.equal(
    memberEditBody(COUNCIL[1], { ...same, sectors: [], reports_to: 'pm-fin' }, COUNCIL).ok,
    false,
    'loop',
  );
  assert.equal(wouldLoop(COUNCIL, 'vp', 'an-fin'), true);
  assert.equal(wouldLoop(COUNCIL, 'an-fin', 'vp'), false);
  assert.equal(wouldLoop(COUNCIL, 'vp', 'vp'), true);

  const applied = applyMemberEdit(COUNCIL, out.body);
  assert.deepEqual(
    applied.find((x) => x.id === 'an-fin').sectors.map((s) => s.sector),
    ['Financials', 'Utilities'],
  );

  /* The route reads exactly these keys. */
  const route = read('src/app/api/org/chart/route.js');
  for (const key of [
    'member_id',
    "'title' in body",
    "'reports_to' in body",
    "'term_start' in body",
    "'term_end' in body",
    "'is_graduating' in body",
    'body.sectors',
  ]) {
    assert.ok(route.includes(key), key);
  }
  /* Assigning a sector changes one request per member whose set changes. */
  const bodies = sectorCoverageBodies(COUNCIL, 'Financials', ['an-en']);
  assert.deepEqual(bodies, [
    { member_id: 'an-fin', sectors: [] },
    { member_id: 'an-en', sectors: ['Financials'] },
  ]);
  assert.deepEqual(sectorCoverageBodies(COUNCIL, 'Financials', ['an-fin']), []);
});

test('succession and the rank log', () => {
  const rows = successionRows([
    { id: 'a', display_name: 'A', tier: 'analyst', role: 'analyst', term_end: '2027-05-15' },
    { id: 'b', display_name: 'B', tier: 'analyst', role: 'analyst', is_graduating: true },
    {
      id: 'c',
      display_name: 'C',
      tier: 'analyst',
      role: 'analyst',
      term_end: '2026-12-15',
      is_graduating: true,
    },
    { id: 'd', display_name: 'D', tier: 'analyst', role: 'analyst' },
  ]);
  assert.deepEqual(
    rows.map((r) => r.member.id),
    ['c', 'a', 'b'],
  );
  const log = changeRows(
    [
      {
        id: 1,
        target_member_id: 'an-fin',
        changed_by_member_id: 'left',
        old_tier: 'analyst',
        new_tier: 'bogus',
        created_at: 'x',
      },
    ],
    COUNCIL,
  );
  assert.equal(log[0].by, null, 'a member who left has no name to show');
  assert.equal(log[0].from, 'Analyst');
  assert.equal(log[0].to, null);
});

test('the sample is the other org pages council', () => {
  const b = buildOrgChartSample(who('executive', 'president'));
  const desk = buildTradingDeskSample(who('executive'));
  const fa = buildFundAnalyticsSample(who('executive'));
  const work = buildAssignmentsSample(who('executive'));
  const names = (list) => list.map((x) => x.display_name).sort();
  assert.deepEqual(names(b.chart.members), names(desk.roster.members));
  assert.deepEqual(names(b.chart.members), names(work.board.roster));
  assert.deepEqual(
    b.chart.teams.map((t) => t.id).sort(),
    desk.roster.teams.map((t) => t.id).sort(),
  );
  for (const x of b.chart.members) {
    const d = desk.roster.members.find((y) => y.id === x.id);
    assert.equal(x.team_id, d.team_id, x.display_name);
    assert.equal(x.role, d.role, x.display_name);
    assert.ok(x.is_demo);
  }
  assert.equal(b.summary.performance.total_value, 240050);
  assert.deepEqual(b.summary, desk.summary);
  assert.deepEqual(Object.keys(b.scorecards).sort(), Object.keys(fa.scorecards).sort());

  const s = buildStructure(b.chart);
  assert.equal(s.unassigned.length, 0);
  assert.equal(councilCounts(b.chart.members, s).noSectorHead, 0);
  const t = teamTableRows(s, b.summary.sectors);
  assert.equal(t.total.value, 240050);
  assert.ok(
    Math.abs(t.total.roiPct - b.summary.performance.return_pct) < 1e-6,
    'team total equals the fund return',
  );
  assert.equal(b.chart.members.filter((x) => x.editable).length, 9);
  for (const c of b.chart.changes) assert.notEqual(c.target_member_id, c.changed_by_member_id);

  /* An analyst keeps their rights: nothing to edit, nobody to re-rank. */
  const a = buildOrgChartSample(who('analyst', 'analyst'));
  assert.equal(a.chart.viewer.canManage, false);
  assert.equal(a.chart.members.filter((x) => x.editable).length, 0);
  assert.equal(a.chart.members.length, 10);

  /* No real people in sample content. */
  const src = read('src/lib/org-chart-sample.js') + read('src/lib/org-trading-desk-sample.js');
  for (const real of [
    'Isabel Lim',
    'Joseph Machak',
    'Noah',
    'Asheber',
    'Chahfe',
    'Vukoje',
    'Bawab',
  ]) {
    assert.ok(!src.includes(real), real);
  }
});

test('the page offers only what the server accepts, and claims nothing it lacks', () => {
  const page = read('src/components/org/org-chart/OrgChart.jsx');
  const hook = read('src/components/org/org-chart/useOrgChartData.js');
  const panel = read('src/components/org/org-chart/MemberPanel.jsx');
  const sections = read('src/components/org/org-chart/Sections.jsx');
  const all = page + hook + panel + sections + read('src/components/org/org-chart/Dialogs.jsx');
  assert.ok(page.includes("'/settings?tab=organization'"), 'invites live in council settings');
  assert.ok(!all.includes('/org-team-hub/assignments'), 'Add member no longer opens Assignments');
  assert.ok(page.includes('canInvite && ('), 'invite is an executive control');
  assert.ok(read('src/app/settings/page.js').includes("key: 'organization'"));
  assert.ok(hook.includes("'/api/org/chart'") && hook.includes('/role'));
  assert.ok(!/R[1-4]\b/.test(sections + panel), 'no R1 to R4 rank codes');
  assert.ok(!/Coverage lead|Sector Head ·/.test(all));
  assert.ok(
    !all.includes('m.email') && !all.includes('member.email'),
    'contact is not read from anywhere',
  );
  assert.ok(panel.includes('<dt>Contact</dt>'));
  /* The loader does not widen the member payload. */
  const loader = read('src/app/api/org/chart/_loader.js');
  assert.ok(!/email|phone/.test(loader.match(/MEMBER_FIELDS =\s*'([^']+)'/)[1]));
  assert.ok(loader.includes("from('org_role_changes')") && !loader.includes('getAdminClient'));
  /* The route's authorization is untouched. */
  const route = read('src/app/api/org/chart/route.js');
  assert.ok(route.includes('assertOrgRole(member, MANAGER_ROLES)'));
  /* Sample writes never reach the network. */
  assert.ok(hook.indexOf('if (sampleActive) {') < hook.indexOf('await send(CHART_URL'));
  /* The old page is gone and the old address still forwards. */
  assert.ok(!fs.existsSync('src/app/(dashboard)/org-team-hub/org-chart/OrgFinalClient.jsx'));
  assert.ok(
    read('src/app/(dashboard)/org-team-hub/hierarchy/page.js').includes(
      "redirect('/org-team-hub/org-chart')",
    ),
  );
});
