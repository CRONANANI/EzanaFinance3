/**
 * Guard: no em dashes in anything a user can read (Nov 2026, whole app).
 * Supersedes the scoped help-center and org guards (they still run).
 *
 * Scans src/ for the em dash, the horizontal bar and their entities in:
 *   JS/JSX string literals, template text, JSX text and attributes
 *   CSS `content:` values, JSON string values, HTML files
 * Comments, regex literals, object keys and strings used to DETECT a dash
 * (RegExp, replace, split, includes, indexOf, startsWith, endsWith, test,
 * match, search) are allowed, as is a line ending in `em-dash-ok`.
 * Fix with: node --import ./scripts/register-sonar-loader.mjs scripts/codemods/remove-em-dashes.mjs <file>
 *
 *   npm run check:no-em-dash
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');

const RE = /—|―|&mdash;|&#8212;|&#x2014;/i;
const RAW_RE = /—|―|&mdash;|&#8212;|&#x2014;|\\u2014|\\u2015/i;
const DETECT = new Set([
  'replace',
  'replaceAll',
  'split',
  'includes',
  'indexOf',
  'lastIndexOf',
  'startsWith',
  'endsWith',
  'test',
  'match',
  'search',
]);
const SKIP = [
  /src[\\/]lib[\\/]text[\\/]em-dash\.js$/,
  /node_modules/,
  /\.next/,
  /_legacy[\\/]README\.md$/,
];
const hits = [];

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((re) => re.test(p))) continue;
    if (e.isDirectory()) files(p, out);
    else if (/\.(m?js|jsx|json|css|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

const lineOf = (src, i) => src.slice(0, i).split('\n').length;
const okLine = (src, i) =>
  /em-dash-ok\s*(\*\/)?\s*$/.test(src.split('\n')[lineOf(src, i) - 1] || '');

function scanJs(f, src) {
  const ast = parser.parse(src, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
    errorRecovery: true,
  });
  const visit = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    let text = null;
    if (node.type === 'StringLiteral' || node.type === 'JSXText')
      text = src.slice(node.start, node.end);
    if (node.type === 'TemplateElement') text = node.value.raw;
    if (text && RAW_RE.test(text) && !okLine(src, node.start)) {
      const isKey =
        parent &&
        (parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') &&
        parent.key === node &&
        !parent.computed;
      const detect =
        parent &&
        ((parent.type === 'CallExpression' &&
          parent.callee?.type === 'MemberExpression' &&
          DETECT.has(parent.callee.property?.name) &&
          parent.arguments[0] === node) ||
          ((parent.type === 'NewExpression' || parent.type === 'CallExpression') &&
            parent.callee?.name === 'RegExp'));
      if (!isKey && !detect && !/Import|Export/.test(parent?.type || ''))
        hits.push(`${f}:${lineOf(src, node.start)}  ${text.trim().slice(0, 90)}`);
    }
    for (const key of Object.keys(node)) {
      if (
        [
          'loc',
          'start',
          'end',
          'leadingComments',
          'trailingComments',
          'innerComments',
          'extra',
        ].includes(key)
      )
        continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach((x) => visit(x, node));
      else if (v && typeof v.type === 'string') visit(v, node);
    }
  };
  visit(ast.program, null);
}

for (const f of files('src')) {
  const src = fs.readFileSync(f, 'utf8');
  if (!RAW_RE.test(src) && !/\\2014/.test(src)) continue;
  if (/\.(m?js|jsx)$/.test(f)) {
    try {
      scanJs(f, src);
    } catch (e) {
      hits.push(`${f}: could not parse (${e.message})`);
    }
  } else if (f.endsWith('.css')) {
    for (const m of src.matchAll(/content\s*:\s*(['"])([^'"]*)\1/g)) {
      if (/—|\\2014/.test(m[2])) hits.push(`${f}:${lineOf(src, m.index)}  ${m[0]}`);
    }
  } else if (f.endsWith('.json')) {
    for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g))
      if (RE.test(m[1])) hits.push(`${f}:${lineOf(src, m.index)}  ${m[1].slice(0, 90)}`);
  } else if (f.endsWith('.html')) {
    src.split('\n').forEach((l, i) => RE.test(l) && hits.push(`${f}:${i + 1}`));
  }
}

if (hits.length) {
  console.error(
    `Em dashes in user-facing text (${hits.length}). House style: commas, colons, periods or parentheses; null values use the en dash NA.`,
  );
  console.error(hits.slice(0, 200).join('\n'));
  process.exit(1);
}
console.log('✔ No em dashes in user-facing text');
