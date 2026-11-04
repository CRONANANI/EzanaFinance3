/**
 * One-off codemod (Nov 2026): rewrite every em dash in user-facing source
 * text (string literals, template text, JSX text and attributes) by the house
 * rule in src/lib/text/em-dash.js. Comments, regex literals and strings used
 * to DETECT a dash (RegExp, replace, split, includes, indexOf, startsWith,
 * endsWith, test) are left alone.
 *
 * A dash next to an interpolation or a `+` concatenation is a boundary: a
 * trailing one becomes ": ", a leading one ", ", and a dash that is the whole
 * text between two values becomes " · ".
 *
 *   node --import ./scripts/register-sonar-loader.mjs scripts/codemods/remove-em-dashes.mjs [--dry] [paths...]
 * Also rewrites string values in src/**\/*.json and the `content:` values in CSS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const { removeEmDashes, hasEmDash } = await import('@/lib/text/em-dash');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const roots = args.filter((a) => !a.startsWith('--'));
const SKIP = [/src\/lib\/text\/em-dash\.js$/, /scripts\//, /node_modules/, /\.next\//];
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
const EMDASH = /—|―|&mdash;|&#8212;|&#x2014;|\\u2014|\\u2015/;

function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((re) => re.test(p))) continue;
    if (e.isDirectory()) walkFiles(p, out);
    else if (/\.(m?js|jsx|json|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const norm = (raw) => raw.replace(/\\u2014/g, '—').replace(/\\u2015/g, '―');

/** Boundary-aware rewrite for text that sits next to a value. */
export function rewriteSegment(raw, { before = false, after = false } = {}) {
  let s = norm(raw);
  if (!hasEmDash(s)) return raw;
  s = s.replace(/&mdash;|&#8212;|&#x2014;|―/gi, '—');
  if (before && after && /^\s*—+\s*$/.test(s)) return s.replace(/\s*—+\s*/, ' · ');
  if (after) s = s.replace(/[ \t]*—+[ \t]*$/, ': ');
  if (before) s = s.replace(/^[ \t]*—+[ \t]*/, ', ');
  return removeEmDashes(s);
}

function isDetection(ancestors) {
  const parent = ancestors[ancestors.length - 1];
  const gp = ancestors[ancestors.length - 2];
  if (!parent) return false;
  if (
    (parent.type === 'NewExpression' || parent.type === 'CallExpression') &&
    parent.callee?.name === 'RegExp'
  )
    return true;
  if (parent.type === 'CallExpression' && parent.callee?.type === 'MemberExpression') {
    const name = parent.callee.property?.name;
    if (DETECT.has(name) && parent.arguments[0] && ancestors.length)
      return parent.arguments.indexOf(ancestors.__node) === 0;
  }
  if (
    parent.type === 'ArrayExpression' &&
    gp?.type === 'CallExpression' &&
    gp.callee?.property?.name === 'includes'
  )
    return true;
  return false;
}

function rewriteJs(file, src) {
  const ast = parser.parse(src, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
    errorRecovery: true,
  });
  const edits = [];
  const visit = (node, ancestors) => {
    if (!node || typeof node.type !== 'string') return;
    const chain = [...ancestors];
    chain.__node = node;
    const raw = src.slice(node.start, node.end);
    if (node.type === 'StringLiteral' && EMDASH.test(raw)) {
      const parent = ancestors[ancestors.length - 1];
      const isKey =
        parent &&
        (parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') &&
        parent.key === node &&
        !parent.computed;
      const inImport = parent && /Import|Export/.test(parent.type);
      if (!isKey && !inImport && !isDetection(chain)) {
        const q = raw[0];
        const inner = raw.slice(1, -1);
        const concat = parent?.type === 'BinaryExpression' && parent.operator === '+';
        const joinArg =
          parent?.type === 'CallExpression' && parent.callee?.property?.name === 'join';
        const next = joinArg
          ? rewriteSegment(inner, { before: true, after: true })
          : concat
            ? rewriteSegment(inner, { before: parent.right === node, after: parent.left === node })
            : removeEmDashes(norm(inner));
        if (next !== inner)
          edits.push([
            node.start + 1,
            node.end - 1,
            q === "'" ? next.replace(/(?<!\\)'/g, "\\'") : next,
          ]);
      }
    } else if (node.type === 'TemplateLiteral') {
      node.quasis.forEach((q, i) => {
        const r = src.slice(q.start, q.end);
        if (!EMDASH.test(r) || isDetection(ancestors)) return;
        const next = rewriteSegment(r, { before: i > 0, after: i < node.quasis.length - 1 });
        if (next !== r) edits.push([q.start, q.end, next.replace(/`/g, '\\`')]);
      });
    } else if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      const kids = node.children || [];
      kids.forEach((c, i) => {
        if (c.type !== 'JSXText') return;
        const r = src.slice(c.start, c.end);
        if (!EMDASH.test(r)) return;
        const prevExpr = i > 0 && kids[i - 1].type !== 'JSXText';
        const nextExpr = i < kids.length - 1 && kids[i + 1].type !== 'JSXText';
        const next = rewriteSegment(r, { before: prevExpr, after: nextExpr });
        if (next !== r) edits.push([c.start, c.end, next]);
      });
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
      if (node.type === 'TemplateLiteral' && key === 'quasis') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach((x) => visit(x, [...ancestors, node]));
      else if (v && typeof v.type === 'string') visit(v, [...ancestors, node]);
    }
  };
  visit(ast.program, []);
  if (!edits.length) return null;
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  for (const [s, e, t] of edits) out = out.slice(0, s) + t + out.slice(e);
  return { out, count: edits.length };
}

function rewriteJson(src) {
  /* In place, string token by string token, so the file's own formatting is
     kept. The rewrite never introduces a quote or a backslash. */
  let count = 0;
  const out = src.replace(/"((?:[^"\\\n]|\\.)*)"/g, (m, inner) => {
    const next = removeEmDashes(norm(inner));
    if (next === inner) return m;
    count += 1;
    return `"${next}"`;
  });
  if (!count) return null;
  JSON.parse(out);
  return { out, count };
}

function rewriteCss(src) {
  let count = 0;
  const out = src.replace(/(content\s*:\s*)(['"])([^'"]*)\2/g, (m, pre, q, val) => {
    if (!/—|\\2014/.test(val)) return m;
    count += 1;
    return `${pre}${q}${val.replace(/—|\\2014/g, '\\2013')}${q}`;
  });
  return count ? { out, count } : null;
}

const files = (roots.length ? roots : ['src']).flatMap((r) =>
  fs.statSync(r).isDirectory() ? walkFiles(r) : [r],
);
let total = 0;
let touched = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  if (!EMDASH.test(src) && !/\\2014/.test(src)) continue;
  let res = null;
  try {
    res = f.endsWith('.json')
      ? rewriteJson(src)
      : f.endsWith('.css')
        ? rewriteCss(src)
        : rewriteJs(f, src);
  } catch (e) {
    console.error(`skip ${f}: ${e.message}`);
    continue;
  }
  if (!res) continue;
  total += res.count;
  touched += 1;
  if (!dry) fs.writeFileSync(f, res.out);
}
console.log(`${dry ? 'would rewrite' : 'rewrote'} ${total} strings in ${touched} files`);
