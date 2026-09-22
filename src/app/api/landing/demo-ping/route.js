import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { runLandingPipeline, DISCLAIMER } from '@/lib/sonar/landing-pipeline';

/**
 * GET /api/landing/demo-ping
 *
 * The band's auto-demo. It runs the same pipeline a guest ping runs, for one
 * fixed query, and carries none of the guest concerns: no cookie, no quota,
 * no gate. Visitors do not spend a ping to watch the demo, and the demo does
 * not spend a model call per visitor.
 *
 * Caching is a row in public.landing_demo_cache, not the framework's cache.
 * unstable_cache forbids the dynamic work this pipeline is made of, which
 * made it a standing risk for a production-only failure that local testing
 * never sees. A row has no execution-context rules, and because it is shared
 * it gives the guarantee the per-instance memo could not: about one synthesis
 * a day in total, not one per cold start per region.
 *
 * Failures are never cached, so the next visitor retries rather than being
 * served a day-old error.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* The pipeline resolves a company, retrieves across corpora, synthesizes and
   then fetches five dossier legs. 30s was optimistic for a cold run. */
export const maxDuration = 60;

const DEMO_QUERY = 'Lockheed Martin';
/* Bump alongside the ?v= the client sends when a pipeline change should
   invalidate yesterday's cached answer rather than wait a day for it. */
const CACHE_KEY = 'landing-demo-v5';
const TTL_MS = 24 * 60 * 60 * 1000;

/* Same-instance fast path in front of the table read. The row is the real
   cache; this just saves a query on a warm instance. */
let memo = null;

function bodyFrom(result) {
  return {
    answer: result.answer,
    grounded: result.grounded,
    sources: result.sources,
    relevance: result.relevance,
    dossier: result.dossier,
    query: DEMO_QUERY,
    demo: true,
    disclaimer: DISCLAIMER,
  };
}

export async function GET() {
  if (memo && Date.now() - memo.at < TTL_MS) {
    return NextResponse.json(memo.body);
  }

  const admin = getAdminClient();

  try {
    const { data } = await admin
      .from('landing_demo_cache')
      .select('payload, created_at')
      .eq('cache_key', CACHE_KEY)
      .maybeSingle();
    if (data?.payload && Date.now() - new Date(data.created_at).getTime() < TTL_MS) {
      memo = { at: new Date(data.created_at).getTime(), body: data.payload };
      return NextResponse.json(data.payload);
    }
  } catch (e) {
    /* A missing table (migration not yet applied) or an unreachable database
       costs a cache read, not the endpoint. */
    console.error('[landing/demo-ping] cache read failed:', e?.message);
  }

  let result;
  try {
    result = await runLandingPipeline(DEMO_QUERY, { admin });
  } catch (e) {
    console.error('[landing/demo-ping] pipeline threw:', e?.message);
    return NextResponse.json({ error: 'Demo unavailable.' }, { status: 502 });
  }

  if (!result.answer) {
    /* Not cached: the next visitor retries. `failedAt` names the legs that
       went wrong, never their messages, so the client and the logs agree on
       where it broke without leaking anything. */
    console.error(
      '[landing/demo-ping] no answer, failedAt:',
      result.failedAt?.join(',') || 'unknown',
    );
    return NextResponse.json(
      { error: 'Demo unavailable.', failedAt: result.failedAt || [] },
      { status: 502 },
    );
  }

  const body = bodyFrom(result);

  try {
    const { error } = await admin
      .from('landing_demo_cache')
      .upsert({ cache_key: CACHE_KEY, payload: body, created_at: new Date().toISOString() });
    if (error) {
      console.error(
        '[landing/demo-ping] cache write failed (apply supabase/migrations/20260921120000_landing_demo_cache.sql):',
        error.message,
      );
    }
  } catch (e) {
    console.error('[landing/demo-ping] cache write threw:', e?.message);
  }

  try {
    const { error } = await admin.from('sonar_queries').insert({
      user_id: null,
      is_guest: true,
      ip_hash: null,
      query_text: DEMO_QUERY,
      classification: result.classification,
      version: 'demo',
      plan_tier: 0,
      datasets_searched: result.sources.map((x) => x.id),
      grounded: result.grounded,
    });
    if (error) console.error('[landing/demo-ping] ledger insert failed:', error.message);
  } catch (e) {
    console.error('[landing/demo-ping] ledger insert threw:', e?.message);
  }

  memo = { at: Date.now(), body };
  return NextResponse.json(body);
}
