#!/usr/bin/env node
/* Schema drift check (QA MIG-1 / MIG-2).

   Static part (no credentials):
     - every `.from('x')`, `.rpc('x')` and `storage.from('x')` name in src/
     - every object supabase/migrations/*.sql creates (tables, views,
       materialized views, functions, indexes, triggers, policies, buckets),
       replayed in filename order so later drops and renames win.
     Reports code references no migration creates.

   Live part, when a catalog is available:
     - SUPABASE_DB_URL_READONLY=postgres://... (needs the `pg` package), or
     - --catalog <file.json>: the JSON object that `--print-catalog-sql`
       returns, captured from any read-only SQL client.
     Reports every migration-created object that is missing live, grouped by
     the migration that creates it, plus every code reference missing live.

   Usage:
     node scripts/check-schema-drift.mjs                 static only
     node scripts/check-schema-drift.mjs --print-catalog-sql
     node scripts/check-schema-drift.mjs --print-missing-sql   one query → missing rows
     node scripts/check-schema-drift.mjs --catalog snap.json
     SUPABASE_DB_URL_READONLY=... node scripts/check-schema-drift.mjs
   Flags: --json (machine-readable output), --strict (static misses fail too).
   Exit code: 1 when the live comparison finds missing objects (or, with
   --strict, when the static part does); 0 otherwise. Not part of npm test:
   the useful half needs credentials. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');

/* ---------- code references ---------- */

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(m?js|jsx|ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const STR_LIT = String.raw`(?:'([^'\n]+)'|"([^"\n]+)"|\x60([^\x60$\n]+)\x60)`;
/* a string literal, or an identifier resolved through a same-file const */
const STR = String.raw`(?:${STR_LIT.slice(3, -1)}|([A-Za-z_$][\w$]*))`;

function constValue(text, ident) {
  const m = new RegExp(
    String.raw`\b(?:const|let|var)\s+${ident}\s*=\s*['"\x60]([^'"\x60$\n]+)['"\x60]`,
  ).exec(text);
  return m ? m[1] : null;
}

export function collectCodeRefs(files) {
  const refs = { tables: new Map(), rpcs: new Map(), buckets: new Map() };
  const add = (map, name, where) => {
    if (!map.has(name)) map.set(name, new Set());
    map.get(name).add(where);
  };
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    const resolve = (m) => m[1] || m[2] || m[3] || (m[4] ? constValue(text, m[4]) : null);
    const lineOf = (idx) => text.slice(0, idx).split('\n').length;
    const inComment = (idx) =>
      /^\s*(\/\/|\/?\*)/.test(text.slice(text.lastIndexOf('\n', idx) + 1, idx));

    const bucketSpans = new Set();
    for (const m of text.matchAll(new RegExp(String.raw`\bstorage\s*\.from\(\s*${STR}`, 'g'))) {
      bucketSpans.add(m.index + m[0].indexOf('.from('));
      if (inComment(m.index)) continue;
      const name = resolve(m);
      if (name) add(refs.buckets, name, `${rel}:${lineOf(m.index)}`);
    }
    for (const m of text.matchAll(new RegExp(String.raw`(\w*)\.from\(\s*${STR_LIT}`, 'g'))) {
      /* string-literal args only: identifier args are almost always Array.from(x) */
      const fromIdx = m.index + m[0].indexOf('.from(');
      if (bucketSpans.has(fromIdx) || inComment(m.index)) continue;
      if (/^(Array|Buffer|Uint8Array|Set|Map|Object|String)$/.test(m[1])) continue;
      const name = m[2] || m[3] || m[4];
      if (name) add(refs.tables, name, `${rel}:${lineOf(m.index)}`);
    }
    for (const m of text.matchAll(new RegExp(String.raw`\.rpc\(\s*${STR}`, 'g'))) {
      if (inComment(m.index)) continue;
      const name = resolve(m);
      if (name) add(refs.rpcs, name, `${rel}:${lineOf(m.index)}`);
    }
  }
  return refs;
}

/* ---------- migrations ---------- */

const ID = String.raw`(?:"[^"]+"|[A-Za-z_][\w$]*)`;
const QNAME = String.raw`(${ID}(?:\s*\.\s*${ID})?)`;

function norm(q) {
  const parts = q.split('.').map((s) => s.trim().replace(/^"|"$/g, ''));
  const lower = (s) => (/[A-Z]/.test(s) && !q.includes('"') ? s.toLowerCase() : s);
  return parts.length === 2 ? `${lower(parts[0])}.${lower(parts[1])}` : `public.${lower(parts[0])}`;
}
const unq = (s) => s.replace(/^"|"$/g, '');
const schemaOf = (k) => k.split('.')[0];

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');
}

