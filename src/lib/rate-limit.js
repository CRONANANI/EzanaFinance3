const rateLimit = new Map();

export function rateLimiter({ interval = 60000, limit = 30 }) {
  return {
    check: (key) => {
      const now = Date.now();
      const record = rateLimit.get(key);

      if (!record || now - record.start > interval) {
        rateLimit.set(key, { start: now, count: 1 });
        return { success: true, remaining: limit - 1 };
      }

      if (record.count >= limit) {
        return { success: false, remaining: 0 };
      }

      record.count++;
      return { success: true, remaining: limit - record.count };
    },
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimit) {
    if (now - val.start > 300000) rateLimit.delete(key);
  }
}, 300000);
