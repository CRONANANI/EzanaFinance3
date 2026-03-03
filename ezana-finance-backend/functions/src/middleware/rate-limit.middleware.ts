import { Request, Response, NextFunction } from "express";

/**
 * Simple in-memory rate limiter for Cloud Functions.
 * For production with 30K+ users, use Redis-backed rate limiting.
 */
interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  );
}

export function rateLimit(opts: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}) {
  const windowMs = opts.windowMs || 60000;
  const max = opts.max || 100;
  const message = opts.message || "Too many requests, please try again later.";

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientIp(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

export const defaultRateLimit = rateLimit({ windowMs: 60000, max: 100 });
export const strictRateLimit = rateLimit({ windowMs: 60000, max: 10, message: "Too many attempts." });
export const apiRateLimit = rateLimit({ windowMs: 60000, max: 30 });

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 300000);
