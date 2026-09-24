/**
 * Sonar band vertical budget check.
 *
 * 05-ACCEPTANCE.md requires the rendered zones to sum to the viewport height at
 * every breakpoint, and 07-EZANA-INTEGRATION.md requires the four measured
 * anchors to be reproduced within 1px. Both are arithmetic, so both are checked
 * here rather than measured off a screenshot: a browser pass tells you the
 * build was right on the machine that ran it, this tells you the system is
 * right everywhere.
 *
 * Usage: node scripts/check-sonar-budget.mjs
 */

import {
  ANCHORS,
  geometryFor,
  tierFor,
  zoneSum,
} from '../src/components/landing/sonar-geometry.js';

const TOL = 1;
const failures = [];
const fail = (msg) => failures.push(msg);

/* 1. The four anchors reproduce 04-SPEC.md section 1 exactly. */
const ZONES = [
  'nav',
  'padTop',
  'eyebrow',
  'g1',
  'head',
  'g2',
  'sub',
  'g3',
  'work',
  'g4',
  'arrow',
  'padBot',
];

for (const a of ANCHORS) {
  const g = geometryFor(a.w, a.h);
  for (const z of ZONES) {
    const want =
      z === 'work' ? a.h - ZONES.filter((x) => x !== 'work').reduce((s, x) => s + a[x], 0) : a[z];
    const got = g[z];
    if (Math.abs(got - want) > TOL) {
      fail(`${a.w}x${a.h} zone ${z}: got ${got.toFixed(2)}, table says ${want}`);
    }
  }

  /* The derived offsets the spec prints alongside the table. */
  const derived = {
    headTop: a.nav + a.padTop + a.eyebrow + a.g1,
    subTop: a.nav + a.padTop + a.eyebrow + a.g1 + a.head + a.g2,
    workTop: a.nav + a.padTop + a.eyebrow + a.g1 + a.head + a.g2 + a.sub + a.g3,
    arrowTop: a.h - a.padBot - a.arrow,
  };
  for (const [k, want] of Object.entries(derived)) {
    if (Math.abs(g[k] - want) > TOL) {
      fail(`${a.w}x${a.h} offset ${k}: got ${g[k].toFixed(2)}, expected ${want}`);
    }
  }
}

/* 2. The budget sums to the viewport at EVERY viewport in the matrix, not only
      at the anchors. This is the property the lock depends on. */
const MATRIX = [
  [1280, 720],
  [1280, 800],
  [1280, 680],
  [1366, 768],
  [1440, 900],
  [1512, 982],
  [1536, 864],
  [1600, 900],
  [1680, 1050],
  [1728, 1117],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
  [1024, 768],
  [768, 1024],
  [820, 1180],
  [360, 800],
  [375, 667],
  [390, 844],
  [412, 915],
  [430, 932],
  [844, 390],
];

for (const [w, h] of MATRIX) {
  const g = geometryFor(w, h);
  const sum = zoneSum(g);
  if (Math.abs(sum - h) > TOL) {
    fail(`${w}x${h}: zones sum to ${sum.toFixed(2)}, viewport is ${h}`);
  }

  /* 3. The right stack's two cards plus their 16 gap equal the work area. */
  if (Math.abs(g.chartH + 16 + g.newsH - g.work) > TOL) {
    fail(`${w}x${h}: chart ${g.chartH} + 16 + news ${g.newsH} != work ${g.work}`);
  }

  /* 4. Eight dataset rows and their gaps fit inside the sourced-matches card,
        or the row height is at its floor and the list scrolls. 05-ACCEPTANCE.md
        calls this out as the case that overflows if you scale the 1440 numbers,
        and it is also the case a per-tier row height gets wrong. */
  const rowsBox = g.work - 32 - 16 - 12;
  const rowsNeed = 8 * g.rowH + 7 * g.rowGap;
  if (rowsNeed > rowsBox + TOL && !g.rowsScroll) {
    fail(
      `${w}x${h}: 8 rows need ${rowsNeed.toFixed(1)} but the card body is ${rowsBox.toFixed(1)} (rowH ${g.rowH.toFixed(1)}) and the list does not scroll`,
    );
  }
  if (g.rowH < 28 - 0.001 || g.rowH > 69 + 0.001) {
    fail(`${w}x${h}: row height ${g.rowH.toFixed(1)} is outside the 28 to 69 band`);
  }

  /* 5. The three columns plus their gaps equal the content box exactly. */
  if (!g.phone && Math.abs(g.colL + g.colC + g.colR + 2 * g.gap - g.content) > TOL) {
    fail(`${w}x${h}: columns do not sum to the content box`);
  }

  /* 6. The hub label never goes below the 12px floor the spec sets. */
  if (g.orbHubLabelMini < 12 - 0.001) {
    fail(`${w}x${h}: mini hub label ${g.orbHubLabelMini.toFixed(2)}px is under the 12px floor`);
  }

  /* 7. Nothing may be negative; a negative zone means the budget broke. */
  for (const z of ZONES) {
    if (g[z] < 0) fail(`${w}x${h}: zone ${z} is negative (${g[z]})`);
  }
}

/* 8. The tiers resolve as 07 C.3 describes. */
const TIERS = [
  [1920, 1080, 'tall'],
  [1600, 960, 'tall'],
  [1440, 900, 'standard'],
  [1366, 800, 'standard'],
  [1280, 800, 'compact'],
  [1366, 768, 'compact'],
  [1440, 690, 'short'],
  [1280, 680, 'short'],
  [820, 1180, 'tablet'],
  [768, 1024, 'tablet'],
  [390, 844, 'phone'],
  [844, 390, 'unlocked'],
];
for (const [w, h, want] of TIERS) {
  const got = tierFor(w, h);
  if (got !== want) fail(`tier at ${w}x${h}: got ${got}, expected ${want}`);
}

if (failures.length) {
  console.error('Sonar budget check FAILED:\n');
  for (const f of failures) console.error('  ' + f);
  console.error(`\n${failures.length} problem(s).`);
  process.exit(1);
}

console.log(
  `✔ Sonar vertical budget: ${ANCHORS.length} anchors reproduced, ${MATRIX.length} viewports sum exactly`,
);
