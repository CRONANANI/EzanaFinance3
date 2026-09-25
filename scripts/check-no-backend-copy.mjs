/**
 * Guard: no backend or infrastructure names in user-visible copy.
 *
 * The rule (see the Part 4 brief that introduced this script): user-facing copy
 * names the data's PUBLIC source — USAspending.gov, SEC EDGAR, the OECD, the
 * Treasury — never the pipeline, warehouse, database or host that moves and
 * stores it. Engineers may say whatever they need in comments, logs and thrown
 * errors; strings that reach the DOM may not.
 *
 * Scope note: the obvious shape for this check would be "scan src/app and
 * src/components, skip src/lib". That would have missed the worst offenders on
 * the tree it was written against — the help centre's security articles and the
 * contracts freshness note both live in src/lib and both render straight into
 * the page. So it scans all of src/ and earns its low false-positive rate by
 * looking only at string literals and JSX text, with the exemptions below.
 *
 * Usage: node scripts/check-no-backend-copy.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from '@babel/parser';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

/* Names that must never reach the DOM. */
const TERMS = [
  /\bBigQuery\b/i,
  /\bSupabase\b/i,
  /\bPostgres(QL)?\b/i,
  /\bClickHouse\b/i,
  /\bpgvector\b/i,
  /\bRedis\b/i,
  /\bVercel\b/i,
  /\bedge function/i,
  /\bcron\b/i,
  /\brollup table/i,
  /\bservice[ -]role\b/i,
  /\bRPC\b/,
];

/* Whole files that are exempt.
   - src/app/api/**: server route handlers. Their strings are HTTP error bodies
     and operator hints, not product copy.
   - the privacy policy: naming a sub-processor there is a legal disclosure, not
     product copy, so it is deliberately allowed. (Nothing in it names one
     today; the exemption exists so that adding one does not fail the build.)
   - src/lib/supabase/**, and the clients named below: these modules ARE the
     integration, so the vendor name is an identifier, not prose. */
const EXEMPT_PATHS = [
  'src/app/api/',
  'src/app/privacy-policy/',
  'src/lib/supabase/',
  // api-errors.js builds the same HTTP error envelopes as src/app/api/**. Its
  // strings are deliberately operator-facing ("apply the pending migrations",
  // "set SUPABASE_SERVICE_ROLE_KEY") and naming the vendor is the whole point:
  // they tell whoever runs the deployment exactly what to go and do.
  'src/lib/api-errors.js',
  'src/lib/supabase-browser.js',
  'src/lib/bigquery-client.js',
  'src/lib/cache.js',
  'src/lib/embeddings-gte.js',
  'src/middleware.js',
];

/* Individual sanctioned strings, each with the reason it is not product copy
   about our own infrastructure. */
const ALLOWED_STRINGS = new Set([
  // Blockchain RPC endpoints — a term from the subject matter being taught, not
  // a name for anything Ezana runs.
  'When RPC endpoints rate-limit requests',
]);

/* A string on one of these lines is a log line, a thrown error, a module
   specifier or a config value — none of them reach the DOM. */
