/**
 * A tiny promise concurrency limiter (no dependency), in the spirit of
 * p-limit. At most `max` tasks run at once; the rest wait in FIFO order.
 *
 *   const limit = createLimiter(4);
 *   const rows = await Promise.all(ids.map((id) => limit(() => load(id))));
 *
 * `limit(fn, { timeoutMs })` rejects with a LimiterTimeoutError when the task
 * has not settled `timeoutMs` after it was queued (waiting time included). A
 * task still waiting in the queue at that point is dropped and never runs; a
 * task already running keeps its slot until it settles (its own I/O timeout
 * bounds that), and its late result is ignored.
 */
export class LimiterTimeoutError extends Error {
  constructor(ms) {
    super(`timed out after ${ms} ms`);
    this.name = 'LimiterTimeoutError';
    this.timedOut = true;
  }
}

export function createLimiter(max = 4) {
  const cap = Math.max(1, Math.floor(Number(max) || 1));
  let active = 0;
  const queue = [];

  function next() {
    while (active < cap && queue.length) {
      const job = queue.shift();
      if (job.dropped) continue;
      active += 1;
      Promise.resolve()
        .then(job.fn)
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          next();
        });
    }
  }

  function limit(fn, { timeoutMs = 0 } = {}) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const job = {
        fn,
        dropped: false,
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      };
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          job.dropped = true;
          reject(new LimiterTimeoutError(timeoutMs));
        }, timeoutMs);
        timer.unref?.();
      }
      queue.push(job);
      next();
    });
  }

  limit.activeCount = () => active;
  limit.pendingCount = () => queue.filter((j) => !j.dropped).length;
  return limit;
}