/* Ordered statement scanner: one combined pass so drop-after-create and
   create-after-drop inside one file resolve in text order. */
const PATTERNS = [
  [
    'create',
    'table',
    new RegExp(
      String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${QNAME}`,
      'gi',
    ),
  ],
  [
    'create',
    'view',
    new RegExp(
      String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?${QNAME}`,
      'gi',
    ),
  ],
  [
    'create',
    'function',
    new RegExp(
      String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+${QNAME}\s*\(`,
      'gi',
    ),
  ],
  [
    'create',
    'index',
    new RegExp(
      String.raw`\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(${ID})\s+on\s+(?:only\s+)?${QNAME}`,
      'gi',
    ),
  ],
  [
    'create',
    'trigger',
    new RegExp(
      String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+(${ID})\s[\s\S]*?\bon\s+${QNAME}`,
      'gi',
    ),
  ],
  ['create', 'policy', new RegExp(String.raw`\bcreate\s+policy\s+(${ID})\s+on\s+${QNAME}`, 'gi')],
  ['drop', 'table', new RegExp(String.raw`\bdrop\s+table\s+(?:if\s+exists\s+)?${QNAME}`, 'gi')],
  [
    'drop',
    'view',
    new RegExp(String.raw`\bdrop\s+(?:materialized\s+)?view\s+(?:if\s+exists\s+)?${QNAME}`, 'gi'),
  ],
  [
    'drop',
    'function',
    new RegExp(String.raw`\bdrop\s+(?:function|procedure)\s+(?:if\s+exists\s+)?${QNAME}`, 'gi'),
  ],
  [
    'drop',
    'index',
    new RegExp(String.raw`\bdrop\s+index\s+(?:concurrently\s+)?(?:if\s+exists\s+)?${QNAME}`, 'gi'),
  ],
  [
    'drop',
    'trigger',
    new RegExp(String.raw`\bdrop\s+trigger\s+(?:if\s+exists\s+)?(${ID})\s+on\s+${QNAME}`, 'gi'),
  ],
  [
    'drop',
    'policy',
    new RegExp(String.raw`\bdrop\s+policy\s+(?:if\s+exists\s+)?(${ID})\s+on\s+${QNAME}`, 'gi'),
  ],
  [
    'rename',
    'table',
    new RegExp(
      String.raw`\balter\s+table\s+(?:if\s+exists\s+)?${QNAME}\s+rename\s+to\s+(${ID})`,
      'gi',
    ),
  ],
];

/* A kind+key → { kind, key, file } map of what the migrations leave behind. */
export function collectMigrationObjects(files) {
  const objects = new Map();
  for (const file of files) {
    const sql = stripComments(readFileSync(file, 'utf8'));
    const base = path.basename(file);
    const hits = [];
    for (const [op, kind, re] of PATTERNS) {
      re.lastIndex = 0;
      for (const m of sql.matchAll(re)) {
        /* dynamic SQL built with format('... on public.%I', t): not a static name */
        if (m[0].includes('%') || /^\s*\.\s*%/.test(sql.slice(m.index + m[0].length))) continue;
        hits.push({ at: m.index, op, kind, m });
      }
    }
    hits.sort((a, b) => a.at - b.at);
    for (const { op, kind, m } of hits) {
      let key;
      if (kind === 'index')
        key = op === 'create' ? `${schemaOf(norm(m[2]))}.${unq(m[1])}` : norm(m[1]);
      else if (kind === 'trigger' || kind === 'policy') key = `${norm(m[2])}:${unq(m[1])}`;
      else key = norm(m[1]);
      /* tables and views share the relation namespace */
      const ns = kind === 'view' ? 'table' : kind;
      const id = `${ns}|${key}`;
      if (op === 'create') {
        if (kind === 'table' && /^pg_temp\./.test(key)) continue;
        objects.set(id, { kind, key, file: base });
      } else if (op === 'drop') {
        objects.delete(id);
      } else if (op === 'rename') {
        const prev = objects.get(id);
        objects.delete(id);
        const next = `${schemaOf(key)}.${unq(m[2])}`;
        objects.set(`table|${next}`, { kind: prev?.kind || 'table', key: next, file: base });
      }
    }
  }
  return objects;
}

/* ---------- live catalog ---------- */

export const CATALOG_SQL = `select json_build_object(
  'relations', (select coalesce(json_agg(n.nspname || '.' || c.relname), '[]'::json)
                  from pg_class c join pg_namespace n on n.oid = c.relnamespace
                 where c.relkind in ('r','p','v','m','f','i','I')
                   and n.nspname not in ('pg_catalog','information_schema','pg_toast')),
  'functions', (select coalesce(json_agg(distinct n.nspname || '.' || p.proname), '[]'::json)
                  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname not in ('pg_catalog','information_schema')),
  'triggers',  (select coalesce(json_agg(n.nspname || '.' || c.relname || ':' || t.tgname), '[]'::json)
                  from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  join pg_namespace n on n.oid = c.relnamespace
                 where not t.tgisinternal),
  'policies',  (select coalesce(json_agg(schemaname || '.' || tablename || ':' || policyname), '[]'::json)
                  from pg_policies),
  'buckets',   (select coalesce(json_agg(id), '[]'::json) from storage.buckets)
) as catalog`;

/* One self-contained, read-only query that returns only what is missing
   live: paste it into the SQL editor (or an MCP execute_sql) when no
   connection string is at hand. Rows: kind, name, source. */
export function missingSql(objects, refs, bucketsCreated) {
  const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const rows = [];
  for (const o of objects.values()) rows.push([o.kind, o.key, o.file]);
  for (const b of bucketsCreated) rows.push(['bucket', b, '(storage.buckets insert)']);
  const q = (n) => (n.includes('.') ? n : `public.${n}`);
  for (const [n, w] of refs.tables) rows.push(['table', q(n), `code ${[...w][0]}`]);
  for (const [n, w] of refs.rpcs) rows.push(['function', q(n), `code ${[...w][0]}`]);
  for (const [n, w] of refs.buckets) rows.push(['bucket', n, `code ${[...w][0]}`]);
  const values = rows.map((r) => `(${r.map(lit).join(',')})`).join(',\n');
  return `with e(kind, name, source) as (values\n${values}\n)
select kind, name, source from e
where case
  when kind in ('table','view','index') then to_regclass(quote_ident(split_part(name,'.',1)) || '.' || quote_ident(split_part(name,'.',2))) is null
  when kind = 'function' then not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                           where n.nspname = split_part(name,'.',1) and p.proname = split_part(name,'.',2))
  when kind = 'trigger' then not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
                                          where not t.tgisinternal and n.nspname || '.' || c.relname || ':' || t.tgname = name)
  when kind = 'policy' then not exists (select 1 from pg_policies where schemaname || '.' || tablename || ':' || policyname = name)
  when kind = 'bucket' then not exists (select 1 from storage.buckets b where b.id = name)
  else false end
order by source, kind, name;`;
}

async function loadLiveCatalog(argv) {
  const at = argv.indexOf('--catalog');
  if (at !== -1) {
    const raw = JSON.parse(readFileSync(argv[at + 1], 'utf8'));
    /* accept the bare object, { catalog }, or [{ catalog }] as SQL clients emit */
    const row = Array.isArray(raw) ? raw[0] : raw;
    return row?.catalog ?? row;
  }
  const url = process.env.SUPABASE_DB_URL_READONLY;
  if (!url) return null;
  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error(
      'SUPABASE_DB_URL_READONLY is set but the `pg` package is not installed (npm i --no-save pg).',
    );
    process.exit(2);
  }
  const Client = pg.default?.Client || pg.Client;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('set session characteristics as transaction read only');
    const { rows } = await client.query(CATALOG_SQL);
    return rows[0].catalog;
  } finally {
    await client.end();
  }
}

