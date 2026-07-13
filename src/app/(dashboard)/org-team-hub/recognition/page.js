import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { RecognitionWall } from '@/components/org/social2/RecognitionWall';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

// Mirrors what RecognitionWall.loadMeta() consumes from GET /api/org/recognition
// (members, viewer.canAward, viewer.memberId) and GET /api/org/recognition/recent
// (recent), so the client can seed and skip the mount fetch.
async function loadRecognition(supabase, member) {
  const { data: members } = await supabase
    .from('org_members')
    .select('id, user_id, display_name, role')
    .eq('org_id', member.org_id);
  const byUser = new Map((members || []).map((m) => [m.user_id, m]));

  const { data: recentRows, error } = await supabase
    .from('org_recognition')
    .select(
      'id, recipient_id, badge_type, title, reason, period, is_award, auto_generated, pitch_id, created_at',
    )
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) return null;

  const recent = (recentRows || []).map((r) => ({
    ...r,
    recipient_name: byUser.get(r.recipient_id)?.display_name || 'Member',
    recipient_member_id: byUser.get(r.recipient_id)?.id || null,
    recipient_role: byUser.get(r.recipient_id)?.role || null,
  }));

  return {
    members: (members || []).map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
    })),
    canAward: assertOrgRole(member, MANAGER_ROLES),
    viewerMemberId: member.id,
    recent,
  };
}

export default async function RecognitionPage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  const initialData = member ? await loadRecognition(supabase, member) : null;

  return (
    <div className="dashboard-page-inset">
      <RecognitionWall initialData={initialData} />
    </div>
  );
}
