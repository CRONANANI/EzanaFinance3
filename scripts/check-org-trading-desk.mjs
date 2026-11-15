/**
 * Trading Desk (/org-trading, Nov 2026 redesign).
 *   npm run test:org-trading-desk
 *
 * Pure checks on the page model and the sample bundle, plus source guards for
 * the rules that are easy to regress: the desk is not an order screen, answers
 * come from routed recipients only, the inbox route keeps its three lists, and
 * sample content reconciles with the Command Center sample.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FLAG_TAB_QUERY,
  accountabilityGaps,
  aggregateFlagAccuracy,
  allocationSlices,
  buildHoldingRows,
  convictionWord,
  filterHoldings,
  flagDeadline,
  flagEvidenceLabels,
  flagRecipients,
  flagsForTab,
  fmtShare,
  fmtSignedMoney,
  holdingsTotals,
  isRoutedRecipient,
  reviewState,
  scopeHoldings,
  todayChange,
} from '../src/lib/org-trading-desk.js';
import { buildTradingDeskSample } from '../src/lib/org-trading-desk-sample.js';
import { buildCommandCenterSample } from '../src/lib/org-command-center-sample.js';
import { SUGGESTED_ACTIONS, CONVICTIONS } from '../src/lib/org-flag-taxonomy.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const HOUR = 3600000;
const cents = (v) => Math.round(v * 100) / 100;
const sample = (role = 'executive') =>
  buildTradingDeskSample({
    userId: 'u-me',
    memberId: 'm-me',
    role,
    displayName: 'Viewer',
    now: NOW,
  });
const rowsOf = (b, withDossier = true) =>
  buildHoldingRows({
    positions: b.book.positions,
    dossier: withDossier ? b.dossier.positions : undefined,
    coverage: b.book.coverage,
    members: b.roster.members,
    teams: b.roster.teams,
    openFlags: b.flags.filter((f) => f.status === 'open'),
  });

test('formats: shares are unsigned, changes are signed, missing reads N/A', () => {
  assert.equal(fmtShare(40.084), '40.08%');
  assert.equal(fmtShare(null), 'N/A');
  assert.equal(fmtSignedMoney(1417), '+$1,417.00');
  assert.equal(fmtSignedMoney(-2176.2), '-$2,176.20');
  assert.equal(fmtSignedMoney(undefined), 'N/A');
  assert.equal(convictionWord(1), 'Low');
  assert.equal(convictionWord(2.2), 'Med');
  assert.equal(convictionWord(2.5), 'High');
  assert.equal(convictionWord(null), 'N/A');
});

test('deadline: amber under six hours, then overdue; nothing once answered', () => {
  const f = (h, status = 'open') => ({
    status,
    response_due_at: new Date(NOW + h * HOUR).toISOString(),
  });
  assert.deepEqual(flagDeadline(f(62), NOW), { label: '2d 14h', tone: 'default', overdue: false });
  assert.deepEqual(flagDeadline(f(6.5), NOW), { label: '6h', tone: 'default', overdue: false });
  assert.deepEqual(flagDeadline(f(5.9), NOW), { label: '5h', tone: 'warn', overdue: false });
  assert.deepEqual(flagDeadline(f(0.5), NOW), { label: '<1h', tone: 'warn', overdue: false });
  assert.deepEqual(flagDeadline(f(-1), NOW), { label: 'Overdue', tone: 'neg', overdue: true });
  assert.equal(flagDeadline(f(5, 'accepted'), NOW), null);
});

test('flags: only routed recipients answer, recipients are named members', () => {
  const b = sample();
  const nvda = b.flags.find((f) => f.ticker === 'NVDA');
  assert.equal(isRoutedRecipient(nvda, 'm-me'), true);
  assert.equal(isRoutedRecipient(nvda, nvda.sector_head_member_id), true);
  assert.equal(isRoutedRecipient(nvda, nvda.raiser_member_id), false);
  assert.deepEqual(flagRecipients(nvda), ['Viewer', 'Selam Haile']);
  assert.deepEqual(flagEvidenceLabels(nvda), [
    'Chart snapshot: NVDA price chart',
    'Data center capital spending tracker',
  ]);
  for (const f of b.flags) {
    assert.ok(
      SUGGESTED_ACTIONS.some((a) => a.value === f.suggested_action),
      f.suggested_action,
    );
    assert.ok(
      CONVICTIONS.some((c) => c.value === f.conviction),
      f.conviction,
    );
    assert.equal(typeof f.escalated_to_ic, 'boolean');
    assert.equal(f.is_demo, true);
    if (f.status === 'rejected') assert.ok(f.resolution_note, 'a rejection carries its rebuttal');
  }
});

test('flag tabs: inbox, sent and resolved follow the route rules', () => {
  const b = sample();
  const inbox = flagsForTab(b.flags, 'inbox', 'm-me');
  const sent = flagsForTab(b.flags, 'sent', 'm-me');
  const resolved = flagsForTab(b.flags, 'resolved', 'm-me');
  assert.equal(inbox.length, 4);
  assert.ok(inbox.every((f) => f.status === 'open' && isRoutedRecipient(f, 'm-me')));
  assert.equal(sent.length, 2);
  assert.ok(sent.every((f) => f.raiser_member_id === 'm-me'));
  assert.equal(resolved.length, 4);
  assert.ok(resolved.every((f) => f.status !== 'open'));
  assert.equal(FLAG_TAB_QUERY.inbox, 'asRecipient=true&status=open');
  assert.equal(FLAG_TAB_QUERY.sent, 'asRaiser=true');
  assert.equal(FLAG_TAB_QUERY.resolved, 'asRaiser=true&asRecipient=true&status=closed');
  assert.equal(reviewState([]), null);
  assert.deepEqual(reviewState([{ flag_color: 'red' }]), { label: 'Red flag', tone: 'neg' });
  assert.equal(
    reviewState([{ flag_color: 'green' }, { flag_color: 'green' }]).label,
    '2 open flags',
  );
});

test('sample: the book reconciles with the Command Center sample to the cent', () => {
  const b = sample();
  const cc = buildCommandCenterSample({ userId: 'u-me', role: 'executive', now: NOW }).summary;
  const value = cents(b.book.positions.reduce((s, p) => s + p.value, 0));
  const cost = cents(b.book.positions.reduce((s, p) => s + p.cost, 0));
  assert.equal(value, cc.performance.total_value);
  assert.equal(cost, cc.performance.total_cost);
  assert.equal(b.dossier.total_value, value);
  for (const s of cc.sectors) {
    const mine = b.book.positions.filter((p) => p.team_id === s.teamId);
    assert.equal(cents(mine.reduce((x, p) => x + p.value, 0)), s.value, s.name);
    const top = [...mine].sort((x, y) => y.value - x.value).map((p) => p.ticker);
    assert.deepEqual(top.slice(0, 3), s.tickers, `${s.name} top holdings`);
  }
  const alloc = allocationSlices(b.summary.sectors, b.book.positions);
  assert.equal(cents(alloc.total), value);
  assert.equal(cents(alloc.slices.reduce((s, x) => s + x.pct, 0)), 100);
  assert.ok(
    alloc.slices.every((s) => s.pct > 0),
    'shares are unsigned',
  );
  const last = b.summary.snapshots[b.summary.snapshots.length - 1];
  assert.equal(last.value, value);
  assert.ok(todayChange(b.summary.snapshots));
  assert.equal(todayChange([last]), null);
});

test('holdings: unpriced carried at cost, accountability and gaps follow the rows', () => {
  const b = sample();
  const rows = rowsOf(b);
  assert.equal(rows.length, 12);
  assert.equal(cents(rows.reduce((s, r) => s + r.pctFund, 0)), 100);
  const hon = rows.find((r) => r.ticker === 'HON');
  assert.equal(hon.priced, false);
  assert.equal(hon.price, null);
  assert.equal(hon.value, hon.cost);
  assert.equal(hon.pl, null);
  assert.equal(hon.plPct, null);
  assert.equal(hon.analyst, null);
  assert.equal(hon.head, 'Daniel Park');
  const unh = rows.find((r) => r.ticker === 'UNH');
  assert.ok(unh.pl < 0 && unh.plPct < 0);
  assert.equal(rows.find((r) => r.ticker === 'LLY').flags.length, 2);
  assert.deepEqual(accountabilityGaps(rows), {
    uncovered: 1,
    noHead: 0,
    noTeam: 0,
    unpriced: 1,
    noThesis: 2,
  });
  const totals = holdingsTotals(rows);
  assert.equal(cents(totals.value), 240050);
  assert.equal(totals.unpriced, 1);
  assert.equal(filterHoldings(rows, { query: 'rossi' }).length, 3);
  assert.equal(filterHoldings(rows, { query: 'incretin' }).length, 1);
  assert.equal(filterHoldings(rows, { team: 'unassigned' }).length, 0);

  /* A member who cannot flag does not receive the accountability payload:
     names fall back to coverage and the roster, and the thesis is unknown. */
  const bare = rowsOf(b, false);
  const nvda = bare.find((r) => r.ticker === 'NVDA');
  assert.equal(nvda.analyst, 'Elena Rossi');
  assert.equal(nvda.head, 'Selam Haile');
  assert.equal(nvda.thesisKnown, false);
  assert.equal(accountabilityGaps(bare).noThesis, null);
});

