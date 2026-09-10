# RAG_SYSTEM.md — Retrieval-Augmented Generation

The design doc for Ezana's cross-corpus retrieval stack. Code throughout the
repo cites this file by section (e.g. `RAG_SYSTEM.md §3 P4`); this is that
reference.

---

## §1 Overview

Three product surfaces answer natural-language questions grounded in Ezana's
own data instead of the model's parametric memory:

| Surface | Route | Corpora | Audience |
|---|---|---|---|
| Research Copilot | `POST /api/research/copilot` | all five | authenticated users |
| Sonar | `POST /api/sonar/query` | entitlement-gated subset | plan/partner-gated |
| Help Center Ask | `POST /api/help-center/ask` | `help_center_articles` | public |

All three follow the same contract: **retrieve grounded sources first, then
synthesize a cited answer — and when nothing is retrieved, return an honest
empty-state rather than a hallucinated answer.**

Embeddings are `gte-small` (384-dim) produced by a Supabase edge function
(`src/lib/embeddings-gte.js`). The same model embeds documents at index time and
queries at read time, so vectors are comparable.

Supabase project: `jhdzpadfzrhiekcfgtai`.

---

## §2 Retrieval architecture

### The orchestrator — `src/lib/research-copilot/orchestrate.js`

`orchestrate(query, options)` is the shared retrieval core for Copilot and
Sonar. Pipeline:

1. **Query rewrite** (flag-gated, §3 P4) — normalize an ambiguous query before
   retrieval. Rewrite `corpusHints` are a *soft* ranking bonus only; they never
   widen `allowCorpora`, so Sonar's entitlement gate stays authoritative.
2. **Shared context, built once** — embed the (possibly rewritten) query via the
   **read-through cache** (`embedViaSupabaseCached`, §3 P5) and extract entities.
   Semantic retrievers reuse the one embedding; structured retrievers use the
   entities.
3. **Fan-out** — every allowed retriever runs concurrently. Org-scoped
   retrievers only run when an org member is present; `allowCorpora` further
   restricts the set (Sonar's entitlement gate). A retriever that throws
   contributes nothing — retrieval degrades, never fails.
4. **Merge + dedupe** by `(corpus, id)`, keeping the higher-scored duplicate.
   Unified 0..1 score: semantic hits use cosine similarity; structured rows use a
   recency band (kept competitive but below strong semantic hits).
5. **Rerank** (flag-gated, §3 P3) — retrieve wide (top-20), reorder with one
   batched Haiku cross-encoder call, feed the reranked top-K into the cap. On any
   failure it returns the input order (`reranked:false`) — bit-for-bit the
   unranked path.
6. **Per-corpus cap** — guarantees a visible corpus mix (no single corpus
   dominates). Runs *after* rerank so the mix guarantee always holds.
7. **Context budget** — trim lowest-ranked items until under the char cap so the
   synthesis prompt stays bounded.

Returns `{ items, corporaSearched, corporaUsed, entities, rerankUsed,
rewriteUsed }` — every item keeps full provenance (corpus, title, url, date,
similarity, meta).

### Retriever registry — `src/lib/research-copilot/retrievers/`

Each module implements `{ corpus, kind, scope, retrieve }`:

| Corpus | Label | Kind | Scope |
|---|---|---|---|
| `echo` | Ezana Echo | semantic (hybrid) | public |
| `markets` | Prediction markets | semantic | public |
| `research_notes` | Research notes | semantic | org |
| `congress` | Congressional trades | structured | public |
| `contracts` | Government contracts | structured | public |

Org-scoped retrievers enforce org-scoping/RLS *inside* the retriever; the
orchestrator only gates whether they run at all.

---

## §3 Phased roadmap

### P1 — Chunked Echo indexing + parent-document retrieval ✅

`echo_article_chunks`: each article body is chunked heading-aware
(~500-token chunks, `src/lib/rag/chunker.js`), every chunk is embedded, and the
article's chunk rows are replaced delete-then-insert on re-index (so an edit
never leaves stale trailing chunks). Indexed by
`/api/cron/index-echo-articles` — the article-level pass is the fallback; the
chunk pass is additive.

Retrieval (`retrievers/echo.js`) is **chunk-first with parent-document
synthesis context**: `match_echo_chunks` matches at chunk granularity, hits are
grouped by article, each article's best-similarity chunk is the representative,
and the synthesized snippet is that chunk ± its neighbors (parent context,
≤1,200 chars). Both semantic and lexical branches fall back to the article-level
path if the chunk path errors (e.g. before the migration runs).

### P2 — Eval harness + metrics ✅

`scripts/rag-eval/run.mjs` runs a golden set through the **real** `orchestrate`
path and reports **hit@k / MRR / NDCG@10 / empty-state precision**, per-category
and overall. Two modes run in one invocation:

- **naive** — semantic-only baseline (`semanticOnly:true`; no lexical merge, no
  rerank/rewrite).
- **full** — the shipped orchestrate path (hybrid + any enabled flags).

`--save` persists a row to `public.rag_eval_runs` (`{git_sha, config, metrics,
ran_at}`) so later phases show before/after deltas. No corpus data is mutated.

Golden set — `scripts/rag-eval/golden.jsonl` (52 cases): `exact` (11),
`paraphrase` (11), `adversarial` (12), `entity` (10), `cross-corpus` (8).

