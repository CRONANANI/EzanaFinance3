/**
 * Sonar research answer navigation (Nov 28 2026). Every report shape (the research board, an
 * investment memo, a run in progress, a partial, failed or unsupported result, a saved or org
 * report) sits in the one answer shell (SonarAnswerFrame) with the persistent left navigation.
 * The old contents legend (ReportContents), which rendered nothing below three sections and
 * shifted the report sideways, is gone.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-contents.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { answerNav, sectionId } from '../src/lib/sonar/answer-sections.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const RESEARCH = 'src/components/sonar/research/';

test('the old legend is gone; nothing imports it', () => {
  assert.ok(!existsSync(new URL(`../${RESEARCH}ReportContents.jsx`, import.meta.url)));
  assert.ok(!existsSync(new URL('../src/lib/sonar/report-sections.js', import.meta.url)));
  assert.doesNotMatch(read(RESEARCH + 'ResearchReport.jsx'), /ReportContents/);
});

test('a report with only a Desk Summary and evidence still gets the navigation', () => {
  const nav = answerNav(['answer', 'sources'], { unlocked: false });
  const free = nav.filter((s) => !s.locked).map((s) => s.label);
  assert.deepEqual(free, ['Desk summary', 'Evidence and sources']);
  /* The deep sections stay listed and locked: never shown as if they ran. */
  assert.ok(nav.filter((s) => s.locked).length >= 7);
});

test('open deep sections: listed open only when present, never when absent', () => {
  const nav = answerNav(['answer', 'methodology'], { unlocked: false, open: ['methodology', 'team'] });
  const m = nav.find((s) => s.key === 'methodology');
  const t = nav.find((s) => s.key === 'team');
  assert.equal(m.locked, false, 'methodology ran and is on the page');
  assert.equal(t.locked, true, 'team is not on the page, so it stays locked');
  assert.equal(m.id, sectionId('methodology'));
});

test('every report state uses the shared shell, with the Desk Summary first', () => {
  const src = read(RESEARCH + 'ResearchReport.jsx');
  assert.match(src, /import \{ SonarAnswerFrame \} from '@\/components\/sonar\/SonarAnswerFrame'/);
  assert.match(src, /<SonarAnswerFrame[\s\S]{0,200}present=\{present\}[\s\S]{0,40}open=\{openDeep\}/);
  assert.match(src, /className="srr-frame"/);
  assert.match(src, /className="srr" ref=\{rootRef\}/);
  const body = src.slice(src.indexOf('className="srr-body"'));
  const desk = body.indexOf('<ReportDeskSummary');
  for (const later of ['<Progress', '<CompositionReport', '<InvestmentMemo', '<ResearchChart']) {
    const at = body.indexOf(later);
    assert.ok(at === -1 || at > desk, `${later} comes after the Desk Summary`);
  }
  for (const id of ['srr-metrics-h', 'srr-charts-h', 'srr-country-h']) {
    assert.ok(src.includes(`id="${id}"`), `${id} anchor kept`);
  }
  for (const key of ['answer', 'metrics', 'findings', 'charts', 'team', 'relationships', 'sources', 'methodology'])
    assert.ok(src.includes(`sectionId('${key}')`), `sa-${key} anchor`);
});

test('the board: notes and a composed result follow the Desk Summary', () => {
  const rb = read(RESEARCH + 'ResearchBoard.jsx');
  assert.match(rb, /composition = null,/);
  assert.match(rb, /const firstAnswer = baseCells\.findIndex\(\(c\) => c\.section === 'answer'\)/);
  assert.doesNotMatch(rb, /\{lead \? <div className="srb-lead">\{lead\}<\/div> : null\}\s*<div className="srb-grid">/);
  const rr = read(RESEARCH + 'ResearchReport.jsx');
  assert.match(rr, /composition=\{\s*state\.composition \?/);
});

test('shell CSS: persistent menu width and controlled top spacing, tokens only', () => {
  const css = read('src/components/sonar/sonar-answer-frame.css');
  assert.match(css, /--san-nav-w: 212px;/);
  assert.match(css, /--san-nav-gap: 24px;/);
  assert.match(css, /--san-summary-gap: 18px;/);
  assert.match(css, /\.san \.san-lead > \.sds-related \{\s*margin: 0;/);
  assert.match(css, /position: sticky/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  const rr = read(RESEARCH + 'research-report.css');
  assert.doesNotMatch(rr, /\.srr-contents/);
  assert.match(rr, /\.srr-body \{/);
  for (const f of [RESEARCH + 'ResearchReport.jsx', RESEARCH + 'research-report.css', 'src/components/sonar/sonar-answer-frame.css'])
    assert.ok(!read(f).includes('—'), `${f}: em dash`);
});
