/**
 * Guard: user-facing copy says Sonar or Ezana, never Claude or Anthropic.
 *
 * Scans string literals, template text and JSX text in src/app (not the API
 * route handlers) and src/components. Exempt: model ids ("claude-..."),
 * console/throw/env lines, imports, and identifiers. Echo article content in
 * src/lib is out of scope on purpose: an article may report on Anthropic the
 * company. Usage: node scripts/check-no-vendor-copy.mjs (in npm test).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from '@babel/parser';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['src/app', 'src/components'].map((d) => join(ROOT, d));
const TERM = /\b(Claude|Anthropic)\b/;
const EXEMPT = ['src/app/api/'];

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|mjs)$/.test(e)) acc.push(full);
  }
  return acc;
}

const problems = [];
for (const file of DIRS.flatMap((d) => walk(d))) {
  const rel = relative(ROOT, file);
  if (EXEMPT.some((p) => rel.startsWith(p))) continue;
  const src = readFileSync(file, 'utf8');
  if (!TERM.test(src)) continue;
  const ast = parse(src, { sourceType: 'module', errorRecovery: true, plugins: ['jsx'] });
  const lines = src.split('\n');
  const visit = (node, parent) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((n) => visit(n, parent));
    if (!node.type) return;
    if (['ImportDeclaration', 'ExportAllDeclaration'].includes(node.type)) return;
    let text = null;
    if (node.type === 'JSXText' || node.type === 'StringLiteral') text = node.value;
    else if (node.type === 'TemplateElement') text = node.value?.cooked ?? node.value?.raw;
    if (text && TERM.test(text) && !/^claude-[\w.-]+$/.test(text.trim())) {
      const line = node.loc?.start.line || 0;
      const src0 = lines[line - 1] || '';
      if (!/console\.|throw |new Error\(|process\.env/.test(src0)) {
        problems.push(`${rel}:${line}  ${text.trim().slice(0, 100)}`);
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k.endsWith('Comments')) continue;
      const c = node[k];
      if (c && typeof c === 'object') visit(c, node);
    }
  };
  visit(ast.program, null);
}

if (problems.length) {
  console.error(
    `✖ ${problems.length} user-facing string(s) name Claude or Anthropic; say Sonar or Ezana:`,
  );
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('✔ No Claude/Anthropic names in user-facing copy');
