import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_TOURS = new Set([
  'market_analysis',
  'company_research',
  'centaur_intelligence',
  'home_dashboard',
  'community',
]);

/**
 * GET /api/profile/tour-seen?tour=market_analysis
 * Returns { seen: boolean } for the current user.
 */
export async function GET(request) {
  try {
    const { user, client } = await requireUser(request);
    const url = new URL(request.url);
    const tour = url.searchParams.get('tour')?.trim();

    if (!tour || !ALLOWED_TOURS.has(tour)) {
      return NextResponse.json({ error: 'Invalid tour' }, { status: 400 });
    }

    const { data, error } = await client
      .from('profiles')
      .select('tours_seen')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const seen = Boolean(data?.tours_seen?.[tour]);
    return NextResponse.json({ seen });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * POST /api/profile/tour-seen
 * Body: { tour: 'market_analysis' }
 * Marks the tour as seen for the current user.
 */
export async function POST(request) {
  try {
    const { user, client } = await requireUser(request);
    const body = await request.json().catch(() => null);
    const tour = body?.tour?.trim();

    if (!tour || !ALLOWED_TOURS.has(tour)) {
      return NextResponse.json({ error: 'Invalid tour' }, { status: 400 });
    }

    const { data: existing } = await client
      .from('profiles')
      .select('tours_seen')
      .eq('id', user.id)
      .maybeSingle();

    const current = existing?.tours_seen || {};
    const updated = { ...current, [tour]: true };

    const { error } = await client
      .from('profiles')
      .update({ tours_seen: updated })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tours_seen: updated });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
