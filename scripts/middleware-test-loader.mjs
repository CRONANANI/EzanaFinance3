/* Resolve hook for check-middleware-timeouts.mjs ONLY: the '@/' alias, the
   CJS 'next/server' entry, and hung stand-ins for Supabase and the limiter. */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const stub = (f) => pathToFileURL(path.join(ROOT, 'scripts/stubs', f)).href;
const STUBS = {
  '@supabase/ssr': stub('supabase-ssr-hang.mjs'),
  '@/lib/persistent-rate-limit': stub('rate-limit-hang.mjs'),
  'next/headers': stub('next-headers.mjs'),
  'server-only': stub('empty.mjs'),
};

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  if (specifier === 'next/server') return nextResolve('next/server.js', context);
  if (specifier.startsWith('@/')) {
    const mapped = path.join(ROOT, 'src', specifier.slice(2));
    for (const candidate of [`${mapped}.js`, `${mapped}/index.js`, mapped]) {
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
      err?.code === 'ERR_MODULE_NOT_FOUND' &&
      /^\.\.?\//.test(specifier) &&
      !/\.[a-z]+$/i.test(specifier)
    ) {
      return nextResolve(`${specifier}.js`, context);
    }
    if (err?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      return nextResolve(`${specifier}/index.js`, context);
    }
    throw err;
  }
}
