/**
 * The Sonar financial research component library (Nov 28 2026): data contracts, the component
 * registry, the adaptive planner, report templates, table views, the Desk Summary for every
 * report state, and the wiring and branding of the components.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-presentation.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  num,
  normalizePayload,
  formatFigure,
  formatChange,
  changeTone,
  isMutuallyExclusive,
  comparableSnapshots,
  splitAtGaps,
  flagLabels,
} from '../src/lib/sonar/presentation/contracts.js';
import {
  COMPONENTS,
  REGISTRY_VERSION,
  evaluate,
  getComponent,
  componentForVisType,
} from '../src/lib/sonar/presentation/registry.js';
import {
  planPresentation,
  payloadFromVisualization,
} from '../src/lib/sonar/presentation/planner.js';
import { reportFamily, orderBySlots, REPORT_TEMPLATES } from '../src/lib/sonar/presentation/templates.js';
import { tableView, textSummary } from '../src/lib/sonar/presentation/table-views.js';
import { deskStatus } from '../src/lib/sonar/presentation/desk-status.js';
import { squarify } from '../src/lib/charts/squarify.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── contracts ─────────────────────────────────────────────────────────── */

test('missing values are null, never zero', () => {
  for (const v of [null, undefined, '', 'N/A', 'n/a', '-', '—', NaN, 'abc']) assert.equal(num(v), null, String(v));
  assert.equal(num(0), 0);
  assert.equal(num('0'), 0);
  assert.equal(num('$1,234.5'), 1234.5);
  assert.equal(formatFigure(null), 'N/A');
  assert.equal(formatChange(undefined), 'N/A');
  assert.equal(formatFigure(4919865.21, 'usd'), '$4.92M');
  assert.equal(formatFigure(12.5, 'usd'), '$12.50');
  assert.equal(formatChange(9.333), '+9.33%');
  assert.equal(formatChange(-0.92), '-0.92%');
});

test('normalized payload carries every contract field', () => {
  const p = normalizePayload({ componentId: 'x', period: { from: '2026-01', to: '2026-06' }, coverage: { covered: 3, total: 4 } });
  for (const k of ['componentId', 'objective', 'dataset', 'entity', 'unit', 'currency', 'period', 'retrievedAt', 'methodology', 'evidenceIds', 'coverage', 'completeness', 'limitations', 'access', 'flags'])
    assert.ok(k in p, k);
  assert.equal(p.period.label, '2026-01 to 2026-06');
  assert.equal(p.access.entitled, true);
});

test('13F and award data carry their flags; congressional ranges are not positions', () => {
  const a = normalizePayload({ dataset: { id: 'institutional_13f' } });
  assert.ok(a.flags.snapshot);
  assert.deepEqual(flagLabels(a.flags).map((f) => f.label), ['Filing snapshot']);
  const b = normalizePayload({ dataset: { id: 'contracts_history' } });
  assert.ok(flagLabels(b.flags).some((f) => f.label === 'Award year'));
  const c = normalizePayload({ flags: { rangeEstimate: true } });
  assert.ok(flagLabels(c.flags).some((f) => f.label === 'Disclosed range'));
});

test('a rising metric is not automatically good', () => {
  assert.equal(changeTone('revenue_growth', 3), 'favourable');
  assert.equal(changeTone('debt_to_equity', 0.4), 'unfavourable');
  assert.equal(changeTone('inflation', 1.2), 'neutral');
  assert.equal(changeTone('volatility', 5), 'neutral');
  assert.equal(changeTone('unknown_metric', 5), 'neutral');
  assert.equal(changeTone('revenue_growth', null), 'neutral');
});

test('donut only for mutually exclusive categories that fit the denominator', () => {
  const parts = [{ value: 60 }, { value: 40 }];
  assert.equal(isMutuallyExclusive(parts, { exclusive: true, total: 100 }), true);
  assert.equal(isMutuallyExclusive(parts, { exclusive: false }), false, 'not flagged exclusive');
  assert.equal(isMutuallyExclusive([{ value: 70 }, { value: 50 }], { exclusive: true, total: 100 }), false, 'overlap');
  assert.equal(isMutuallyExclusive([{ value: 70 }, { value: null }], { exclusive: true }), false, 'missing value');
});

