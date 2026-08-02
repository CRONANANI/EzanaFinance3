import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin RAG health dashboard (RAG_SYSTEM.md §3 P5). One read-through of the RAG
 * telemetry tables so an operator can answer: is the query-embedding cache
 * earning its keep, what are visitors asking that we can't answer (content
 * gaps), and are retrieval metrics trending the right way across eval runs?
 *
 *   GET /api/admin/rag
 *     { cache: {...}, zeroResults: {...}, evals: {...} }
 *
 * Admin-only (same gate as the rest of /api/admin). Service-role read of tables
 * that have no anon/authenticated grants.
 */
export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminClient();

  try {
    const [cache, zeroResults, evals] = await Promise.all([
      cacheStats(admin),
      zeroResultStats(admin),
      evalStats(admin),
    ]);
    return NextResponse.json({ cache, zeroResults, evals });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'rag dashboard failed' }, { status: 500 });
  }
}

/** Cache size, cumulative hits, hit-rate proxy, and the hottest cached queries. */
async function cacheStats(admin) {
  const { count } = await admin
    .from('query_embedding_cache')
    .select('*', { count: 'exact', head: true });

  // Hottest rows carry the story: hit_count - 1 is reads served from cache
  // (the first insert isn't a hit). Pull enough to total + show a leaderboard.
  const { data: rows } = await admin
    .from('query_embedding_cache')
    .select('query_hash, hit_count, created_at, last_hit_at')
    .order('hit_count', { ascending: false })
    .limit(1000);

  const list = Array.isArray(rows) ? rows : [];
  const totalLookups = list.reduce((s, r) => s + (r.hit_count || 0), 0);
  const servedFromCache = list.reduce((s, r) => s + Math.max(0, (r.hit_count || 0) - 1), 0);

  return {
    entries: count || 0,
    // Of all lookups against cached rows, the share answered without an embed call.
    hitRate: totalLookups ? +(servedFromCache / totalLookups).toFixed(4) : 0,
    servedFromCache,
    topQueries: list.slice(0, 20).map((r) => ({
      queryHash: r.query_hash,
      hits: r.hit_count,
      lastHitAt: r.last_hit_at,
    })),
  };
}

/** Content gaps: recent volume by surface + the most-repeated unanswered queries. */
async function zeroResultStats(admin) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from('rag_zero_results')
    .select('surface, query, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000);

  const list = Array.isArray(rows) ? rows : [];
  const bySurface = {};
  const byQuery = new Map();
  for (const r of list) {
    bySurface[r.surface] = (bySurface[r.surface] || 0) + 1;
    const key = (r.query || '').toLowerCase();
    const cur = byQuery.get(key) || { query: r.query, surface: r.surface, count: 0 };
    cur.count += 1;
    byQuery.set(key, cur);
  }

  const topGaps = [...byQuery.values()].sort((a, b) => b.count - a.count).slice(0, 25);
  return { windowDays: 30, total: list.length, bySurface, topGaps };
}

/** Latest eval runs + the delta between the two most recent (regression radar). */
async function evalStats(admin) {
  const { data: rows } = await admin
    .from('rag_eval_runs')
    .select('id, git_sha, config, metrics, ran_at')
    .order('ran_at', { ascending: false })
    .limit(10);

  const runs = Array.isArray(rows) ? rows : [];
  let delta = null;
  if (runs.length >= 2) {
    const [cur, prev] = runs;
    delta = {
      againstRunId: prev.id,
      mrr: metricDelta(cur.metrics?.mrr, prev.metrics?.mrr),
      ndcg10: metricDelta(cur.metrics?.ndcg10, prev.metrics?.ndcg10),
      hitRate3: metricDelta(cur.metrics?.hitRate?.k3, prev.metrics?.hitRate?.k3),
      emptyStatePrecision: metricDelta(
        cur.metrics?.emptyStatePrecision,
        prev.metrics?.emptyStatePrecision,
      ),
    };
  }

  return {
    latest: runs.map((r) => ({
      id: r.id,
      gitSha: r.git_sha,
      ranAt: r.ran_at,
      config: r.config,
      metrics: r.metrics,
    })),
    delta,
  };
}

function metricDelta(cur, prev) {
  if (typeof cur !== 'number' || typeof prev !== 'number') return null;
  return { current: cur, previous: prev, change: +(cur - prev).toFixed(4) };
}
