import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'api');

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
  if (c.includes("from '@/lib/api-guard'") || c.includes('from "@/lib/api-guard"')) continue;
  const m = c.match(/import .+ from .+;\r?\n/);
  if (!m) continue;
  c = c.replace(m[0], `${m[0]}import { withApiGuard } from '@/lib/api-guard';\n`);
  fs.writeFileSync(file, c, 'utf8');
  n++;
  console.log(path.relative(apiRoot, file));
}
console.log(`added imports to ${n} files`);