test('rank animation needs two or more real snapshots', () => {
  const rows = [{ label: 'A', value: 2 }, { label: 'B', value: 1 }];
  assert.equal(comparableSnapshots([{ period: 'Q1', rows }]).length, 0);
  assert.equal(comparableSnapshots([{ period: 'Q1', rows }, { period: 'Q2', rows }]).length, 2);
  assert.equal(comparableSnapshots([{ period: 'Q1', rows }, { period: 'Q1', rows }]).length, 0, 'duplicate periods');
});

test('lines break at missing periods', () => {
  const segs = splitAtGaps([{ y: 1 }, { y: 2 }, { y: null }, { y: 4 }]);
  assert.equal(segs.length, 2);
  assert.deepEqual(segs.map((s) => s.length), [2, 1]);
});

/* ── registry ──────────────────────────────────────────────────────────── */

test('registry: versioned, every entry complete, ids unique', () => {
  assert.match(REGISTRY_VERSION, /^sonar-components-v\d+$/);
  const ids = new Set();
  for (const c of COMPONENTS) {
    assert.ok(!ids.has(c.id), `${c.id} unique`);
    ids.add(c.id);
    for (const k of ['impl', 'label', 'objectives', 'families', 'visTypes', 'requires', 'sufficiency', 'span', 'minHeight', 'interactions', 'a11y', 'states', 'evidence', 'signature'])
      assert.ok(c[k] !== undefined, `${c.id}.${k}`);
    for (const s of ['empty', 'partial', 'unavailable', 'unsupported']) assert.ok(c.states[s], `${c.id} ${s} copy`);
    assert.ok(c.span.wide >= 1 && c.span.wide <= 12);
  }
  assert.equal(componentForVisType('timeline').id, 'financial-activity-matrix');
  assert.equal(componentForVisType('line'), null, 'mature line chart keeps its renderer');
});

test('registry: no evidence, no chart; locked stays locked', () => {
  const base = { componentId: 'exposure-breakdown', data: { parts: [{ value: 1 }, { value: 2 }], exclusive: true } };
  assert.equal(evaluate(normalizePayload(base)).state, 'unavailable');
  const withEv = normalizePayload({ ...base, evidenceIds: ['E1'] });
  assert.equal(evaluate(withEv).ok, true);
  const locked = normalizePayload({ ...base, evidenceIds: ['E1'], access: { entitled: false } });
  assert.equal(evaluate(locked).state, 'locked');
  assert.equal(evaluate(normalizePayload({ componentId: 'nope' })).state, 'unsupported');
});

test('registry: heatmap needs separately labelled area and colour measures', () => {
  const tiles = [1, 2, 3].map((i) => ({ id: `T${i}`, label: `T${i}`, area: i * 10, color: i - 2 }));
  const bad = normalizePayload({ componentId: 'investment-universe-heatmap', source: 's', data: { tiles, areaMeasure: { label: 'Market cap' } } });
  assert.equal(evaluate(bad).state, 'unsupported');
  const good = normalizePayload({ componentId: 'investment-universe-heatmap', source: 's', data: { tiles, areaMeasure: { label: 'Market cap' }, colorMeasure: { label: 'Daily return' } } });
  assert.equal(evaluate(good).ok, true);
});

/* ── planner ───────────────────────────────────────────────────────────── */

const congressTimeline = {
  id: 'congress_monthly',
  type: 'timeline',
  title: 'Congressional purchases and sales by month',
  unit: 'transactions',
  source: 'congress_sector',
  evidenceIds: ['E1'],
  series: [
    { x: '2026-01', buys: 4, sells: 2 },
    { x: '2026-02', buys: null, sells: null },
    { x: '2026-03', buys: 0, sells: 3 },
  ],
};