export function diffLive(objects, refs, catalog) {
  const rel = new Set(catalog.relations || []);
  const fn = new Set(catalog.functions || []);
  const trg = new Set(catalog.triggers || []);
  const pol = new Set(catalog.policies || []);
  const bkt = new Set(catalog.buckets || []);
  const has = ({ kind, key }) => {
    if (kind === 'table' || kind === 'view' || kind === 'index') return rel.has(key);
    if (kind === 'function') return fn.has(key);
    if (kind === 'trigger') return trg.has(key);
    if (kind === 'policy') return pol.has(key);
    return true;
  };
  const byFile = new Map();
  for (const o of objects.values()) {
    if (has(o)) continue;
    if (!byFile.has(o.file)) byFile.set(o.file, []);
    byFile.get(o.file).push(`${o.kind} ${o.key}`);
  }
  const codeMissing = [];
  for (const [name, where] of refs.tables) {
    if (!rel.has(name.includes('.') ? name : `public.${name}`))
      codeMissing.push({ kind: 'table', name, where: [...where] });
  }
  for (const [name, where] of refs.rpcs) {
    if (!fn.has(name.includes('.') ? name : `public.${name}`))
      codeMissing.push({ kind: 'rpc', name, where: [...where] });
  }
  for (const [name, where] of refs.buckets) {
    if (!bkt.has(name)) codeMissing.push({ kind: 'bucket', name, where: [...where] });
  }
  return { byFile: [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b)), codeMissing };
}

