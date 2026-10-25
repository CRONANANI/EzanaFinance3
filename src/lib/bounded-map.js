/**
 * A Map with a size cap and least-recently-used eviction (reliability audit
 * P2-13). Drop-in for the module-level `new Map()` caches that grew without
 * bound on warm instances (some keyed by user-supplied symbols). No imports,
 * edge- and browser-safe.
 */
export class BoundedMap extends Map {
  constructor(maxSize = 500) {
    super();
    this.maxSize = Math.max(1, maxSize);
  }

  get(key) {
    if (!super.has(key)) return undefined;
    const v = super.get(key);
    super.delete(key);
    super.set(key, v); // bump recency
    return v;
  }

  set(key, value) {
    if (super.has(key)) super.delete(key);
    super.set(key, value);
    while (this.size > this.maxSize) {
      super.delete(this.keys().next().value);
    }
    return this;
  }
}