### P3 — LLM reranking (flag-gated) ✅

`src/lib/rag/rerank.js`. One batched Haiku cross-encoder call reorders the top-20
by relevance. Enabled by `RAG_RERANK=1` **and** `ANTHROPIC_API_KEY`. Pure
optimizer: any failure/timeout returns the input order.

### P4 — Query understanding: rewrite + alias expansion ✅

- **Rewrite** — `src/lib/rag/query-rewrite.js`. Enabled by `RAG_REWRITE=1` **and**
  `ANTHROPIC_API_KEY`. Returns `{rewritten, corpusHints}`; failure returns the
  original (`rewriteUsed:false`). `corpusHints` are a soft +0.03 score bonus
  within the already-allowed set — never a scope widener.
- **Alias expansion** — `src/lib/rag/aliases.js` (`expandLexicalQuery`) widens the
  lexical branch with known synonyms/tickers so exact-term queries match.

### P5 — Embedding cache, zero-result telemetry, admin dashboard ✅

- **Query-embedding cache** — `src/lib/rag/embed-cached.js`. Read-through cache
  keyed by `sha256` of the normalized query; repeats skip the edge-function round
  trip. Wired into the three **query-time** surfaces only (Copilot/Sonar
  orchestrator + help-center ask) — indexers keep raw `embedViaSupabase`
  (document text ≠ repeat queries). Hits bump `hit_count` + `last_hit_at`
  atomically via `increment_query_cache_hit` (fire-and-forget). Any cache error
  degrades silently to the uncached path — the cache is never a point of failure.
- **Bounded cache** — `evict_query_embedding_cache(keep)` keeps the `keep`
  most-hit / most-recent rows (default 5,000) and evicts the rest. Called
  best-effort from the help-center indexer, now on a daily Vercel schedule
  (`0 5 * * *`).
- **Zero-result telemetry** — `src/lib/rag/zero-results.js` (`logZeroResult`).
  When a surface takes its honest empty-state path, the query is recorded to
  `rag_zero_results` with its surface — these are the corpus's content gaps.
  Fire-and-forget; never blocks or fails the response.
- **Admin RAG dashboard** — `GET /api/admin/rag` (admin-gated). One read-through
  of the telemetry tables: cache health (entries, hit-rate proxy, hottest
  queries), top content gaps (30-day window, by surface), and eval-run history
  with regression deltas between the two most recent runs.

---

## §4 Configuration & flags

| Env var | Effect | Default |
|---|---|---|
| `RAG_RERANK` | `=1` enables LLM reranking (needs `ANTHROPIC_API_KEY`) | off |
| `RAG_REWRITE` | `=1` enables query rewrite (needs `ANTHROPIC_API_KEY`) | off |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (embeds + DB) | required |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key (embed edge fn + admin reads) | required |
| `ANTHROPIC_API_KEY` | synthesis, rerank, rewrite | required for LLM steps |

Both LLM flags are pure optimizers: disabled or failing, the pipeline runs the
deterministic baseline path unchanged. This keeps existing callers unaffected and
makes every enhancement independently reversible.

---

## §5 Database objects

Migrations under `supabase/migrations/`:

- `echo_article_chunks` + `match_echo_chunks` — P1 chunk index & retrieval RPC.
- `rag_eval_runs` — P2 eval history (`git_sha`, `config` jsonb, `metrics` jsonb).
- `query_embedding_cache` — P5 cache (`query_hash` PK, `vector(384)`,
  `hit_count`, `created_at`, `last_hit_at`).
- `rag_zero_results` — P5 content-gap log (`surface`, `query`, `created_at`).
- `increment_query_cache_hit(text)` — atomic hit bump.
- `evict_query_embedding_cache(int)` — bounded-cache eviction, returns rows
  removed.

All RAG telemetry tables are **service-role only** — RLS enabled, no
anon/authenticated policies or grants.

---

## §6 Operations

**Run the eval harness** (needs `.env.local` with the Supabase + Anthropic keys
above):

```bash
node --env-file=.env.local scripts/rag-eval/run.mjs           # both modes, no save
node --env-file=.env.local scripts/rag-eval/run.mjs --save     # persist to rag_eval_runs
node --env-file=.env.local scripts/rag-eval/run.mjs --mode full
```

After a `--save` run, `GET /api/admin/rag` surfaces the run and its delta versus
the prior run. Watch `metrics.mrr`, `metrics.ndcg10`, `metrics.hitRate.k3`, and
`metrics.emptyStatePrecision` — a negative `delta` on any of these across a
change is a retrieval regression.

**Reindex Echo** after editing articles: `/api/cron/index-echo-articles`
(`?force=1` to re-chunk unconditionally). **Reindex help center** after editing
`src/lib/help-center-content.js`: `/api/cron/index-help-center` (also runs the
daily cache eviction).

**Content gaps**: `GET /api/admin/rag` → `zeroResults.topGaps` ranks the
most-repeated unanswered queries by surface — the prioritized backlog for new
Echo/help articles.

> **Note (this environment):** the final harness run requires
> `SUPABASE_SERVICE_ROLE_KEY`, which is not available in the automation
> environment (the Supabase MCP exposes only publishable/anon keys). Run the
> commands above from a shell that has the service-role key to populate
> `rag_eval_runs`; the admin dashboard renders the deltas from there.
