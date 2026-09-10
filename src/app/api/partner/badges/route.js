/**
 * /api/partner/badges
 * GET — get all badge definitions + partner's earned badges grouped by category
 */
import { getAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

async function handleGet(request, user) {
  const { data: allBadges } = await getAdminClient()
    .from('badge_definitions')
    .select('*')
    .order('sort_order', { ascending: true });

  const { data: earnedBadges } = await getAdminClient()
    .from('partner_badges')
    .select('badge_id, earned_at')
    .eq('partner_id', user.id);

  const earnedMap = {};
  (earnedBadges || []).forEach((b) => {
    earnedMap[b.badge_id] = b.earned_at;
  });

  const categories = {};
  (allBadges || []).forEach((badge) => {
    const cat = badge.badge_category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({
      ...badge,
      earned: !!earnedMap[badge.id],
      earnedAt: earnedMap[badge.id] || null,
    });
  });

  const earned = (allBadges || [])
    .filter((b) => earnedMap[b.id])
    .map((b) => ({
      ...b,
      earnedAt: earnedMap[b.id],
    }));

  return NextResponse.json({
    categories,
    earned,
    totalEarned: earned.length,
    totalAvailable: (allBadges || []).length,
  });
}

export const GET = withApiGuard(handleGet, { requireAuth: true });
