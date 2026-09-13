/**
 * Node ESM resolve hook for the ezanaql check script ONLY: src/lib/ezanaql
 * uses extensionless relative imports (webpack resolves them; Node ESM does
 * not), and the module is deliberately untouched — so retry failed relative
 * resolutions with a `.js` extension here instead.
 */
export async function resolve(specifier, context, nextResolve) {
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
