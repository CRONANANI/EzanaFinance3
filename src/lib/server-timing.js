/**
 * Tiny server-side fetch timer for the dataset pages' performance work:
 * wraps one read and logs its wall time, so Vercel runtime logs show where a
 * slow render actually spent its time ("[timing] committees:index 840ms").
 * Logging only; the result and any error pass straight through.
 */
export async function timed(label, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`[timing] ${label} ${Date.now() - t0}ms`);
  }
}
