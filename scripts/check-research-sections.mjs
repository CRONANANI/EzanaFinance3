/**
 * Company research section tabs: in-place panels with pinning. The ordering
 * rules live in src/lib/research/sectionStack.js; these checks pin them down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  initStack,
  selectSection,
  togglePin,
  visibleSections,
  isPinned,
  DEFAULT_SECTION,
  SECTIONS,
  migrateSection,
  LEGACY_SECTION_TOOL,
} = await import('@/lib/research/sectionStack');

test('seven sections in tab order', () => {
  assert.deepEqual(
    SECTIONS.map((s) => s.id),
    ['overview', 'models', 'financials', 'ownership', 'news', 'filings', 'sonar'],
  );
});

test('old section ids and pins land on Valuation Models', () => {
  assert.equal(migrateSection('valuation'), 'models');
  assert.equal(migrateSection('earnings'), 'models');
  assert.equal(migrateSection('peers'), 'models');
  assert.equal(migrateSection('nope'), null);
  assert.equal(LEGACY_SECTION_TOOL.peers, 'comps');
  assert.equal(LEGACY_SECTION_TOOL.earnings, 'earnings');
  const s = initStack({ active: 'peers', pinned: ['earnings', 'valuation', 'news'] });
  assert.equal(s.active, 'models');
  assert.deepEqual(s.pinned, ['models', 'news'], 'pins are migrated and de-duplicated');
});

test('defaults to Overview with nothing pinned', () => {
  const s = initStack();
  assert.equal(s.active, DEFAULT_SECTION);
  assert.deepEqual(visibleSections(s), ['overview']);
});

test('clicking a tab replaces the unpinned section', () => {
  const s = selectSection(initStack(), 'financials');
  assert.deepEqual(visibleSections(s), ['financials']);
});

test('a pinned section is bumped down when another tab opens', () => {
  let s = initStack({ active: 'models' });
  s = togglePin(s, 'models');
  s = selectSection(s, 'financials');
  assert.deepEqual(visibleSections(s), ['financials', 'models']);
  s = selectSection(s, 'news');
  assert.deepEqual(visibleSections(s), ['news', 'models']);
});

test('most recently pinned sits directly under the active section', () => {
  let s = initStack({ active: 'models' });
  s = togglePin(s, 'models');
  s = selectSection(s, 'ownership');
  s = togglePin(s, 'ownership');
  s = selectSection(s, 'filings');
  assert.deepEqual(visibleSections(s), ['filings', 'ownership', 'models']);
});

test('opening a pinned tab moves it to the top without duplicating it', () => {
  let s = initStack({ active: 'models', pinned: ['models', 'ownership'] });
  s = selectSection(s, 'ownership');
  assert.deepEqual(visibleSections(s), ['ownership', 'models']);
});

test('switching tabs never unpins anything', () => {
  let s = initStack({ active: 'overview', pinned: ['news', 'sonar'] });
  for (const id of ['models', 'financials', 'news', 'overview']) s = selectSection(s, id);
  assert.deepEqual(s.pinned, ['news', 'sonar']);
});

test('unpinning the active section keeps it on screen', () => {
  let s = initStack({ active: 'financials', pinned: ['financials'] });
  s = togglePin(s, 'financials');
  assert.equal(isPinned(s, 'financials'), false);
  assert.deepEqual(visibleSections(s), ['financials']);
});

test('unpinning a background section removes it', () => {
  let s = initStack({ active: 'news', pinned: ['models'] });
  s = togglePin(s, 'models');
  assert.deepEqual(visibleSections(s), ['news']);
});

test('ignores unknown ids and duplicate pins from storage', () => {
  const s = initStack({ active: 'bogus', pinned: ['models', 'models', 'nope'] });
  assert.equal(s.active, DEFAULT_SECTION);
  assert.deepEqual(s.pinned, ['models']);
  assert.equal(selectSection(s, 'nope'), s);
  assert.equal(togglePin(s, 'nope'), s);
  assert.deepEqual(initStack({ pinned: 'not-an-array' }).pinned, []);
});
