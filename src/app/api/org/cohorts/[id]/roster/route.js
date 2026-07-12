import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/cohorts/:id/roster — the cohort roster with lifecycle status,
   mentor, sector coverage, frozen-or-live rating (from org_member_rating), and
   pitch count. Ratings are honest-empty when no rating row exists — never
   fabricated. Includes the Roster stat strip. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: members, error } = await supabase
      .from('org_members')
      .select(
        'id, user_id, display_name, role, sub_role, title, tier, team_id, lifecycle_status, is_active, joined_at, mentor_member_id, departed_at, departure_reason',
      )
      .eq('org_id', member.org_id)
      .eq('cohort_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = members || [];
    const ids = rows.map((m) => m.id);
    const userIds = rows.map((m) => m.user_id).filter(Boolean);

    let sectorsByMember = new Map();
    let ratingByMember = new Map();
    let pitchCountByMember = new Map();

    if (ids.length > 0) {
      const [{ data: coverage }, { data: ratings }, { data: pitches }] = await Promise.all([
        supabase
          .from('org_sector_coverage')
          .select('member_id, sector, is_primary')
          .eq('org_id', member.org_id)
          .in('member_id', ids),
        supabase
          .from('org_member_rating')
          .select('member_id, rating, tier, rated_thesis_count, is_provisional')
          .eq('org_id', member.org_id)
          .in('member_id', ids),
        supabase
          .from('org_pitches')
          .select('analyst_member_id')
          .eq('org_id', member.org_id)
          .in('analyst_member_id', ids),
      ]);
      for (const c of coverage || []) {
        if (!sectorsByMember.has(c.member_id)) sectorsByMember.set(c.member_id, []);
        sectorsByMember.get(c.member_id).push({ sector: c.sector, isPrimary: c.is_primary });
      }
      for (const r of ratings || []) ratingByMember.set(r.member_id, r);
      for (const p of pitches || [])
        pitchCountByMember.set(
          p.analyst_member_id,
          (pitchCountByMember.get(p.analyst_member_id) || 0) + 1,
        );
    }

    const nameById = new Map(rows.map((m) => [m.id, m.display_name]));

    const shaped = rows.map((m) => {
      const rating = ratingByMember.get(m.id) || null;
      return {
        id: m.id,
        display_name: m.display_name,
        role: m.role,
        sub_role: m.sub_role || null,
        title: m.title || null,
        tier: m.tier || null,
        team_id: m.team_id || null,
        lifecycle_status: m.lifecycle_status || (m.is_active ? 'active' : 'departed'),
        is_active: m.is_active,
        joined_at: m.joined_at || null,
        departed_at: m.departed_at || null,
        departure_reason: m.departure_reason || null,
        mentor_member_id: m.mentor_member_id || null,
        mentor_name: m.mentor_member_id ? nameById.get(m.mentor_member_id) || null : null,
        sectors: sectorsByMember.get(m.id) || [],
        rating: rating ? Number(rating.rating) : null,
        rating_tier: rating?.tier || null,
        rating_provisional: rating ? !!rating.is_provisional : null,
        pitch_count: pitchCountByMember.get(m.id) || 0,
      };
    });

    // ── Stat strip: Active · Retention · Avg Rating · Sectors Covered ─────────
    const activeCount = shaped.filter((m) => m.lifecycle_status === 'active').length;
    const departedCount = shaped.filter((m) => m.lifecycle_status === 'departed').length;
    const retained = shaped.length - departedCount;
    const ratedNonProvisional = shaped.filter((m) => m.rating != null && !m.rating_provisional);
    const avgRating = ratedNonProvisional.length
      ? Math.round(
          ratedNonProvisional.reduce((s, m) => s + m.rating, 0) / ratedNonProvisional.length,
        )
      : null;
    const sectorsCovered = new Set();
    for (const m of shaped) for (const s of m.sectors) sectorsCovered.add(s.sector);

    return NextResponse.json({
      members: shaped,
      stats: {
        active: activeCount,
        retention_pct: shaped.length > 0 ? Math.round((retained / shaped.length) * 100) : null,
        avg_rating: avgRating,
        sectors_covered: sectorsCovered.size,
      },
      viewer: { memberId: member.id, canManage: MANAGER_ROLES.includes(member.role) },
    });
  },
  { requireAuth: true },
);
