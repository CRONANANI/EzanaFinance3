/**
 * Loader timing for the dataset pages (perf Task 4.0). Wraps an async data
 * loader so each call logs one line to the function logs:
 *
 *   [timing] dataset:/datasets/insider getInsiderOverview 182ms rows=40 kb=36.2
 *
 * rows = the largest array in the result (top level or one level down), kb
 * = the JSON size handed to the page. Never throws on its own: the loader's
 * result or error passes through untouched. Set PERF_TIMING=0 to silence.
 */
function largestArray(v) {
  if (Array.isArray(v)) return v.length;
  if (!v || typeof v !== 'object') return null;
  let n = null;
  for (const x of Object.values(v)) if (Array.isArray(x)) n = Math.max(n ?? 0, x.length);
  return n;
}

function sizeKb(v) {
  try {
    return Math.round((JSON.stringify(v ?? null).length / 1024) * 10) / 10;
  } catch {
    return null;
  }
}

export function timed(route, fn, name = fn?.name || 'loader') {
  return async (...args) => {
    if (process.env.PERF_TIMING === '0') return fn(...args);
    const t0 = performance.now();
    try {
      const out = await fn(...args);
      const rows = largestArray(out);
      console.log(
        `[timing] dataset:${route} ${name} ${Math.round(performance.now() - t0)}ms` +
          `${rows == null ? '' : ` rows=${rows}`} kb=${sizeKb(out)}`,
      );
      return out;
    } catch (e) {
      console.log(
        `[timing] dataset:${route} ${name} ${Math.round(performance.now() - t0)}ms error`,
      );
      throw e;
    }
  };
}
