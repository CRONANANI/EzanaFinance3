import { NextResponse } from 'next/server';
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
export const revalidate = 86400;
export const maxDuration = 30;

const DEMO_QUERY = 'Lockheed Martin';
const TTL_MS = 24 * 60 * 60 * 1000;

let memo = null;

export async function GET() {
  if (memo && Date.now() - memo.at < TTL_MS) {
    return NextResponse.json(memo.body);
  }

  const admin = getAdminClient();
  let result;
  try {
    result = await runLandingPipeline(DEMO_QUERY, { admin });
  } catch (e) {
    console.error('[landing/demo-ping] pipeline failed:', e?.message);
    return NextResponse.json({ error: 'Demo unavailable.' }, { status: 502 });
  }

  if (!result.answer) {
    /* Not cached: a failed synthesis should be retried on the next visit,
       not pinned for a day. */
    return NextResponse.json({ error: 'Demo unavailable.' }, { status: 502 });
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
      datasets_searched: result.sources.map((s) => s.id),
      grounded: result.grounded,
    });
    if (error) console.error('[landing/demo-ping] ledger insert failed:', error.message);
  } catch (e) {
    console.error('[landing/demo-ping] ledger insert threw:', e?.message);
  }

  const body = {
    answer: result.answer,
    grounded: result.grounded,
    sources: result.sources,
    relevance: result.relevance,
    dossier: result.dossier,
    query: DEMO_QUERY,
    demo: true,
    disclaimer: DISCLAIMER,
  };
  memo = { at: Date.now(), body };
  return NextResponse.json(body);
}
