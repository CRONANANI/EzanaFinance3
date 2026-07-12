import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { applyDecay } from '@/lib/org-rating-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let supabase;
  try {
    supabase = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  // Idle gate: only members whose rating has NOT moved in >= 30 days are decay
  // candidates. recompute + a prior decay both bump updated_at, so an active
  // member is skipped and an idle one decays at most ~monthly even though this
  // cron runs daily. The engine's applyDecay still owns the math (floor at
  // DECAY_FLOOR, writes the 'decay' transaction + updates org_member_rating);
  // we never reimplement it here — the cron only decides WHO is eligible.
  const IDLE_DAYS = 30;
  const cutoffIso = new Date(Date.now() - IDLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from('org_member_rating')
    .select('org_id, member_id, rating, updated_at')
    .lt('updated_at', cutoffIso);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgIds = new Set();
  let membersDecayed = 0;
  let membersScanned = 0;
  let totalDelta = 0;
  const errors = [];

  for (const r of rows || []) {
    orgIds.add(r.org_id);
    membersScanned += 1;
    try {
      // applyDecay operates per-member (db, orgId, memberId, currentRating).
      // eslint-disable-next-line no-await-in-loop
      const delta = await applyDecay(supabase, r.org_id, r.member_id, Number(r.rating));
      if (delta !== 0) {
        membersDecayed += 1;
        totalDelta += delta;
      }
    } catch (e) {
      errors.push({
        orgId: r.org_id,
        memberId: r.member_id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    success: true,
    orgsProcessed: orgIds.size,
    membersScanned,
    membersDecayed,
    totalDelta,
    errors: errors.slice(0, 10),
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
