#!/usr/bin/env node
/**
 * Design-system enforcement: flag hardcoded hex colors so UI references theme
 * tokens (var(--…)) instead. The design-system library must stay 100% clean;
 * point it at migrated directories to gate them too.
 *
 *   node scripts/check-ds-hex.mjs                 # checks src/components/ds
 *   node scripts/check-ds-hex.mjs src/app/foo     # checks a migrated path
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const targets = process.argv.slice(2);
const roots = targets.length ? targets : ['src/components/ds'];
const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.scss']);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

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
    const found = line.match(HEX);
    if (found) violations.push(`${p}:${i + 1}  ${found.join(', ')}   ${line.trim().slice(0, 90)}`);
  });
}

for (const r of roots) walk(r);

if (violations.length) {
  console.error(
    `\n✖ ${violations.length} hardcoded hex color(s) found — reference theme tokens (var(--…)) instead:\n`,
  );
  console.error(violations.join('\n'));
  console.error('\nSee src/components/ds/README.md and src/app/theme-variables.css.\n');
  process.exit(1);
}
console.log(`✔ No hardcoded hex in: ${roots.join(', ')}`);
