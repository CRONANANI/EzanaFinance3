/**
 * Node ESM resolve hook for the Sonar v2 check script ONLY. The engine
 * modules use the app's '@/' alias (webpack resolves it; Node ESM does not)
 * and sit on import chains that reach 'next/cache' and 'next/headers',
 * which only exist inside a Next server. Map the alias to src/ and those
 * two framework modules to inert stubs; nothing else changes.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STUBS = {
  'next/cache': pathToFileURL(path.join(ROOT, 'scripts/stubs/next-cache.mjs')).href,
  'next/headers': pathToFileURL(path.join(ROOT, 'scripts/stubs/next-headers.mjs')).href,
  'server-only': pathToFileURL(path.join(ROOT, 'scripts/stubs/empty.mjs')).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  if (specifier.startsWith('@/')) {
    const mapped = path.join(ROOT, 'src', specifier.slice(2));
    for (const candidate of [mapped, `${mapped}.js`, `${mapped}/index.js`]) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await nextResolve(pathToFileURL(candidate).href, context);
      } catch {
        /* try the next shape */
      }
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') &&
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[a-z]+$/i.test(specifier)
    ) {
      try {
        return await nextResolve(`${specifier}.js`, context);
      } catch {
        /* a directory import: './retrievers' -> './retrievers/index.js' */
        return nextResolve(`${specifier}/index.js`, context);
      }
    }
    throw err;
  }
}
