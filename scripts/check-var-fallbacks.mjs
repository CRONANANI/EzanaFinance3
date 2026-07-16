#!/usr/bin/env node
/**
 * Guardrail: ban a hardcoded COLOUR literal as the fallback argument of a
 * `var()` on a surface / background / neutral / text / border token, e.g.
 *
 *   background: var(--surface-card, rgba(255, 255, 255, 0.02));  // ✖ slab
 *   color:      var(--text-primary, #f0f6fc);                    // ✖ latent
 *   border:     1px solid var(--border-primary, rgba(0,0,0,.1)); // ✖ latent
 *
 * Why this is a bug class: the theme tokens are ALWAYS defined in
 * theme-variables.css, so the hardcoded fallback can only ever fire in a
 * broken/mis-nested scope — and when it does it paints the WRONG colour
 * silently. In dark mode the classic symptom is a lighter "slab" behind
 * cards (a white rgba veil over #0a0e13). Dropping the fallback makes the
 * token authoritative and turns any real scoping bug loud instead of
 * mis-coloured.
 *
 * What is ALLOWED (intentional, not a surface — see the allow-lists below):
 *   - Accent / hue tokens:      var(--emerald, #10b981), var(--amber, …)
 *   - Per-instance dynamic tokens set via inline style(), whose CSS fallback
 *     IS their real default:    var(--group-color, #10b981)
 *   - Token → token fallbacks:  var(--x, var(--y))   (2nd arg not a colour)
 *
 *   node scripts/check-var-fallbacks.mjs             # scans src (.css/.scss)
 *   node scripts/check-var-fallbacks.mjs src/app/x   # scan a subtree
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const targets = process.argv.slice(2);
const roots = targets.length ? targets : ['src'];
const CODE_EXT = new Set(['.css', '.scss']);

// A `var()` whose SECOND argument is a colour literal: #hex, rgb/rgba(),
// hsl/hsla(). Token-name captured in group 1. `var(--x, var(--y))` and
// non-colour fallbacks (lengths, numbers, keywords) are intentionally NOT
// matched — only colour fallbacks are the target.
const VAR_COLOR_FALLBACK =
  /var\(\s*(--[a-z0-9-]+)\s*,\s*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/gi;

// Accent / hue tokens whose colour fallback is intentional (an accent, not a
// neutral surface). Matched as a case-insensitive substring of the token name,
// so `--emerald-text`, `--danger-bg`, `--accent-emerald`, etc. are all allowed.
// NB: bare `--accent` / `--primary` are grayscale neutrals in this theme, so
// "accent"/"primary" are deliberately NOT in this list.
const ACCENT_HUE =
  /(emerald|amber|gold|positive|negative|danger|warning|success|error|info|indigo|purple|violet|cyan|blue|pink|red|green|orange|teal|magenta|lime|yellow|rose|sky|mint|brand|lc-accent|ctd-sec|sec-t)/i;

// Per-instance tokens whose value is supplied by an inline `style={{...}}` at
// render time; the CSS fallback is their real default, so it MUST stay. Exact
// token names (these resolve to accent hues, e.g. #10b981 / #6366f1).
const DYNAMIC_ALLOW = new Set([
  '--group-color',
  '--layer-color',
  '--layer-glow',
  '--glow-color',
  '--org-ink',
  '--org-on-primary',
]);

function isAllowed(token) {
  return ACCENT_HUE.test(token) || DYNAMIC_ALLOW.has(token);
}

const violations = [];

function walk(p) {
  let st;
  try {
    st = statSync(p);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    if (p.includes('node_modules') || p.includes('/.next')) return;
    for (const entry of readdirSync(p)) {
      if (entry.startsWith('.')) continue;
      walk(join(p, entry));
    }
    return;
  }
  if (!CODE_EXT.has(extname(p))) return;
  const lines = readFileSync(p, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(VAR_COLOR_FALLBACK)) {
      const token = m[1];
      if (isAllowed(token)) continue;
      violations.push(`${p}:${i + 1}  ${token}   ${line.trim().slice(0, 100)}`);
    }
  });
}

for (const r of roots) walk(r);

if (violations.length) {
  console.error(
    `\n✖ ${violations.length} hardcoded colour fallback(s) inside var() on surface/neutral/text tokens.\n` +
      `  Drop the fallback so the theme token is authoritative:\n` +
      `    var(--surface-card, rgba(255,255,255,0.02))  ->  var(--surface-card)\n` +
      `  Accent-hue and inline-dynamic tokens are allowed (see scripts/check-var-fallbacks.mjs).\n`,
  );
  console.error(violations.join('\n'));
  console.error('');
  process.exit(1);
}
console.log(`✔ No hardcoded colour fallbacks inside var() on surface/neutral tokens in: ${roots.join(', ')}`);
