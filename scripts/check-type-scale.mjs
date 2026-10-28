#!/usr/bin/env node
/**
 * Type scale guard (ratchet).
 *
 * The app has thousands of hand-set font sizes from before the --type-* ramp
 * existed. Failing on all of them at once would block every PR, so this guard
 * ratchets instead: scripts/type-scale-baseline.json records how many of each
 * violation every file has today, and the guard fails only when a file goes
 * UP. Fixing a file lowers its count; run with --update to lock the lower
 * number in. A file that is not in the baseline is held to zero.
 *
 * Rules, counted per file:
 *   sub-floor     a font-size under 11px (CSS px/rem, or JSX fontSize). The
 *                 landing never sets text under 11px; neither does the app.
 *   heavy-weight  font-weight 800 or 900. The brand stops at 700; the loaded
 *                 mono face stops at 700 too, so 800 renders as faux bold.
 *   caps-tracking an uppercase rule whose letter-spacing is a literal value
 *                 instead of a token (--type-*-tracking, or a surface's
 *                 own scoped scale).
 *
 * Usage:
 *   node scripts/check-type-scale.mjs            check (CI)
 *   node scripts/check-type-scale.mjs --update   rewrite the baseline
 */
import fs from 'node:fs';
import path from 'node:path';

const BASELINE = path.join('scripts', 'type-scale-baseline.json');
const UPDATE = process.argv.includes('--update');

// Editorial and self-contained systems with their own measured type.
const EXEMPT = [
  /theme-variables\.css$/,
  /[\\/]app[\\/]fonts\.css$/,
  /[\\/]ezana-echo[\\/]/,
  /[\\/]components[\\/]echo[\\/]/,
  // Standalone documents rendered outside the app shell.
  /[\\/]api[\\/]/,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const toPx = (n, unit) => (unit === 'rem' || unit === 'em' ? n * 16 : n);

function scanCss(src) {
  const c = { 'sub-floor': 0, 'heavy-weight': 0, 'caps-tracking': 0 };
  for (const m of src.matchAll(/font-size:\s*([\d.]+)(px|rem)\b/g)) {
    if (toPx(Number(m[1]), m[2]) < 11) c['sub-floor'] += 1;
  }
  for (const m of src.matchAll(/font-weight:\s*(\d{3})\b/g)) {
    if (Number(m[1]) >= 800) c['heavy-weight'] += 1;
  }
  for (const m of src.matchAll(/\{([^{}]*)\}/g)) {
    const body = m[1];
    if (!/text-transform:\s*uppercase/.test(body)) continue;
    const ls = /letter-spacing:\s*([^;}]+)/.exec(body);
    // A token of any family (--type-*, or a surface's private scale) is fine;
    // a literal like 0.06em is the drift this rule counts.
    if (ls && !/var\(/.test(ls[1]) && !/^(0|normal|inherit)$/.test(ls[1].trim())) {
      c['caps-tracking'] += 1;
    }
  }
  return c;
}

function scanJs(src) {
  const c = { 'sub-floor': 0, 'heavy-weight': 0, 'caps-tracking': 0 };
  for (const m of src.matchAll(/fontSize:\s*['"]?([\d.]+)(px|rem)?['"]?/g)) {
    if (toPx(Number(m[1]), m[2] || 'px') < 11) c['sub-floor'] += 1;
  }
  for (const m of src.matchAll(/fontWeight:\s*['"]?(\d{3})['"]?/g)) {
    if (Number(m[1]) >= 800) c['heavy-weight'] += 1;
  }
  return c;
}

const counts = {};
for (const f of walk('src')) {
  if (!/\.(css|js|jsx)$/.test(f) || EXEMPT.some((re) => re.test(f))) continue;
  const src = stripComments(fs.readFileSync(f, 'utf8'));
  const c = f.endsWith('.css') ? scanCss(src) : scanJs(src);
  const nonzero = Object.fromEntries(Object.entries(c).filter(([, n]) => n > 0));
  if (Object.keys(nonzero).length) counts[f.split(path.sep).join('/')] = nonzero;
}

const total = (obj) =>
  Object.values(obj).reduce((acc, r) => {
    for (const [k, n] of Object.entries(r)) acc[k] = (acc[k] || 0) + n;
    return acc;
  }, {});

if (UPDATE) {
  const sorted = Object.fromEntries(
    Object.keys(counts)
      .sort()
      .map((k) => [k, counts[k]]),
  );
  fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`✔ Wrote ${BASELINE}:`, total(counts));
  process.exit(0);
}

const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const regressions = [];
const improved = [];
for (const [f, rules] of Object.entries(counts)) {
  for (const [rule, n] of Object.entries(rules)) {
    const was = base[f]?.[rule] || 0;
    if (n > was) regressions.push(`${f}  ${rule}  ${was} -> ${n}`);
  }
}
for (const [f, rules] of Object.entries(base)) {
  for (const [rule, was] of Object.entries(rules)) {
    if ((counts[f]?.[rule] || 0) < was) improved.push(f);
  }
}

if (regressions.length) {
  console.error(`\n✖ Type scale regressed in ${regressions.length} place(s):\n`);
  for (const r of regressions) console.error(`  ${r}`);
  console.error(
    '\nUse the --type-* tokens (src/app/theme-variables.css) or <Eyebrow>, <Heading>,' +
      '\n<PageHeader> from @/components/ds. Nothing under 11px, nothing over 700.\n',
  );
  process.exit(1);
}

const t = total(counts);
console.log(`✔ Type scale holds the ratchet:`, t);
if (improved.length) {
  console.log(
    `  ${new Set(improved).size} file(s) improved. Run with --update to lock the lower counts in.`,
  );
}
