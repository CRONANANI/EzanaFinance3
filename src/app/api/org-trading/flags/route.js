import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getMemberPermissions } from '@/lib/orgMockData';
import {
  buildRoutingProfile,
  dbTeamIdFromMockTeamId,
  getCurrentOrgMember,
  mockTeamIdFromDbTeams,
  normalizeTeamDbId,
  resolveRecipientOrgMemberId,
} from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FLAG_SELECT = `
  *,
  attachments:org_flag_attachments(*),
  raiser:org_members!org_position_flags_raiser_member_id_fkey(display_name, role, sub_role),
  recipient:org_members!org_position_flags_recipient_member_id_fkey(display_name, role, sub_role)
`;

/** GET /api/org-trading/flags?asRaiser&asRecipient&status&limit */
export async function GET(request) {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return NextResponse.json({ flags: [] });

  const { searchParams } = new URL(request.url);
  const asRaiser = searchParams.get('asRaiser') === 'true';
  const asRecipient = searchParams.get('asRecipient') === 'true';
  const status = searchParams.get('status');
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));

  let q = supabase
    .from('org_position_flags')
    .select(FLAG_SELECT)
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (asRaiser && asRecipient) {
    q = q.or(`raiser_member_id.eq.${member.id},recipient_member_id.eq.${member.id}`);
  } else if (asRaiser) {
    q = q.eq('raiser_member_id', member.id);
  } else if (asRecipient) {
    q = q.eq('recipient_member_id', member.id);
  }
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) {
    console.error('[org-trading/flags GET]', error);
    return NextResponse.json({ flags: [] });
  }
  return NextResponse.json({ flags: data || [] });
}

/** POST /api/org-trading/flags */
export async function POST(request) {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: permRows } = await supabase
    .from('org_member_permissions')
    .select('permission_key')
    .eq('org_member_id', member.id);
  const overrides = (permRows || []).map((p) => p.permission_key);
  const perms = getMemberPermissions(member, overrides);
  if (!perms.includes('flag_positions')) {
    return NextResponse.json({ error: 'You do not have permission to flag positions.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    ticker,
    team_id,
    mock_team_id,
    flag_color,
    subject,
    body: messageBody,
    position_snapshot,
    attachments = [],
  } = body;

  if (!ticker || !flag_color || !subject || !messageBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['green', 'red'].includes(flag_color)) {
    return NextResponse.json({ error: 'flag_color must be green or red' }, { status: 400 });
  }

  const { data: teams } = await supabase
    .from('org_teams')
    .select('id, slug')
    .eq('org_id', member.org_id);
  const orgTeams = teams || [];

  const teamDbId = normalizeTeamDbId(team_id) || dbTeamIdFromMockTeamId(orgTeams, mock_team_id);
  const mockTeamKey =
    mock_team_id || (teamDbId ? mockTeamIdFromDbTeams(orgTeams, teamDbId) : null) || null;

  const routingProfile = await buildRoutingProfile(member, supabase);
  const recipientOrgMemberId = await resolveRecipientOrgMemberId(
    supabase,
    member.org_id,
    routingProfile,
    ticker,
    mockTeamKey
  );

  if (!recipientOrgMemberId) {
    return NextResponse.json(
      {
        error: 'Could not determine flag recipient. Ensure roster names match the council demo data.',
      },
      { status: 400 }
    );
  }

  const { data: flag, error: insertErr } = await supabase
    .from('org_position_flags')
    .insert({
      org_id: member.org_id,
      team_id: teamDbId,
      ticker,
      raiser_member_id: member.id,
      recipient_member_id: recipientOrgMemberId,
      flag_color,
      subject,
      body: messageBody,
      position_shares: position_snapshot?.shares ?? null,
      position_avg_cost: position_snapshot?.avg_cost ?? null,
      position_current_price: position_snapshot?.current_price ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[org-trading/flags POST] insert', insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    const rows = attachments.map((a) => ({
      flag_id: flag.id,
      attachment_kind: a.attachment_kind,
      attachment_ref: a.attachment_ref,
      attachment_label: a.attachment_label || null,
      attachment_meta: a.attachment_meta || {},
    }));
    const { error: attachErr } = await supabase.from('org_flag_attachments').insert(rows);
    if (attachErr) console.error('[org-trading/flags POST] attachments', attachErr);
  }

  return NextResponse.json({ flag, recipient_id: recipientOrgMemberId });
}
