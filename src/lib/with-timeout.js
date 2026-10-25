/* Resolve a promise or give up after `ms` (QA PLAT-1). Never rejects: a
   timeout resolves { ok: false, timedOut: true } and a rejection resolves
   { ok: false, error }, so each caller chooses to fail open or closed. */
export async function withTimeout(promise, ms, label = 'op') {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, timedOut: true, label }), ms);
  });
  try {
    return await Promise.race([
      Promise.resolve(promise).then((value) => ({ ok: true, value })),
      timeout,
    ]);
  } catch (error) {
    return { ok: false, error, label };
  } finally {
    clearTimeout(timer);
  }
}
