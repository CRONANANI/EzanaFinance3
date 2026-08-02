import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { requireUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Transparency + control surface for the user's own interest profile.
 *
 *   GET   → { personalization_enabled, interests: { <dimension>: [{value, score}] } }
 *   PATCH → { personalization_enabled: boolean }  (kill switch)
 *
 * Only the caller's own row is ever touched (user-scoped Supabase client).
 */

const DIMENSIONS = [
  ['tickers', 'ticker_scores'],
  ['sectors', 'sector_scores'],
  ['industries', 'industry_scores'],
  ['entities', 'entity_scores'],
  ['geographies', 'geo_scores'],
  ['themes', 'theme_scores'],
  ['assetClasses', 'asset_class_scores'],
];

const TOP_N = 8;

function topInterests(row) {
  const out = {};
  for (const [label, col] of DIMENSIONS) {
    const map = row?.[col];
    if (!map || typeof map !== 'object') continue;
    const ranked = Object.entries(map)
      .filter(([, score]) => Number(score) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, TOP_N)
      .map(([value, score]) => ({ value, score: Math.round(Number(score)) }));
    if (ranked.length) out[label] = ranked;
  }
  return out;
}

export const GET = withApiGuard(
  async (request) => {
    const { user, client } = await requireUser(request);

    const { data, error } = await client
      .from('user_interest_profiles')
      .select(
        'personalization_enabled, ticker_scores, sector_scores, industry_scores, entity_scores, geo_scores, theme_scores, asset_class_scores, last_computed_at, total_breadcrumbs',
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/user/interest-profile]', error.message);
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    return NextResponse.json({
      personalization_enabled: data?.personalization_enabled ?? true,
      last_computed_at: data?.last_computed_at ?? null,
      total_breadcrumbs: data?.total_breadcrumbs ?? 0,
      interests: data ? topInterests(data) : {},
    });
  },
  { requireAuth: true },
);

export const PATCH = withApiGuard(
  async (request) => {
    const { user, client } = await requireUser(request);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.personalization_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Body must include boolean personalization_enabled' },
        { status: 400 },
      );
    }

    const { error } = await client.from('user_interest_profiles').upsert(
      { user_id: user.id, personalization_enabled: body.personalization_enabled },
      { onConflict: 'user_id' },
    );
    if (error) {
      console.error('[PATCH /api/user/interest-profile]', error.message);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, personalization_enabled: body.personalization_enabled });
  },
  { requireAuth: true, strict: true },
);
