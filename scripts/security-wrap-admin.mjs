import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_FILES = [
  'src/app/api/admin/ensure-avatars-bucket/route.js',
  'src/app/api/admin/elo/backfill/route.js',
  'src/app/api/admin/elo/self-test/route.js',
  'src/app/api/admin/elo/award/route.js',
  'src/app/api/admin/elo/reconcile/route.js',
  'src/app/api/admin/lock-user/route.js',
  'src/app/api/admin/portfolio-snapshot/run/route.js',
  'src/app/api/admin/snaptrade/brokers/route.js',
  'src/app/api/admin/changelog/backfill-daily/route.js',
  'src/app/api/admin/changelog/backfill/route.js',
  'src/app/api/admin/changelog/diagnose/route.js',
];

const SECRET_BLOCK =
  /const authHeader = request\.headers\.get\('authorization'\) \|\| '';\s*\n\s*const provided = authHeader\.replace\(\/\^Bearer\\s\+\/i, ''\)\.trim\(\);\s*\n\s*if \(!ADMIN_SECRET \|\| provided !== ADMIN_SECRET\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n/;

const SECRET_BLOCK_CRON =
  /const authHeader = request\.headers\.get\('authorization'\) \|\| '';\s*\n\s*const token = authHeader\.replace\(\/\^Bearer\\s\+\/i, ''\)\.trim\(\);\s*\n\s*const adminOk = process\.env\.ADMIN_LOCK_SECRET && token === process\.env\.ADMIN_LOCK_SECRET;\s*\n\s*const cronOk = process\.env\.CRON_SECRET && token === process\.env\.CRON_SECRET;\s*\n\s*return adminOk \|\| cronOk;\s*\n\}/;

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

for (const rel of ADMIN_FILES) {
  const full = path.join(root, rel);
  let c = fs.readFileSync(full, 'utf8');
  if (c.includes('withApiGuard')) {
    console.log('skip', rel);
    continue;
  }

  if (!c.includes('requireAdminAccess')) {
    const lastImport = c.lastIndexOf('\nimport ');
    const inserts =
      "\nimport { withApiGuard } from '@/lib/api-guard';\nimport { requireAdminAccess } from '@/lib/admin-auth';";
    c = lastImport >= 0 ? c.slice(0, lastImport) + inserts + c.slice(lastImport) : inserts + c + c;
  }

  // ensure-avatars: replace inner authorize + wrap differently
  if (rel.includes('ensure-avatars-bucket')) {
    c = c.replace(
      /export async function POST\(request\) \{\s*try \{\s*if \(!authorizeAdminRequest\(request\)\) \{/,
      'export const POST = withApiGuard(async (request, user) => {\n  try {\n    const forbidden = requireAdminAccess(request, user);\n    if (forbidden) return forbidden;\n    if (false) {',
    );
    // fallback: simpler replace for ensure-avatars
  }

  c = c.replace(
    SECRET_BLOCK,
    `  const forbidden = requireAdminAccess(request, user);\n  if (forbidden) return forbidden;\n\n`,
  );

  const re = /export async function (POST|GET)\s*\(\s*request\s*\)\s*\{/g;
  let m;
  const reps = [];
  while ((m = re.exec(c)) !== null) {
    const start = m.index;
    const bodyStart = start + m[0].length;
    const end = findMatchingBrace(c, bodyStart - 1);
    if (end < 0) continue;
    reps.push({ start, end: end + 1, method: m[1], body: c.slice(bodyStart, end).trim() });
  }
  for (let i = reps.length - 1; i >= 0; i--) {
    const r = reps[i];
    c =
      c.slice(0, r.start) +
      `export const ${r.method} = withApiGuard(async (request, user) => {\n${r.body}\n}, { requireAuth: true, strict: true });` +
      c.slice(r.end);
  }

  fs.writeFileSync(full, c, 'utf8');
  console.log('ok', rel);
}
