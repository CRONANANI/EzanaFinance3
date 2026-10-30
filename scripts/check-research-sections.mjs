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
} = await import('@/lib/research/sectionStack');

test('six sections in tab order', () => {
  assert.deepEqual(
    SECTIONS.map((s) => s.id),
    ['overview', 'models', 'valuation', 'earnings', 'news', 'peers'],
  );
});

test('defaults to Overview with nothing pinned', () => {
  const s = initStack();
  assert.equal(s.active, DEFAULT_SECTION);
  assert.deepEqual(visibleSections(s), ['overview']);
});

test('clicking a tab replaces the unpinned section', () => {
  const s = selectSection(initStack(), 'valuation');
  assert.deepEqual(visibleSections(s), ['valuation']);
});

test('a pinned section is bumped down when another tab opens', () => {
  let s = initStack({ active: 'models' });
  s = togglePin(s, 'models');
  s = selectSection(s, 'valuation');
  assert.deepEqual(visibleSections(s), ['valuation', 'models']);
  s = selectSection(s, 'news');
  assert.deepEqual(visibleSections(s), ['news', 'models']);
});

test('most recently pinned sits directly under the active section', () => {
  let s = initStack({ active: 'models' });
  s = togglePin(s, 'models');
  s = selectSection(s, 'earnings');
  s = togglePin(s, 'earnings');
  s = selectSection(s, 'peers');
  assert.deepEqual(visibleSections(s), ['peers', 'earnings', 'models']);
});

test('opening a pinned tab moves it to the top without duplicating it', () => {
  let s = initStack({ active: 'models', pinned: ['models', 'earnings'] });
  s = selectSection(s, 'earnings');
  assert.deepEqual(visibleSections(s), ['earnings', 'models']);
});

test('switching tabs never unpins anything', () => {
  let s = initStack({ active: 'overview', pinned: ['news', 'peers'] });
  for (const id of ['models', 'valuation', 'news', 'overview']) s = selectSection(s, id);
  assert.deepEqual(s.pinned, ['news', 'peers']);
});

test('unpinning the active section keeps it on screen', () => {
  let s = initStack({ active: 'valuation', pinned: ['valuation'] });
  s = togglePin(s, 'valuation');
  assert.equal(isPinned(s, 'valuation'), false);
  assert.deepEqual(visibleSections(s), ['valuation']);
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
