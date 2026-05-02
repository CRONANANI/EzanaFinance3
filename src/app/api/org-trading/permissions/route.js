import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getMemberPermissions } from '@/lib/orgMockData';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return NextResponse.json({ permissions: [] });

  const { data: overrideRows } = await supabase
    .from('org_member_permissions')
    .select('permission_key')
    .eq('org_member_id', member.id);

  const overrides = (overrideRows || []).map((r) => r.permission_key);
  const perms = getMemberPermissions(member, overrides);
  return NextResponse.json({
    permissions: perms,
    role: member.role,
    sub_role: member.sub_role,
    can_flag_positions: perms.includes('flag_positions'),
    can_grant_permissions: perms.includes('grant_permissions'),
  });
}
