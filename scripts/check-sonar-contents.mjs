/**
 * Sonar research answer contents legend (Nov 2026): the standard sections,
 * how they resolve against each report shape's heading ids, the scroll-spy
 * rule, and the wiring and branding of the legend.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-contents.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MIN_SECTIONS,
  REPORT_SECTIONS,
  activeSection,
  pickTarget,
  resolveSections,
} from '../src/lib/sonar/report-sections.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const RESEARCH = 'src/components/sonar/research/';
const labels = (secs) => secs.map((s) => s.label);

test('the standard vocabulary: twelve sections, unique keys and labels', () => {
  assert.deepEqual(
    REPORT_SECTIONS.map((s) => s.label),
    [
      'Summary',
      'Fund fit',
      'Key findings',
      'Key metrics',
      'Charts and data',
      'Scenarios',
      'Committee questions',
      'Data gaps',
      'Research team',
      'Relationships',
      'Evidence',
      'Methodology',
    ],
  );
  assert.equal(new Set(REPORT_SECTIONS.map((s) => s.key)).size, REPORT_SECTIONS.length);
  assert.equal(MIN_SECTIONS, 3);
});

test('every string target is a heading id that exists in the report components', () => {
  const src = [
    'ResearchReport.jsx',
    'FundFitMemo.jsx',
    'InvestmentMemo.jsx',
    'PositioningMemo.jsx',
    'ChallengeBanner.jsx',
    'ResearchTeamPanel.jsx',
  ]
    .map((f) => {
      try {
        return read(RESEARCH + f);
      } catch {
        return '';
      }
    })
    .join('\n');
  for (const s of REPORT_SECTIONS) {
    for (const t of s.targets) {
      if (typeof t !== 'string') continue;
      assert.ok(src.includes(`id="${t}"`), `${s.key}: ${t} is not on any heading`);
    }
  }
});

test('standard research report: sections in page order', () => {
  const ids = [
    'srr-concl-h',
    'srr-metrics-h',
    'srr-find-h',
    'srr-charts-h',
    'srr-country-h',
    'srr-team-h',
    'srr-rel-h',
    'srr-ev-h',
    'srr-lim-h',
    'srr-meth-calc-h',
  ];
  const secs = resolveSections(ids);
  assert.deepEqual(labels(secs), [
    'Summary',
    'Key metrics',
    'Key findings',
    'Charts and data',
    'Research team',
    'Relationships',
    'Evidence',
    'Methodology',
  ]);
  assert.equal(secs.find((s) => s.key === 'metrics').id, 'srr-metrics-h');
});

test('risk memo: conclusion, dashboard, risks, exhibits, scenarios, gaps', () => {
  const ids = [
    'srm-concl-h',
    'srm-dash-h',
    'srm-risks-h',
    'srm-capex-h',
    'srm-own-h',
    'srm-scn-h',
    'srm-chain-h',
    'srm-gaps-h',
    'srr-ev-h',
  ];
  assert.deepEqual(labels(resolveSections(ids)), [
    'Summary',
    'Key metrics',
    'Key findings',
    'Charts and data',
    'Scenarios',
    'Data gaps',
    'Evidence',
  ]);
});

test('positioning memo: exhibits resolve through the spm- prefix rule', () => {
  const ids = ['spm-fin-h', 'spm-gov-h', 'spm-risks-h', 'spm-concl-h', 'spm-gaps-h'];
  const secs = resolveSections(ids);
  assert.deepEqual(labels(secs), ['Charts and data', 'Key findings', 'Summary', 'Data gaps']);
  assert.equal(secs[0].id, 'spm-fin-h', 'the first exhibit stands for the section');
});

test('fund fit memo: verdict, fit checks, catalysts and headwinds, questions', () => {
  const ids = ['sff-verdict-h', 'sff-checks-h', 'sff-thesis-h', 'sff-cat-h', 'sff-q-h', 'srr-ev-h'];
  const secs = resolveSections(ids);
  assert.deepEqual(labels(secs), [
    'Summary',
    'Fund fit',
    'Key findings',
    'Committee questions',
    'Evidence',
  ]);
  assert.equal(secs.find((s) => s.key === 'fit').id, 'sff-checks-h');
});

test('a challenge banner takes the summary slot ahead of the memo conclusion', () => {
  const secs = resolveSections(['sch-h', 'srm-concl-h', 'srm-risks-h', 'srm-gaps-h']);
  assert.equal(secs.find((s) => s.key === 'summary').id, 'sch-h');
  assert.equal(secs.length, 3);
});

test('a heading is never claimed twice, and unknown ids are ignored', () => {
  const secs = resolveSections(['srr-concl-h', 'not-a-heading', 'srr-find-h']);
  assert.equal(new Set(secs.map((s) => s.id)).size, secs.length);
  assert.deepEqual(resolveSections([]), []);
  assert.equal(pickTarget(REPORT_SECTIONS[0], ['nope']), null);
});

test('scroll-spy: the last heading above the line, the last section at the bottom', () => {
  const secs = resolveSections(['srr-concl-h', 'srr-find-h', 'srr-ev-h']);
  assert.equal(activeSection(secs, [-400, 120, 900], 300), 'findings');
  assert.equal(activeSection(secs, [40, 500, 900], 300), 'summary');
  assert.equal(activeSection(secs, [600, 900, 1200], 300), 'summary', 'before the first heading');
  assert.equal(activeSection(secs, [-900, -400, 700], 300, true), 'evidence');
  assert.equal(activeSection(secs, [undefined, 100, 900], 300), 'findings');
  assert.equal(activeSection([], [], 300), null);
});

test('ResearchReport wraps every report with the legend', () => {
  const src = read(RESEARCH + 'ResearchReport.jsx');
  assert.match(src, /import ReportContents from '\.\/ReportContents'/);
  assert.match(src, /className="srr-frame"/);
  assert.match(src, /className="srr-frame-grid"/);
  assert.match(src, /<ReportContents rootRef=\{rootRef\} \/>/);
  assert.match(src, /className="srr" ref=\{rootRef\}/);
  for (const id of ['srr-metrics-h', 'srr-charts-h', 'srr-country-h']) {
    assert.ok(src.includes(`id="${id}"`), `${id} anchor`);
  }
  assert.ok(read(RESEARCH + 'FundFitMemo.jsx').includes('id="sff-cat-h"'));
});

test('ReportContents: nav landmark, aria-current, capture-phase scroll-spy, live re-scan', () => {
  const src = read(RESEARCH + 'ReportContents.jsx');
  assert.match(src, /^'use client';/);
  assert.match(src, /aria-label="Report contents"/);
  assert.match(src, /aria-current=\{active === s\.key \? 'location' : undefined\}/);
  assert.match(src, /capture: true/);
  assert.match(src, /new MutationObserver/);
  assert.match(src, /sections\.length < MIN_SECTIONS\) return null/);
});

test('branding: tokens only, sticky column and chip row, no em dashes', () => {
  const css = read(RESEARCH + 'research-report.css');
  const block = css.slice(css.indexOf('.srr-frame {'), css.indexOf('.srr-mono {'));
  assert.ok(block.length > 200, 'legend styles present');
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours');
  assert.doesNotMatch(block, /rgba?\(/, 'no raw rgb');
  assert.match(block, /container-type: inline-size/);
  assert.match(block, /@container \(min-width: 900px\)/);
  assert.match(block, /position: sticky/);
  assert.match(block, /min-height: 44px/, 'chips meet the touch target');
  assert.match(block, /scroll-margin-top/);
  assert.match(block, /var\(--emerald\)/);
  const radii = block.match(/border-radius:[^;]+;/g) || [];
  for (const r of radii) assert.match(r, /var\(--radius-|: 0;/, r);
  for (const f of ['ReportContents.jsx', 'research-report.css']) {
    assert.ok(!read(RESEARCH + f).includes('—'), `${f}: em dash`);
  }
  assert.ok(!read('src/lib/sonar/report-sections.js').includes('—'));
});
