import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { MODEL_IDS, TIER_SCORE } from '@/lib/quants/model-library';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };
const SCORE_TIER = Object.fromEntries(Object.entries(TIER_SCORE).map(([t, s]) => [s, t]));

/**
 * GET /api/quants/models/votes
 * Community vote summary per model plus the caller's own votes.
 * Fails open: if voting storage is unavailable the board still renders.
 */
export const GET = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getUserClient();
      const [summaryRes, mineRes] = await Promise.all([
        supabase.rpc('quant_model_vote_summary'),
        supabase.from('quant_model_votes').select('model_id, tier').eq('user_id', user.id),
      ]);
      if (summaryRes.error || mineRes.error) {
        return NextResponse.json({ available: false, summary: {}, mine: {} }, NO_STORE);
      }
      const summary = {};
      for (const row of summaryRes.data || []) {
        if (!MODEL_IDS.includes(row.model_id)) continue;
        summary[row.model_id] = { votes: Number(row.votes) || 0, avg: Number(row.avg_tier) || 0 };
      }
      const mine = {};
      for (const row of mineRes.data || []) {
        if (SCORE_TIER[row.tier]) mine[row.model_id] = SCORE_TIER[row.tier];
      }
      return NextResponse.json({ available: true, summary, mine }, NO_STORE);
    } catch {
      return NextResponse.json({ available: false, summary: {}, mine: {} }, NO_STORE);
    }
  },
  { requireAuth: true },
);

/**
 * POST /api/quants/models/votes  { modelId, tier: 'S'|'A'|'B'|'C'|'D' }
 * One vote per user per model; voting again replaces it.
 */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const modelId = String(body?.modelId || '');
      const score = TIER_SCORE[String(body?.tier || '').toUpperCase()];
      if (!MODEL_IDS.includes(modelId) || !score) {
        return NextResponse.json({ error: 'Unknown model or tier' }, { status: 400 });
      }
      const { error } = await getUserClient().from('quant_model_votes').upsert(
        {
          user_id: user.id,
          model_id: modelId,
          tier: score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,model_id' },
      );
      if (error) return safeErrorResponse(error, { context: 'quants/models/votes' });
      return NextResponse.json({ ok: true }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/models/votes' });
    }
  },
  { requireAuth: true, strict: true },
);