export function diffStatic(objects, refs) {
  const created = new Set(
    [...objects.values()].map((o) => `${o.kind === 'view' ? 'table' : o.kind}|${o.key}`),
  );
  const bucketsCreated = new Set();
  for (const f of readdirSync(MIG_DIR).filter((n) => n.endsWith('.sql'))) {
    const sql = stripComments(readFileSync(path.join(MIG_DIR, f), 'utf8'));
    for (const m of sql.matchAll(
      /insert\s+into\s+storage\.buckets[\s\S]*?values\s*([\s\S]*?)(?:on\s+conflict|;)/gi,
    )) {
      for (const t of m[1].matchAll(/\(\s*'([^']+)'/g)) bucketsCreated.add(t[1]);
    }
  }
  const q = (n) => (n.includes('.') ? n : `public.${n}`);
  const out = [];
  for (const [name, where] of refs.tables)
    if (!created.has(`table|${q(name)}`)) out.push({ kind: 'table', name, where: [...where] });
  for (const [name, where] of refs.rpcs)
    if (!created.has(`function|${q(name)}`)) out.push({ kind: 'rpc', name, where: [...where] });
  for (const [name, where] of refs.buckets)
    if (!bucketsCreated.has(name)) out.push({ kind: 'bucket', name, where: [...where] });
  return { missing: out, bucketsCreated };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--print-catalog-sql')) {
    console.log(CATALOG_SQL + ';');
    return;
  }
  const json = argv.includes('--json');
  const migFiles = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(MIG_DIR, f));
  const refs = collectCodeRefs(walk(SRC));
  const objects = collectMigrationObjects(migFiles);
  const stat = diffStatic(objects, refs);
  if (argv.includes('--print-missing-sql')) {
    console.log(missingSql(objects, refs, stat.bucketsCreated));
    return;
  }
  const catalog = await loadLiveCatalog(argv);
  const live = catalog ? diffLive(objects, refs, catalog) : null;
  /* buckets created by a migration count as a migration object too */
  if (live) {
    const liveBuckets = new Set(catalog.buckets || []);
    for (const b of stat.bucketsCreated)
      if (!liveBuckets.has(b)) live.byFile.push(['(storage.buckets insert)', [`bucket ${b}`]]);
  }

  if (json) {
    console.log(JSON.stringify({ static: stat.missing, live }, null, 2));
  } else {
    console.log(
      `schema-drift: ${refs.tables.size} tables, ${refs.rpcs.size} rpcs, ${refs.buckets.size} buckets referenced in src; ${objects.size} objects created by ${migFiles.length} migrations`,
    );
    console.log(`\nStatic: ${stat.missing.length} code reference(s) no migration creates`);
    for (const m of stat.missing)
      console.log(
        `  ${m.kind.padEnd(6)} ${m.name}  (${m.where[0]}${m.where.length > 1 ? ` +${m.where.length - 1}` : ''})`,
      );
    if (live) {
      const n = live.byFile.reduce((s, [, l]) => s + l.length, 0);
      console.log(
        `\nLive: ${n} migration object(s) missing, in ${live.byFile.length} migration(s)`,
      );
      for (const [file, list] of live.byFile) {
        console.log(`  ${file}  (${list.length})`);
        for (const o of list) console.log(`      ${o}`);
      }
      console.log(`\nLive: ${live.codeMissing.length} code reference(s) missing live`);
      for (const m of live.codeMissing)
        console.log(`  ${m.kind.padEnd(6)} ${m.name}  (${m.where[0]})`);
    } else {
      console.log('\nLive: skipped (set SUPABASE_DB_URL_READONLY or pass --catalog <file.json>)');
    }
  }
  const liveFail = live && (live.byFile.length > 0 || live.codeMissing.length > 0);
  const staticFail = argv.includes('--strict') && stat.missing.length > 0;
  process.exit(liveFail || staticFail ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
