import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'api');

const ORPHAN_AUTH = [
  /try\s*\{\s*\n\s*return NextResponse\.json\(\{ error:[^}]+\}, \{ status: 401 \}\);\s*\n\s*\}\s*\n/g,
  /try\s*\{\s*\n\s*return NextResponse\.json\(\{ error:[^}]+\}, \{ status: 401 \}\);\s*\n/g,
  /\n\s+return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\);\s*\n\s*\}\s*\n/g,
  /withApiGuard\(async[^\{]+\{\s*\nreturn NextResponse\.json\(\s*\n\s*\{ error:[^}]+\}[^;]+;\s*\n\s*\}\s*\n/g,
];

const INLINE_AUTH = [
  /\n\s*const supabase = createServerSupabase\(\);\s*\n\s*const \{\s*data: \{ user \},?\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\)[^\n]*\n/g,
  /\n\s*const \{\s*data: \{ user \},?\s*error: authErr,?\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(authErr \|\| !user\)[^\n]*\n/g,
  /\n\s*const \{\s*data: \{ user \},?\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\)[^\n]*\n/g,
  /\n\s*const user = await getCurrentUser\(request\);\s*\n\s*if \(!user\)[^\n]*\n/g,
  /\n\s*if \(!user\)\s*\{\s*\n\s*return NextResponse\.json\(\{ error:[^}]+\}, \{ status: 401 \}\);\s*\n\s*\}\s*\n/g,
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === 'route.js') files.push(p);
  }
  return files;
}

let imports = 0;
let orphans = 0;
let params = 0;

for (const file of walk(apiRoot)) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('withApiGuard')) continue;
  const orig = c;

  if (!c.includes("from '@/lib/api-guard'") && !c.includes('from "@/lib/api-guard"')) {
    const m = c.match(/^import .+ from .+;\n/m);
    if (m) {
      c = c.replace(m[0], `${m[0]}import { withApiGuard } from '@/lib/api-guard';\n`);
      imports++;
    }
  }

  for (const p of ORPHAN_AUTH) {
    const next = c.replace(p, 'try {\n');
    if (next !== c) {
      c = next;
      orphans++;
    }
  }

  for (const p of INLINE_AUTH) {
    c = c.replace(p, '\n');
  }

  // Partial strip left ", { status: 401 });" fragments
  c = c.replace(/\n\s*, \{ status: 401 \}\);\s*\n\s*\}\s*\n/g, '\n');

  if (file.includes('[') && /\bparams\.[a-zA-Z]/.test(c) && !c.includes('const params = context')) {
    c = c.replace(
      /(withApiGuard\(async \([^)]+\) => \{\n)/g,
      (m) => `${m}  const params = context?.params ?? {};\n`,
    );
    if (c !== orig) params++;
  }

  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    console.log(path.relative(apiRoot, file));
  }
}

console.log(`imports+${imports} orphan-fixes params+${params}`);
