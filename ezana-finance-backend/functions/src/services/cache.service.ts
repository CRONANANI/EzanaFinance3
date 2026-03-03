/**
 * Cache Service
 * In-memory cache with TTL for Firebase Cloud Functions.
 * When Redis is configured (REDIS_URL), it acts as documentation for migration.
 * For now, uses a Map with expiry tracking since Cloud Functions are short-lived.
 *
 * For production with 30K+ users, replace with Redis:
 *   npm install ioredis
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const TTL = {
  STOCK_PRICE: 60,
  PORTFOLIO: 300,
  CONGRESS_TRADES: 3600,
  USER_PROFILE: 1800,
  NEWS: 900,
  COMPANY_PROFILE: 86400,
  FINANCIAL_STATEMENTS: 86400,
  MARKET_MOVERS: 600,
  ECONOMIC_DATA: 3600,
};

class CacheService {
  private store = new Map<string, CacheEntry>();
  static TTL = TTL;

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached as T;
    const data = await fetcher();
    if (data != null) this.set(key, data, ttlSeconds);
    return data;
  }
}

export const cache = new CacheService();
export default cache;
