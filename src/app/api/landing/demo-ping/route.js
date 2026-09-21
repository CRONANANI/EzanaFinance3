import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { runLandingPipeline, DISCLAIMER } from '@/lib/sonar/landing-pipeline';

/**
 * GET /api/landing/demo-ping
 *
 * The band's auto-demo. It runs the same pipeline a guest ping runs, for one
 * fixed query, and carries none of the guest concerns: no cookie, no quota,
 * no gate. Visitors do not spend a ping to watch the demo, and the demo does
 * not spend a Haiku call per visitor.
 *
 * Cost control is the whole point of this route existing. `revalidate` puts
 * the response in Next's data cache for a day, so repeat visitors are served
 * without touching a model. The module-level copy below is the second line:
 * it bounds how often a freshly started instance can miss that cache and pay
 * again. Neither is a distributed lock, so the honest guarantee is "about one
 * synthesis a day", not "exactly one" — a burst of cold starts in different
 * regions can each pay once before their caches fill.
 *
 * The ledger row is written with version 'demo' so demo spend is separable
 * from guest spend in the same table, and so the shared global daily cap
 * still sees it.
 */
export const runtime = 'nodejs';
/* Dynamic route, cache INSIDE it. Exporting `revalidate` on a handler whose
   pipeline does uncacheable work (no-store fetches, a service-role Supabase
   client) meant Next treated the route as dynamic and quietly ignored the
   revalidate, so nothing was cached and every visitor paid for a synthesis.
   unstable_cache caches the pipeline result itself, which is the thing worth
   caching, and the key carries a version so a fix invalidates yesterday's
   answer instead of waiting a day for it. */
export const dynamic = 'force-dynamic';
/* The pipeline resolves a company, retrieves across corpora, synthesizes and
   then fetches five dossier legs. 30s was optimistic for a cold run. */
export const maxDuration = 60;

const DEMO_QUERY = 'Lockheed Martin';

/* Bump alongside the ?v= the client sends when a pipeline change should
   invalidate yesterday's cached demo rather than wait a day for it. */
const DEMO_VERSION = 3;

/* The admin client is built INSIDE the cached function on purpose: capturing
   one from the module scope would pin a connection into the cache entry. */
const cachedDemo = unstable_cache(
  async () => {
    const result = await runLandingPipeline(DEMO_QUERY, { admin: getAdminClient() });
    if (!result.answer) {
      /* Throwing keeps a failed run out of the cache, so the next visitor
         retries instead of being served a day-old failure. */
      throw new Error('demo pipeline produced no answer');
    }
    return result;
  },
  [`landing-demo-ping-v${DEMO_VERSION}`],
  { revalidate: 86400, tags: ['landing-demo-ping'] },
);

export async function GET() {
  let result;
  try {
    result = await cachedDemo();
  } catch (e) {
    console.error('[landing/demo-ping] failed:', e?.message);
    return NextResponse.json({ error: 'Demo unavailable.' }, { status: 502 });
  }

  /* Ledger, best effort. The cached path skips this on a hit, which is the
     point: one recorded synthesis a day rather than one per visitor. */
  try {
    const { error } = await getAdminClient()
      .from('sonar_queries')
      .insert({
        user_id: null,
        is_guest: true,
        ip_hash: null,
        query_text: DEMO_QUERY,
        classification: result.classification,
        version: 'demo',
        plan_tier: 0,
        datasets_searched: result.sources.map((s) => s.id),
        grounded: result.grounded,
      });
    if (error) console.error('[landing/demo-ping] ledger insert failed:', error.message);
  } catch (e) {
    console.error('[landing/demo-ping] ledger insert threw:', e?.message);
  }

  return NextResponse.json({
    answer: result.answer,
    grounded: result.grounded,
    sources: result.sources,
    relevance: result.relevance,
    dossier: result.dossier,
    query: DEMO_QUERY,
    demo: true,
    version: DEMO_VERSION,
    disclaimer: DISCLAIMER,
  });
}