test('role scope: whole fund, own team, covered sectors', () => {
  const exec = sample('executive');
  const all = scopeHoldings(rowsOf(exec), { role: 'executive' });
  assert.equal(all.scope, 'fund');
  assert.equal(all.mine.length, 12);

  const pm = sample('portfolio_manager');
  const team = scopeHoldings(rowsOf(pm), {
    role: 'portfolio_manager',
    teamId: pm.viewer.teamId,
    memberId: 'm-me',
    coverage: pm.book.coverage,
  });
  assert.equal(team.scope, 'team');
  assert.deepEqual(team.mine.map((r) => r.ticker).sort(), ['AAPL', 'MSFT', 'NVDA']);
  assert.equal(team.others.length, 0);

  const an = sample('analyst');
  const cov = scopeHoldings(rowsOf(an), {
    role: 'analyst',
    teamId: an.viewer.teamId,
    memberId: 'm-me',
    coverage: an.book.coverage,
  });
  assert.equal(cov.scope, 'coverage');
  assert.deepEqual(
    cov.mine.map((r) => r.ticker),
    ['NVDA'],
  );
  assert.deepEqual(cov.others.map((r) => r.ticker).sort(), ['AAPL', 'MSFT']);

  assert.equal(
    scopeHoldings(rowsOf(pm), { role: 'portfolio_manager', teamId: null }).state,
    'no-team',
  );
  assert.equal(
    scopeHoldings(rowsOf(an), {
      role: 'analyst',
      teamId: an.viewer.teamId,
      memberId: 'x',
      coverage: [],
    }).state,
    'no-coverage',
  );
});