test('planner: timeline maps to the activity matrix with absent months kept null', () => {
  const p = payloadFromVisualization(congressTimeline);
  assert.equal(p.componentId, 'financial-activity-matrix');
  assert.equal(p.data.columns[1].buys, null, 'no record is not zero');
  assert.equal(p.data.columns[2].buys, 0, 'confirmed zero stays zero');
  assert.equal(evaluate(p).state, 'partial');
});

test('planner: a single ranking keeps the board ranking module; snapshots upgrade it', () => {
  const lb = { id: 'r', type: 'leaderboard', title: 'Holders', rows: [{ label: 'A', value: 2 }, { label: 'B', value: 1 }], evidenceIds: ['E'] };
  assert.equal(payloadFromVisualization(lb), null);
  const withSnaps = { ...lb, snapshots: [{ period: 'Q1', rows: lb.rows }, { period: 'Q2', rows: lb.rows }] };
  assert.equal(payloadFromVisualization(withSnaps).componentId, 'ranking-evolution');
});

test('planner: plan keeps fallbacks, dedupes, reports unavailable requested analyses', () => {
  const line = { id: 'l', type: 'line', title: 'Revenue', series: [{ x: 1, y: 1 }, { x: 2, y: 2 }] };
  const emptyDonut = { id: 'd', type: 'donut', title: 'Revenue by segment', parts: [], evidenceIds: ['E'] };
  const plan = planPresentation([congressTimeline, line, emptyDonut], { depth: 'deep' });
  assert.match(plan.version, /sonar-presentation-v\d/);
  const ids = plan.items.map((i) => i.id);
  assert.ok(ids.includes('congress_monthly'));
  assert.ok(ids.includes('l'), 'line keeps its own renderer');
  assert.equal(plan.items.find((i) => i.id === 'l').componentId, null);
  assert.equal(plan.items.find((i) => i.id === 'congress_monthly').componentId, 'financial-activity-matrix');
  assert.ok(plan.unavailable.some((u) => u.id === 'd'), 'requested breakdown with no data is reported, not drawn');
  assert.equal(plan.family, 'congress');
});

test('planner: never more charts than the depth allows', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, type: 'timeline', title: `Series ${i}`, source: 's', series: [{ x: 'a', v: i }, { x: 'b', v: i + 1 }] }));
  assert.ok(planPresentation(many, { depth: 'quick' }).items.length <= 2);
  assert.ok(planPresentation(many, { depth: 'standard' }).items.length <= 4);
});

/* ── templates ─────────────────────────────────────────────────────────── */

test('templates: seven report families, families resolve from domains', () => {
  assert.deepEqual(Object.keys(REPORT_TEMPLATES).sort(), ['company_fundamentals', 'congress', 'cross_dataset', 'government', 'institutional', 'macro', 'quant']);
  assert.equal(reportFamily({ domains: ['congress_trading'] }), 'congress');
  assert.equal(reportFamily({ domains: ['institutional_13f'] }), 'institutional');
  assert.equal(reportFamily({ domains: ['macro_country'] }), 'macro');
  assert.equal(reportFamily({ domains: ['institutional_13f', 'contracts_history'], composition: true }), 'cross_dataset');
  const ordered = orderBySlots(
    [{ objective: 'ranking', title: 'Top tickers' }, { objective: 'activity', title: 'By month' }],
    'congress',
  );
  assert.deepEqual(ordered.map((o) => o.slot), ['timeline', 'securities']);
});

/* ── table views and text equivalents ──────────────────────────────────── */

test('every chart has a table view with the same figures', () => {
  const p = payloadFromVisualization(congressTimeline);
  const t = tableView(p);
  assert.deepEqual(t.columns.map((c) => c.key), ['period', 'buys', 'sells']);
  assert.equal(t.rows[1].buys, null);
  assert.match(textSummary(p), /Congressional purchases and sales by month: 3 rows/);
  for (const c of COMPONENTS.filter((x) => x.a11y.includes('table-view')))
    assert.ok(tableView(normalizePayload({ componentId: c.id, data: {} })), `${c.id} table view`);
});

