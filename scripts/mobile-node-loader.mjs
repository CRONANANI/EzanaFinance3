/**
 * Node ESM resolve hook for scripts/check-mobile.mjs only: maps the `@/`
 * alias to src/ and retries extensionless relative imports with `.js`, the
 * way webpack resolves them, so the modules under test load untouched.
 */
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), '../src');

function withExt(base) {
  for (const ext of ['', '.js', '.jsx', '/index.js']) {
    if (existsSync(base + ext) && (ext || /\.[a-z]+$/i.test(base))) return base + ext;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const hit = withExt(resolvePath(SRC, specifier.slice(2)));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      err?.code === 'ERR_MODULE_NOT_FOUND' &&
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[a-z]+$/i.test(specifier)
    ) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw err;
  }
}