const EXEMPT_LINE =
  /console\.|throw |new Error\(|process\.env|require\(|^\s*(import|export)\s|from\s+['"]|@param|@returns/;

const parseFailures = [];

/* Collect every string, template chunk and JSX text run in a file, with the
   line it sits on. Parsed rather than pattern-matched: a character scan cannot
   reliably tell JSX text from the `>` in an arrow function or a comparison, and
   the first version of this script reported a page of such false hits. */
function extractText(src, rel) {
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (err) {
    // A file we cannot parse must not get a free pass: silently skipping it is
    // exactly how a banned string would slip through unnoticed.
    parseFailures.push(`${rel}: ${err.message}`);
    return [];
  }

  // errorRecovery keeps one malformed file from halting the whole scan, but it
  // also means a broken file parses "successfully" into a partial tree whose
  // strings we may never see. Report those too, or the fail-closed promise
  // above is not real.
  if (ast.errors && ast.errors.length) {
    const first = ast.errors[0];
    parseFailures.push(`${rel}: ${first.reasonCode || first.message || 'syntax error'}`);
  }

  const out = [];
  const calleeName = (node) => {
    let n = node;
    const parts = [];
    while (n && n.type === 'MemberExpression') {
      if (n.property && n.property.name) parts.unshift(n.property.name);
      n = n.object;
    }
    if (n && n.name) parts.unshift(n.name);
    return parts.join('.');
  };

  /* Ancestors whose strings never reach the DOM. */
  const skips = (node, parent) => {
    if (!parent) return false;
    if (
      parent.type === 'ImportDeclaration' ||
      parent.type === 'ExportNamedDeclaration' ||
      parent.type === 'ExportAllDeclaration' ||
      parent.type === 'ThrowStatement'
    )
      return true;
    if (parent.type === 'NewExpression' && calleeName(parent.callee) === 'Error') return true;
    if (parent.type === 'CallExpression') {
      const name = calleeName(parent.callee);
      if (name.startsWith('console.') || name === 'require' || name === 'Error') return true;
    }
    // Object keys and member accesses are identifiers, not prose.
    if (
      (parent.type === 'ObjectProperty' || parent.type === 'ClassProperty') &&
      parent.key === node
    )
      return true;
    if (parent.type === 'MemberExpression' && parent.property === node) return true;
    return false;
  };

  const seen = new Set();
  const visit = (node, parent, chain) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, parent, chain);
      return;
    }
    if (!node.type) return;

    const skipHere = skips(node, parent) || chain.some((a) => a === 'skip');
    if (node.type === 'StringLiteral' && !skipHere) {
      out.push({ text: node.value, line: node.loc ? node.loc.start.line : 0 });
    } else if (node.type === 'TemplateElement' && !skipHere) {
      const v = (node.value && (node.value.cooked ?? node.value.raw)) || '';
      out.push({ text: v, line: node.loc ? node.loc.start.line : 0 });
    } else if (node.type === 'JSXText') {
      out.push({ text: node.value, line: node.loc ? node.loc.start.line : 0 });
    }

    const nextChain =
      node.type === 'ThrowStatement' ||
      (node.type === 'CallExpression' && calleeName(node.callee).startsWith('console.')) ||
      (node.type === 'NewExpression' && calleeName(node.callee) === 'Error')
        ? [...chain, 'skip']
        : chain;

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const child = node[key];
      if (child && typeof child === 'object') visit(child, node, nextChain);
    }
  };
  visit(ast.program, null, []);

  return out.filter((e) => {
    const k = `${e.line}:${e.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return e.text.trim().length > 0;
  });
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (EXEMPT_PATHS.some((p) => rel.startsWith(p))) continue;
  const src = readFileSync(file, 'utf8');
  if (!TERMS.some((t) => t.test(src))) continue;
  const lines = src.split('\n');
  for (const { text, line } of extractText(src, rel)) {
    if (ALLOWED_STRINGS.has(text.trim())) continue;
    const raw = lines[line - 1] || '';
    if (EXEMPT_LINE.test(raw)) continue;
    // A bare module path or identifier-ish token is not prose.
    if (/^[@\w./-]+$/.test(text.trim())) continue;
    for (const term of TERMS) {
      const m = text.match(term);
      if (m) {
        problems.push(
          `${rel}:${line}  "${m[0]}" in rendered copy\n      ${text.trim().slice(0, 140)}`,
        );
        break;
      }
    }
  }
}

if (parseFailures.length) {
  console.error('Files that could not be parsed, so could not be checked:\n');
  for (const f of parseFailures) console.error('  ' + f);
  console.error('\nFix the syntax (npm run lint will say where) and run this again.');
  process.exit(1);
}

if (problems.length) {
  console.error('Backend names found in user-visible copy:\n');
  for (const p of problems) console.error('  ' + p + '\n');
  console.error(
    `${problems.length} problem(s). User-facing copy names the PUBLIC data source, never the\n` +
      'pipeline, warehouse, database or host. Comments, logs and thrown errors are exempt.\n' +
      'If a hit is genuinely not product copy, add it to ALLOWED_STRINGS or EXEMPT_PATHS with a reason.',
  );
  process.exit(1);
}

console.log('✔ No backend names in user-visible copy');
