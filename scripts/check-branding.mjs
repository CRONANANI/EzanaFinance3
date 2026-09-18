#!/usr/bin/env node
/**
 * Branding guard.
 *
 * Enforces the platform branding contract so the v2 normalization cannot
 * drift back. Hard-fails on:
 *
 *   1. Raw brand hex in CSS outside the sanctioned exclusion list.
 *   2. References to tokens that do not exist: --border-color, --text-tertiary,
 *      --mono, --sans.
 *   3. Raw font-family stacks naming JetBrains or Jakarta (the tokens are
 *      --font-mono / --font-sans, defined in :root).
 *   4. A recharts `tick` prop whose fontSize is anything but 11.
 *   5. Raw border-radius px values outside the token scale.
 *
 * Usage: node scripts/check-branding.mjs [paths...]   (default: src)
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const TARGETS = roots.length ? roots : ['src'];

// ── Sanctioned exceptions ────────────────────────────────────────────────
// theme-variables.css defines the tokens; Echo is an editorial exception with
// its own --echo-* system; broadsheet.css owns the private --bs-* palette for
// its light editorial card; the alias layers resolve to the ramp; the device
// showcase paints hardware chrome; DimensionScrollSection and LandingHero are
// shared components held out of the migration.
const EXEMPT = [
  /theme-variables\.css$/,
  /[\\/]ezana-echo[\\/]/,
  /[\\/]components[\\/]echo[\\/]/,
  /broadsheet\.css$/,
  /dataset-type\.css$/,
  /dimension-scroll\.css$/,
  /hero-device-showcase\.css$/,
  /landing-hero\.css$/,
  /[\\/]app-legacy[\\/]/,
  // Standalone documents rendered outside the app shell (an exported research
  // page, a generated PDF). The --font-* tokens do not exist in those
  // documents, so a literal stack is the only thing that works there.
  /[\\/]social2[\\/]ResearchLibrary\.jsx$/,
  /[\\/]api[\\/]org[\\/]reports[\\/].*[\\/]pdf[\\/]route\.js$/,
];

// ── Pending hand review (brand-hex only) ─────────────────────────────────
// 29 rules across these files still hardcode a brand hex INSIDE a light-mode
// override, where the raw value is the dark-palette colour rather than the
// light one. The v2 command is explicit that these go file by file and that
// the fix is usually deleting the rule so the token flips by itself, which is
// a judgement per rule rather than a codemod. They are exempted from the
// brand-hex rule only, so every other rule still applies to these files and
// no NEW hex can be added to the rest of the tree.
//
// Delete entries from this list as the hand pass lands. When it is empty,
// delete the list.
const PENDING_BRAND_HEX = [
  'src/app/(dashboard)/changelog/changelog.css',
  'src/app/(dashboard)/home-dashboard/home-dashboard.css',
  'src/app/(dashboard)/inside-the-capitol/inside-the-capitol.css',
  'src/app/(dashboard)/learning-center/course/[courseId]/learning-course.css',
  'src/app/(dashboard)/onboarding/onboarding.css',
  'src/app/(dashboard)/org-trading/org-trading.css',
  'src/app/(dashboard)/pricing/pricing.css',
  'src/app/(dashboard)/trading/trading.css',
  'src/app/landing-light-mode.css',
  'src/app/mobile-responsive.css',
  'src/app/partner-light-mode.css',
  'src/app/settings/settings-partner.css',
  'src/app/settings/settings.css',
  'src/app/subscribe/subscribe.css',
  'src/components/home/home-terminal-summary.css',
  'src/components/leaderboard/redesign/elo-redesign.css',
  'src/components/research/market/market-portfolio.css',
  'src/components/trading/reset-portfolio-modal.css',
].map((p) => p.split('/').join(path.sep));

const BRAND_HEX = /#(?:10b981|059669|047857|34d399|ef4444|d4a853|d4af37|f59e0b|fbbf24|3b82f6)\b/gi;
const DEAD_TOKENS = /var\(\s*--(?:border-color|text-tertiary|mono|sans)\s*\)/g;
const RAW_STACK = /font-family:[^;}]*(?:JetBrains|Jakarta)/gi;
const TICK_FONTSIZE = /tick=\{\{[^{}]*fontSize:\s*(\d+)/g;
// 50%, 999px and 9999px are pill/circle idioms and stay.
const RAW_RADIUS = /border-radius:\s*([^;}]+)/g;
const RADIUS_OK = new Set([4, 8, 12, 16]);

const findings = [];
const add = (file, line, rule, text) => findings.push({ file, line, rule, text });
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) return [dir];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

const files = TARGETS.flatMap((t) => walk(t)).filter(
  (f) => /\.(css|js|jsx)$/.test(f) && !EXEMPT.some((re) => re.test(f)),
);

// Blank out comment bodies (keeping newlines so line numbers stay true) before
// scanning. A palette documented in a file header is not a declaration.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

for (const f of files) {
  const src = stripComments(fs.readFileSync(f, 'utf8'));
  const isCss = f.endsWith('.css');

  if (isCss && !PENDING_BRAND_HEX.includes(f)) {
    for (const m of src.matchAll(BRAND_HEX)) {
      add(f, lineOf(src, m.index), 'brand-hex', `${m[0]} — use the matching token`);
    }
  }

  if (isCss) {
    for (const m of src.matchAll(RAW_RADIUS)) {
      const parts = m[1].trim().split(/\s+/);
      for (const p of parts) {
        const px = /^(\d+)px$/.exec(p);
        if (!px) continue;
        const n = Number(px[1]);
        // Only the 2-18px band snaps to the scale. 0/1px hairlines, the
        // 999px+ pill idiom and deliberately large radii are not drift.
        if (n < 2 || n > 18 || RADIUS_OK.has(n)) continue;
        add(f, lineOf(src, m.index), 'raw-radius', `${p} — snap to a --radius-* token`);
      }
    }
  }

  for (const m of src.matchAll(DEAD_TOKENS)) {
    add(f, lineOf(src, m.index), 'dead-token', `${m[0]} — this token does not exist`);
  }
  for (const m of src.matchAll(RAW_STACK)) {
    add(f, lineOf(src, m.index), 'raw-font-stack', 'use var(--font-mono) / var(--font-sans)');
  }
  if (!isCss) {
    for (const m of src.matchAll(TICK_FONTSIZE)) {
      if (m[1] !== '11') {
        add(
          f,
          lineOf(src, m.index),
          'chart-tick',
          `fontSize: ${m[1]} — axis ticks are 11px (CHART.tick)`,
        );
      }
    }
  }
}

if (findings.length === 0) {
  console.log(`✔ Branding guard clean in: ${TARGETS.join(', ')}`);
  process.exit(0);
}

const byRule = findings.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] || 0) + 1), acc), {});
console.error(`\n✖ ${findings.length} branding violation(s).\n`);
for (const [rule, n] of Object.entries(byRule)) console.error(`  ${rule}: ${n}`);
console.error('');
for (const f of findings.slice(0, 80)) {
  console.error(`${f.file}:${f.line}  ${f.rule}  ${f.text}`);
}
if (findings.length > 80) console.error(`... and ${findings.length - 80} more`);
console.error('\nSee the exclusion list at the top of scripts/check-branding.mjs.\n');
process.exit(1);
