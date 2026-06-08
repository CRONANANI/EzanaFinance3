# Scaling Architecture

Target topology:

```
Frontend  →  API (Next.js route handlers / "gateway")
                 ↓
          Cache (Redis: Upstash)            ← src/lib/cache.js
                 ↓
   Read model / Search index (Postgres)     ← materialized views + tsvector/trigram
                 ↓
          Primary database (Supabase Postgres)
```

This doc maps each layer to what's implemented in the repo, plus the infra-level
pieces that are configured outside the codebase.

---

## 1. Caching — `src/lib/cache.js`

Two-tier, vendor-agnostic cache:

- **Tier 1 — in-process memory** (per serverless instance): a small LRU with TTL.
  Zero-latency, no network. Always on.
- **Tier 2 — Upstash Redis** (shared across instances): enabled when
  `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set. Upstash is
  HTTP-based, which is the right fit for Vercel functions (no TCP pool to leak).

If Redis isn't configured, the cache degrades to memory-only — the app runs
everywhere. Every Redis error is swallowed and the caller recomputes; the cache
can never break a request.

```js
import { cacheGetOrSet } from '@/lib/cache';
const data = await cacheGetOrSet('some:key', 90 /* ttl seconds */, async () => expensiveRead());
```

API: `cacheGet`, `cacheSet`, `cacheDel`, `cacheGetOrSet`, `isRedisEnabled`.
Bump `CACHE_VERSION` to invalidate every key at once after a shape change.

**Wired so far:** `GET /api/community/leaderboard` (90s), `GET /api/market-data/quotes`
(60s). Extend by wrapping other hot, shared reads in `cacheGetOrSet`. The many
ad-hoc `new Map()` caches around `src/lib/**` can be migrated onto this layer over
time so caching is shared across instances rather than per-instance.

> **Memcached note:** Upstash Redis fills the distributed-cache role memcached
> would. Running a separate memcached tier on top of Vercel + Upstash adds
> operational cost without benefit; the in-process tier already provides the
> ultra-low-latency local cache.

---

## 2. Indexes — `supabase/migrations/20260617000000_perf_indexes.sql`

Partial/composite indexes for the hot read paths:

- `idx_posts_feed_toplevel` — main feed (`parent_post_id IS NULL`, newest first)
- `idx_posts_user_toplevel` — "following" + per-user profile feeds
- `idx_posts_parent_created` — comment threads
- `idx_user_notifications_unread` — unread-notification badge/list
- `idx_pap_computed_at` — politician-performance freshness

All `CREATE INDEX IF NOT EXISTS` (idempotent).

---

## 3. Materialized views / precomputed aggregations

`supabase/migrations/20260617000100_leaderboard_materialized_view.sql`

- `mv_portfolio_leaderboard` precomputes per-user, per-period snapshot returns
  (the expensive part of the leaderboard) from `portfolio_value_snapshots`.
- Unique index `uq_mv_portfolio_leaderboard (period, user_id)` enables
  `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- `refresh_leaderboard_mat()` (SECURITY DEFINER) is called by
  `GET /api/cron/refresh-materialized-views` (CRON_SECRET-gated), scheduled every
  10 minutes in `vercel.json`.

`GET /api/community/leaderboard` reads this view as a **read model** and falls
back to the live snapshot scan if the view isn't present yet — behaviour is
identical either way, so it's safe to deploy before/after applying the migration.
This is the CQRS read/write split in miniature: writes go to the base tables; the
heavy read is served from a denormalized, precomputed view.

Add new aggregations by creating another materialized view + `refresh_*` function
and appending the RPC name to `REFRESH_RPCS` in the cron route.

---

## 4. Search — `supabase/migrations/20260617000200_search_infrastructure.sql`

Postgres-native search (the "search index" layer; no separate engine to run):

- **Trigram (pg_trgm)** GIN indexes on `profiles(full_name, username)` and
  `messages(content)`. Existing `ILIKE '%q%'` substring searches now use an index
  instead of a sequential scan — no application changes required.
- **Full-text (tsvector)** generated columns + GIN indexes on
  `community_posts(content)` and `news_articles_cache(title/description)` for
  word-based, relevance-ranked search via `@@ websearch_to_tsquery`.

`GET /api/community/posts/search?q=` uses the FTS index (with a trigram-ILIKE
fallback). Helpers live in `src/lib/search.js`.

**Migrating to a dedicated engine later** (Typesense / Algolia / Elasticsearch):
keep `src/lib/search.js` as the seam — swap its implementation and add a sync job
from Postgres → the engine. The API surface stays the same.

---

## 5. Pagination — `src/lib/pagination.js`

`parsePagination(searchParams)` returns clamped `{ limit, offset, from, to }`
(supports `?limit` + `?offset`/`?page`); `paginatedResponse(items, meta)` wraps a
page with `{ hasMore, nextOffset, ... }`. Use on every list endpoint so result
sets are always bounded. Used by the new posts-search endpoint; roll out to other
list endpoints as they're touched.

---

## 6. Lazy loading (frontend)

Already in place and should be the default for heavy, non-critical UI:

- `next/dynamic` (13+ usages), e.g. the PDF previewer (`react-pdf`/pdf.js) loads
  only when a document is opened.
- `next/image` lazy-loads images by default.
- Heavy libraries (recharts, framer-motion, lucide-react, react-icons, date-fns,
  radix) are in `optimizePackageImports` in `next.config.js` for tree-shaking.

Pattern for a new heavy, client-only component:

```js
const Heavy = dynamic(() => import('./Heavy'), { ssr: false, loading: () => <Skeleton /> });
```

---

## Infrastructure-level items (configured outside the codebase)

These are deliberately **not** code changes — they're provisioned in dashboards.
The application code is structured to adopt them with minimal change.

### Read replicas (Supabase)

Enable a read replica in the Supabase dashboard (paid feature). To route reads to
it, introduce a `readDb()` client backed by `REPLICA_DATABASE_URL` and use it for
analytics/leaderboard/search reads (writes stay on the primary). The read-model
pattern in the leaderboard already isolates the heavy reads, so this is a small,
contained change when you're ready.

### Partitioning

For very large append-only tables (`news_articles_cache`, `congressional_trades`,
`portfolio_value_snapshots`, `security_audit_log`), convert to native **range
partitioning by time** (e.g. monthly). Benefits: smaller per-partition indexes,
cheap retention via `DROP PARTITION`, partition pruning on time-filtered queries.
This is a migration (create partitioned table → backfill → swap), best done in a
maintenance window; not yet applied.

### Sharding

Horizontal sharding is **not** a Supabase DIY feature. Reach for it only after
read replicas + caching + partitioning are exhausted. Options at that scale:
Citus/pg_partman-style distribution, or application-level sharding by tenant.
Treat as a dedicated project.

---

## Adoption checklist

1. **Env:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (Vercel,
   all environments). Without them the app uses the in-memory tier only.
2. **Migrations:** apply, in order,
   `20260617000000_perf_indexes.sql`,
   `20260617000100_leaderboard_materialized_view.sql`,
   `20260617000200_search_infrastructure.sql`.
3. **Cron:** confirm `CRON_SECRET` is set so
   `/api/cron/refresh-materialized-views` (and the other crons) authorize.
4. Verify: leaderboard + quotes responses are cached; post search returns FTS
   results; `EXPLAIN` shows index usage on the feed/search queries.
