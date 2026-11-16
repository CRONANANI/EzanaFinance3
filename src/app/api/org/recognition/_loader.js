/**
 * Recognition: the server side of GET /api/org/recognition, GET
 * /api/org/recognition/ratings and the page's first render.
 *
 * Every read runs as the signed-in member (the user client); the row
 * policies stay the gate. Nothing here writes.
 */
import { assertOrgRole } from '@/lib/org-trading-server';
import { isFacultyAdvisor, rankRatings } from '@/lib/org-recognition-model';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/**
 * Roster, sector teams, the latest 200 badges and awards (with recipient
 * and giver names) and what the viewer may do. Inactive members stay in the
 * roster so older awards keep their names; the award dialog lists active
 * members only.
 */
export async function loadRecognitionBase(supabase, member) {
  const orgId = member.org_id;
  const [{ data: members, error: mErr }, { data: teams }, { data: recs, error: rErr }] =
    await Promise.all([
      supabase
        .from('org_members')
        .select('id, user_id, display_name, role, sub_role, team_id, is_active')
        .eq('org_id', orgId),
      supabase.from('org_teams').select('id, name').eq('org_id', orgId).order('name'),
      supabase
        .from('org_recognition')
        .select(
          'id, recipient_id, awarded_by, badge_type, title, reason, period, is_award, auto_generated, pitch_id, created_at',
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
  if (mErr || rErr) return { error: (mErr || rErr).message };

  const byUser = new Map((members || []).map((m) => [m.user_id, m]));
  const pitchIds = [...new Set((recs || []).map((r) => r.pitch_id).filter(Boolean))];
  let tickers = new Map();
  if (pitchIds.length) {
    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('id, ticker')
      .in('id', pitchIds);
    tickers = new Map((pitches || []).map((p) => [p.id, p.ticker]));
  }

  const recognitions = (recs || []).map((r) => {
    const to = byUser.get(r.recipient_id);
    const by = r.awarded_by ? byUser.get(r.awarded_by) : null;
    return {
      ...r,
      recipient_name: to?.display_name || 'Member',
      recipient_member_id: to?.id || null,
      recipient_role: to?.role || null,
      awarded_by_name: r.auto_generated ? null : by?.display_name || null,
      pitch_ticker: r.pitch_id ? tickers.get(r.pitch_id) || null : null,
    };
  });

  return {
    payload: {
      recognitions,
      members: (members || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        display_name: m.display_name,
        role: m.role,
        sub_role: m.sub_role || null,
        team_id: m.team_id || null,
        is_active: m.is_active !== false,
      })),
      teams: teams || [],
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        canAward: assertOrgRole(member, MANAGER_ROLES),
        isAdvisor: isFacultyAdvisor(member),
      },
    },
  };
}

/**
 * The ranked list for a list mode (and period, for Top movers) plus the
 * figures the KPI strip needs. The ranking rules live in rankRatings.
 */
export async function loadRatings(supabase, member, listMode, period, now = Date.now()) {
  const orgId = member.org_id;
  const [{ data: ratings, error }, { data: members }, { data: tx }, { data: lastCat }] =
    await Promise.all([
      supabase
        .from('org_member_rating')
        .select('member_id, rating, tier, rated_thesis_count, updated_at')
        .eq('org_id', orgId),
      supabase
        .from('org_members')
        .select('id, user_id, display_name, role, sub_role, is_active')
        .eq('org_id', orgId)
        .eq('is_active', true),
      supabase
        .from('org_rating_transactions')
        .select('member_id, delta, reason, metadata, created_at')
        .eq('org_id', orgId),
      supabase
        .from('org_rating_categories')
        .select('computed_at')
        .eq('org_id', orgId)
        .order('computed_at', { ascending: false })
        .limit(1),
    ]);
  if (error) return { error: error.message };
  return {
    payload: rankRatings({
      members: members || [],
      ratings: ratings || [],
      transactions: tx || [],
      lastRecompute: lastCat?.[0]?.computed_at || null,
      listMode,
      period,
      now,
    }),
  };
}
