/**
 * Getting Started checklist (Nov 2026): the stage and task model in
 * src/lib/onboarding/checklistConfig.js, the live trading gate's task list,
 * and the wiring (server-side completion, nav mounts, tokens only).
 *   node --no-warnings --test scripts/check-getting-started.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ALL_TASK_IDS,
  CHECKLIST_STAGES,
  LIVE_TRADING_TASK_IDS,
  STAGE_BONUS_XP,
  TASK_XP,
  TOTAL_TASKS,
  VIEW_TASK_IDS,
  deriveChecklist,
  isValidTaskId,
  missingForLiveTrading,
} from '../src/lib/onboarding/checklistConfig.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL(`../${p}`, import.meta.url));

test('19 tasks in 4 stages, unique ids, 390 XP possible', () => {
  assert.equal(TOTAL_TASKS, 19);
  assert.equal(CHECKLIST_STAGES.length, 4);
  assert.equal(new Set(ALL_TASK_IDS).size, 19);
  assert.equal(19 * TASK_XP + 4 * STAGE_BONUS_XP, 390);
  assert.equal(isValidTaskId('mock.first_trade'), true);
  assert.equal(isValidTaskId('learning_1'), false);
});

test('every task links to a real page', () => {
  for (const t of CHECKLIST_STAGES.flatMap((s) => s.tasks)) {
    const path = t.href.split('?')[0].replace(/^\//, '');
    const ok =
      exists(`src/app/(dashboard)/${path}/page.js`) ||
      exists(`src/app/${path}/page.js`) ||
      /^learning-center\/course\//.test(path);
    assert.ok(ok, `${t.id} -> ${t.href}`);
  }
});

test('stages are sequential; early progress in a locked stage is kept', () => {
  const v0 = deriveChecklist([]);
  assert.deepEqual(
    v0.stages.map((s) => s.status),
    ['active', 'next-locked', 'locked', 'locked'],
  );
  assert.equal(v0.nextTask.id, 'basics.create_account');
  const v = deriveChecklist([...CHECKLIST_STAGES[0].tasks.map((t) => t.id), 'mock.first_trade']);
  assert.deepEqual(
    v.stages.map((s) => s.status),
    ['complete', 'active', 'next-locked', 'locked'],
  );
  assert.equal(v.stages[3].doneN, 1, 'early mock trade is kept');
  assert.equal(v.xp, 5 * TASK_XP + STAGE_BONUS_XP + TASK_XP);
  assert.equal(v.tasksLeftInStage, 5);
});

test('Resume skips tasks that are coming soon', () => {
  const firstTwo = CHECKLIST_STAGES.slice(0, 2).flatMap((s) => s.tasks.map((t) => t.id));
  const v = deriveChecklist([...firstTwo, 'watchlist.add_three']);
  assert.equal(v.activeStage.id, 'watchlist');
  assert.equal(v.nextTask.id, 'watchlist.compare_two', 'price alert is skipped');
});

test('live trading needs every task whose feature exists, never a coming-soon one', () => {
  const soon = CHECKLIST_STAGES.flatMap((s) => s.tasks)
    .filter((t) => t.soon)
    .map((t) => t.id);
  assert.deepEqual(soon.sort(), [
    'mock.readiness_check',
    'mock.stop_loss',
    'watchlist.price_alert',
  ]);
  assert.equal(LIVE_TRADING_TASK_IDS.length, 16);
  assert.ok(soon.every((id) => !LIVE_TRADING_TASK_IDS.includes(id)));
  assert.equal(missingForLiveTrading(LIVE_TRADING_TASK_IDS).length, 0);
  assert.equal(deriveChecklist(LIVE_TRADING_TASK_IDS).liveTradingUnlocked, true);
  assert.equal(deriveChecklist(LIVE_TRADING_TASK_IDS).allDone, false);
  assert.equal(missingForLiveTrading([])[0].title, 'Create your account');
});

test('only page views can be reported by the browser', () => {
  assert.equal(VIEW_TASK_IDS.length, 6);
  const view = read('src/app/api/onboarding/checklist/view/route.js');
  assert.match(view, /isViewTaskId\(taskId\)/);
  const get = read('src/app/api/onboarding/checklist/route.js');
  assert.doesNotMatch(get, /export const POST/);
  assert.match(get, /reconcileChecklist\(user\.id/);
});

test('server code completes the tasks it proves; live trading is gated', () => {
  const wires = {
    'src/app/api/learning/progress/route.js': /basics\.first_quiz/,
    'src/app/api/mock-trades/route.js': /mock\.first_trade/,
    'src/app/api/watchlists/[listId]/items/route.js': /watchlist\.add_three/,
    'src/app/api/onboarding/complete/route.js': /basics\.investor_profile/,
    'src/app/api/trading/orders/route.js': /liveTradingGate\(user\.id\)/,
    'src/app/api/trading/create-account/route.js': /liveTradingGate\(user\.id\)/,
  };
  for (const [file, re] of Object.entries(wires)) assert.match(read(file), re, file);
  const lib = read('src/lib/onboarding/completeTask.js');
  assert.match(lib, /import 'server-only'/);
  assert.match(lib, /getAdminClient/);
  assert.doesNotMatch(lib, /createClient\(/);
});

test('mounted in both navbars; Bootstrap Icons; tokens only; no em dashes', () => {
  assert.match(read('src/components/Layout/Navbar.js'), /<GettingStartedChecklist \/>/);
  assert.match(
    read('src/components/partner/PartnerNavbar.jsx'),
    /<GettingStartedChecklist variant="partner" \/>/,
  );
  const jsx = read('src/components/onboarding/GettingStartedChecklist.jsx');
  assert.doesNotMatch(jsx, /lucide-react/);
  assert.ok(!jsx.includes('—'));
  const css = read('src/components/onboarding/getting-started-checklist.css').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.gsc--partner/);
});
