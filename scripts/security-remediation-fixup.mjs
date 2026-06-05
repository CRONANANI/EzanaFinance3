import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..', 'src', 'app', 'api');

const AUTH_STRIP = [
  /const\s+supabase\s*=\s*createServerSupabase\s*\(\s*\)\s*;?\s*\n\s*const\s*\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+supabase\.auth\.getUser\s*\(\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)[^\n]*\n/g,
  /const\s*\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*=\s*await\s+supabase\.auth\.getUser\s*\(\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)[^\n]*\n/g,
  /const\s*\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+supabase\.auth\.getUser\s*\(\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)[^\n]*\n/g,
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === 'route.js') files.push(p);
  }
  return files;
}

let fixed = 0;
for (const file of walk(apiRoot)) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('withApiGuard')) continue;
  const orig = c;

  for (const pat of AUTH_STRIP) {
    c = c.replace(pat, '');
  }

  // Dynamic route: bare `params.` → `context.params.`
  if (file.includes('[') && /\bparams\.[a-zA-Z]/.test(c) && !c.includes('const params = context')) {
    c = c.replace(
      /(withApiGuard\(async \([^)]+\) => \{\n)/g,
      (m) => `${m}  const params = context?.params ?? {};\n`,
    );
  }

  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    fixed++;
    console.log('fixed', path.relative(path.join(__dirname, '..'), file));
  }
}
console.log(`\n${fixed} files fixed`);
