#!/usr/bin/env node
/**
 * Writes src/lib/echo/public-images.json: every image under public/, as the
 * path it is served at (/images/...). The Echo hub cache uses it to null an
 * article image that is not actually in public/, so the home lays out a text
 * tile instead of an empty picture box, with no client-side HEAD probes.
 * Runs before `next build` and `next dev` (package.json); the JSON is
 * committed so a fresh checkout works before the first build.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pub = join(root, 'public');
const EXT = /\.(png|jpe?g|webp|avif|gif)$/i;

const out = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (EXT.test(name)) out.push(`/${relative(pub, p).split(sep).join('/')}`);
  }
})(pub);
out.sort();

const dest = join(root, 'src', 'lib', 'echo', 'public-images.json');
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`[echo-image-manifest] ${out.length} images -> ${relative(root, dest)}`);