test('accuracy: the sample table is computed from the sample flags', () => {
  const b = sample();
  const me = b.accuracy.members.find((m) => m.member_id === 'm-me');
  assert.equal(me.flags_raised, 4);
  assert.equal(me.rejected_and_wrong, 1);
  for (const m of b.accuracy.members) {
    assert.equal(m.green + m.red, m.flags_raised);
    assert.ok(m.avg_conviction >= 1 && m.avg_conviction <= 3);
    if (m.scored) assert.equal(m.accuracy_pct, Math.round((m.correct / m.scored) * 1000) / 10);
  }
  const none = aggregateFlagAccuracy([
    { id: 'a', raiser_member_id: 'x', flag_color: 'red', conviction: 'low' },
  ]);
  assert.equal(none[0].accuracy_pct, null);
});

test('source: a record of holdings, not an order screen', () => {
  const dir = 'src/components/org-trading/desk';
  const src = fs
    .readdirSync(dir)
    .filter((f) => /\.jsx?$/.test(f))
    .map((f) => read(path.join(dir, f)))
    .join('\n');
  for (const word of ['Buy', 'Sell', 'Place order', 'Review order', 'Reset portfolio', 'Paper']) {
    assert.ok(!new RegExp(`>\\s*${word}\\b`).test(src), `no "${word}" control`);
  }
  assert.ok(!/mock-portfolio|MockTrading|order-ticket/i.test(src));
  const desk = read(path.join(dir, 'TradingDesk.jsx'));
  assert.match(desk, /trades are executed\s+at the fund&apos;s broker/);
  assert.match(desk, /href="\/org-trading\/inbox"/);
  assert.match(desk, /dashboard-page-inset ez-canvas/);
  assert.match(desk, /canManagePos && \(/);
  const queue = read(path.join(dir, 'FlagQueue.jsx'));
  assert.match(queue, /open && routed && !rejecting/);
  assert.match(queue, /It does not change the position/);
  const holdings = read(path.join(dir, 'Holdings.jsx'));
  assert.match(holdings, /canManage && r\.id/);
  assert.match(read(path.join(dir, 'useTradingDeskData.js')), /method: 'DELETE'/);
});

test('source: both routes render the new page, sample route is gated', () => {
  assert.match(read('src/app/(dashboard)/org-trading/page.js'), /<TradingDesk \/>/);
  assert.match(read('src/app/(dashboard)/org-trading/inbox/page.js'), /<FlagInboxPage \/>/);
  const route = read('src/app/api/org-trading/sample/route.js');
  assert.match(route, /isCommunityDemoViewer\(user\)/);
  assert.match(route, /getCurrentOrgMember/);
  const css = read('src/components/org-trading/desk/trading-desk.css');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'tokens only');
  assert.ok(!/rgba?\(/.test(css), 'no rgb()');
  assert.ok(!/box-shadow:(?!\s*none)/.test(css), 'no shadows on the canvas');
});
