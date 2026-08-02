/**
 * Minimal Node ESM resolve hook so this script can import the app's `@/…`
 * modules (jsconfig maps `@/*` → `./src/*`) under bare `node`, without a bundler.
 * Registered from run.mjs before it dynamically imports orchestrate.
 */
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'src');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2));
    const candidates = [
      base,
      `${base}.js`,
      `${base}.mjs`,
      `${base}.jsx`,
      path.join(base, 'index.js'),
      path.join(base, 'index.mjs'),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return nextResolve(pathToFileURL(c).href, context);
    }
    return nextResolve(pathToFileURL(`${base}.js`).href, context);
  }
  return nextResolve(specifier, context);
}