/* ── Desk Summary for every state ──────────────────────────────────────── */

test('desk summary: running, failed, partial, memo and complete', () => {
  const plan = { spec: { question: 'How has Pelosi traded NVDA?' } };
  assert.equal(deskStatus({ status: 'running', plan }).status, 'running');
  const failed = deskStatus({ status: 'error', error: 'Timed out.', plan });
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failed.paragraphs, ['Timed out.']);
  assert.equal(deskStatus({ status: 'done', plan }).status, 'partial');
  assert.equal(deskStatus({ status: 'done', plan, report: { format: 'investment_memo', summary: 'x' } }).status, 'memo');
  const done = deskStatus({ status: 'done', plan, report: { executiveConclusion: { text: 'Yes.' } } });
  assert.equal(done.status, 'complete');
  assert.deepEqual(done.paragraphs, ['Yes.']);
  assert.equal(
    deskStatus({ status: 'done', plan, run: { fulfillment: { status: 'unsupported', reason: 'No such metric.' } } }).status,
    'unsupported',
  );
});

/* ── shared treemap ────────────────────────────────────────────────────── */

test('one squarify for the app: tiles fill the rect, areas follow weights', () => {
  const r = squarify([{ weight: 6 }, { weight: 3 }, { weight: 1 }], 0, 0, 100, 100);
  const area = r.reduce((a, t) => a + t.w * t.h, 0);
  assert.ok(Math.abs(area - 10000) < 1e-6);
  assert.ok(Math.abs(r[0].w * r[0].h - 6000) < 1e-6);
  assert.match(read('src/components/company-research/StockHeatmap.jsx'), /from '@\/lib\/charts\/squarify'/);
  assert.doesNotMatch(read('src/components/company-research/StockHeatmap.jsx'), /function squarify/);
});

/* ── components: wiring and branding ───────────────────────────────────── */

const DIRS = ['src/components/sonar/charts/', 'src/components/sonar/cards/', 'src/components/sonar/layout/'];
const files = DIRS.flatMap((d) => readdirSync(new URL(`../${d}`, import.meta.url)).map((f) => d + f));

test('every registry implementation exists and is wired', () => {
  const visual = read('src/components/sonar/layout/SonarAdaptiveVisual.jsx');
  for (const c of COMPONENTS) {
    assert.ok(files.some((f) => f.endsWith(`/${c.impl}.jsx`)), `${c.impl}.jsx`);
    assert.match(visual, new RegExp(`${c.impl}: dynamic\\(`), `${c.impl} code-split`);
    assert.ok(getComponent(c.id));
  }
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.match(rb, /<SonarAdaptiveVisual item=\{item\}/);
  assert.match(rb, /<SonarUnavailableAnalyses items=\{unavailable\}/);
  assert.match(rb, /<SonarSelectionProvider>/);
});

test('branding: tokens only, Bootstrap Icons, no em dashes, no demo data, no random', () => {
  for (const f of files) {
    const src = read(f);
    assert.ok(!src.includes('—'), `${f}: em dash`);
    assert.doesNotMatch(src, /Math\.random/, `${f}: random`);
    assert.doesNotMatch(src, /lucide|@radix|tailwind|className="[^"]*\b(bg|text|flex|p|m)-\[/, `${f}: foreign UI kit`);
    if (f.endsWith('.css')) {
      assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${f}: hex`);
      assert.doesNotMatch(src, /rgba?\(/, `${f}: raw rgb`);
      assert.doesNotMatch(src, /--border-color|--text-tertiary/, `${f}: non-existent tokens`);
      assert.match(src, /prefers-reduced-motion/);
    } else {
      assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b/, `${f}: hex in JSX`);
      /* Demo content from the source components must not ship. */
      assert.doesNotMatch(src, /\b(installs|payouts|lead score|BTC-USD|Acme)\b/i, `${f}: demo content`);
    }
  }
});
