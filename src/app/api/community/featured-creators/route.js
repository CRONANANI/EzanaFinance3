import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const admin = getAdminClient();

// Standing order — signature creators surface first, then featured, then the
// baseline creator tier; ties broken by follower count.
const TIER_RANK = { signature: 3, featured: 2, creator: 1 };

/**
 * GET /api/community/featured-creators
 * Discovery rail: the partners/creators to spotlight in the community, ranked
 * by creator tier then reach. Only public profiles are included.
 */
export async function GET() {
  try {
    const { data: partners, error } = await admin
      .from('profiles')
      .select('id, username, full_name, user_settings, partner_type, creator_tier')
      .eq('is_partner', true)
      .limit(50);

    if (error || !partners?.length) {
      return NextResponse.json({ creators: [] });
    }

    const visible = partners.filter((p) => (p.user_settings || {}).privacy_show_profile !== false);
    const ids = visible.map((p) => p.id);

    const followerMap = {};
    if (ids.length) {
      const { data: follows } = await admin
        .from('user_follows')
        .select('following_id')
        .in('following_id', ids);
      for (const f of follows || []) {
        followerMap[f.following_id] = (followerMap[f.following_id] || 0) + 1;
      }
    }

    const creators = visible
      .map((p) => {
        const s = p.user_settings || {};
        return {
          id: p.id,
          username: p.username || '',
          display_name: s.display_name || p.full_name || 'Creator',
          avatar_url: s.avatar_url || '',
          bio: (s.bio || '').slice(0, 120),
          partner_type: p.partner_type || null,
          creator_tier: p.creator_tier || 'creator',
          followers: followerMap[p.id] || 0,
        };
      })
      .sort(
        (a, b) =>
          (TIER_RANK[b.creator_tier] || 0) - (TIER_RANK[a.creator_tier] || 0) ||
          b.followers - a.followers,
      )
      .slice(0, 6);

    return NextResponse.json({ creators });
  } catch (e) {
    console.error('featured-creators:', e);
    return NextResponse.json({ creators: [] });
  }
}
