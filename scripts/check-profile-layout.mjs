#!/usr/bin/env node
/**
 * Profile page (Nov 2026): canvas edges, borderless cards, achievements.
 *   node --no-warnings --test scripts/check-profile-layout.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const R = 'src/components/profile/redesign/';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CARDS = [
  'IdentityHero',
  'PerfStatCard',
  'Achievements',
  'PerfChart',
  'EloRatingCard',
  'WaysToImprove',
  'TradeNotesPanel',
  'CreatorTrackRecord',
];

test('page canvas: no side padding on the body or the breadcrumb bar', () => {
  const css = read(`${R}profile-redesign.css`);
  assert.match(css, /\.profile-stripe-body \{[^}]*padding: 20px 0 40px;/);
  assert.doesNotMatch(css, /padding: 16px;/);
  assert.match(read(`${R}ProfileNav.jsx`), /padding: '12px 0'/);
});

test('cards: no outline, border or shadow', () => {
  for (const c of CARDS) {
    const src = read(`${R}${c}.jsx`);
    assert.doesNotMatch(
      src,
      /border: `1px solid \$\{page\.border\}`,\s*borderRadius: shape\.radius\.card,/,
      `${c} card has no border`,
    );
    assert.doesNotMatch(src, /boxShadow: shape\.shadow\.(card|hero)/, `${c} card has no shadow`);
  }
});

test('columns end on the same line', () => {
  const css = read(`${R}profile-redesign.css`);
  assert.match(
    css,
    /\.profile-stripe-left > :last-child,\s*\.profile-stripe-right > :last-child \{\s*flex: 1 0 auto;/,
  );
  assert.match(read(`${R}PerfChart.jsx`), /className="profile-stripe-perf"/);
});

test('achievements: responsive grid, Bootstrap Icons, progress on a 0..1 scale', async () => {
  const css = read(`${R}profile-redesign.css`);
  assert.match(css, /\.pach-grid \{[^}]*repeat\(auto-fill, minmax\(118px, 1fr\)\)/);
  const card = read(`${R}AchievementCard.jsx`);
  assert.match(card, /className=\{`bi /);
  assert.doesNotMatch(card + read(`${R}Achievements.jsx`), /[♛$◆✦]['"<]|iconGlyph/);
  const mappers = read(`${R}mappers.js`);
  const body = mappers.slice(mappers.indexOf('export function achievementProgress'));
  const fn = new Function(
    `${body.slice(0, body.indexOf('\n}\n') + 2).replace('export ', '')}; return achievementProgress;`,
  )();
  assert.equal(fn(93), 0.93);
  assert.equal(fn(100), 1);
  assert.equal(fn(0.5), 0.5);
  assert.equal(fn(9300), 1);
  assert.equal(fn(undefined), 0);
});
