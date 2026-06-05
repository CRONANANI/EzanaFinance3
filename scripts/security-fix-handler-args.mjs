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
  if (!c.includes('withApiGuard(async (request, context)')) continue;
  const isDynamic = file.includes('[');
  const usesParams = /\bparams\./.test(c) || /\bparams\?/.test(c);
  const next =
    isDynamic && usesParams
      ? c.replace(
          /withApiGuard\(async \(request, context\)/g,
          'withApiGuard(async (request, user, context)',
        )
      : c.replace(
          /withApiGuard\(async \(request, context\)/g,
          'withApiGuard(async (request, user)',
        );
  if (next !== c) {
    fs.writeFileSync(file, next, 'utf8');
    n++;
    console.log(path.relative(apiRoot, file));
  }
}
console.log(`fixed ${n} handler signatures`);
