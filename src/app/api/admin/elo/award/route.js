import { NextResponse } from 'next/server';
import { awardELO } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;

/**
 * POST /api/admin/elo/award
 *
 * Authorization: `Authorization: Bearer <ADMIN_LOCK_SECRET>`
 *
 * Body:
 * {
 *   "userId": "uuid",
 *   "delta": 50,
 *   "reason": "Manual correction for course X",
 *   "category": "admin",
 *   "metadata": { "note": "..." }
 * }
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, delta, reason, category, metadata = {} } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta must be nonzero finite number' }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: 'reason required' }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: 'category required' }, { status: 400 });
  }

  const result = await awardELO(userId, delta, reason, category, metadata);
  if (!result) {
    return NextResponse.json({ error: 'awardELO failed (see server logs)' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    userId,
    oldRating: result.oldRating,
    newRating: result.newRating,
    oldTier: result.oldTier,
    newTier: result.newTier,
  });
}
