import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'api');

const PATTERNS = [
  /\n\s*const supabase = createServerSupabase\(\);\s*\n\s*const \{\s*data: \{ user \},?\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\)[^\n]*\n/g,
  /\n\s*const \{\s*data: \{ user \},?\s*error: authErr,?\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(authErr \|\| !user\)[^\n]*\n/g,
  /\n\s*const \{\s*data: \{ user \},?\s*\} = await supabase\.auth\.getUser\(\);\s*\n\s*if \(!user\)[^\n]*\n/g,
  /\n\s*const supabase = createServerSupabase\(\);\s*\n\s*const \{\s*\n\s*data: \{ user \},?\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n/g,
  /\n\s*const \{\s*\n\s*data: \{ user \},?\s*\n\s*\} = await supabase\.auth\.getUser\(\);\s*\n/g,
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === 'route.js') files.push(p);
  }
  return files;
}

let n = 0;
for (const file of walk(apiRoot)) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('withApiGuard')) continue;
  const orig = c;
  for (const p of PATTERNS) c = c.replace(p, '\n');
  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    n++;
    console.log(path.relative(apiRoot, file));
  }
}
console.log(`stripped ${n} files`);
