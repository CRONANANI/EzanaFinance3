#!/usr/bin/env node
/**
 * Lightweight accessibility gate. Flags the two most common, reliably
 * detectable a11y defects so new/changed UI doesn't regress:
 *   1. <img> without an alt attribute (decorative images should use alt="").
 *   2. <input type="file"> without an aria-label or id (needs a label).
 *
 *   node scripts/check-a11y.mjs                 # checks src/components/ds
 *   node scripts/check-a11y.mjs src/components/learning/video
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const targets = process.argv.slice(2);
const roots = targets.length ? targets : ['src/components/ds'];
const EXT = new Set(['.jsx', '.tsx']);

const violations = [];

function checkFile(p) {
  const src = readFileSync(p, 'utf8');

  // 1. <img ...> without alt
  const imgTags = src.match(/<img\b[\s\S]*?\/?>/g) || [];
  for (const tag of imgTags) {
    if (!/\balt\s*=/.test(tag)) {
      const idx = src.indexOf(tag);
      const line = src.slice(0, idx).split('\n').length;
      violations.push(
        `${p}:${line}  <img> without alt — add alt="" (decorative) or descriptive text`,
      );
    }
  }

  // 2. <input type="file"> without aria-label or id
  const fileInputs = src.match(/<input\b[\s\S]*?type=["']file["'][\s\S]*?\/?>/g) || [];
  for (const tag of fileInputs) {
    if (!/\baria-label\s*=/.test(tag) && !/\bid\s*=/.test(tag)) {
      const idx = src.indexOf(tag);
      const line = src.slice(0, idx).split('\n').length;
      violations.push(`${p}:${line}  file input without aria-label/id — add an accessible label`);
    }
  }
}

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
  if (EXT.has(extname(p))) checkFile(p);
}

for (const r of roots) walk(r);

if (violations.length) {
  console.error(`\n✖ ${violations.length} accessibility issue(s) found:\n`);
  console.error(violations.join('\n'));
  console.error('\nSee docs/ACCESSIBILITY_AUDIT.md and .claude/skills/a11y-review.\n');
  process.exit(1);
}
console.log(`✔ No image/file-input a11y issues in: ${roots.join(', ')}`);
