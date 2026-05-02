import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FLAG_DETAIL_SELECT = `
  *,
  attachments:org_flag_attachments(*),
  messages:org_flag_messages(
    *,
    author:org_members!org_flag_messages_author_member_id_fkey(display_name, role, sub_role)
  )
`;

export async function GET(request, { params }) {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const flagId = params.flagId;
  const { data: flag, error } = await supabase
    .from('org_position_flags')
    .select(FLAG_DETAIL_SELECT)
    .eq('id', flagId)
    .maybeSingle();

  if (error || !flag) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed =
    flag.raiser_member_id === member.id || flag.recipient_member_id === member.id;
  if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (flag.messages?.length) {
    flag.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  return NextResponse.json({ flag });
}

export async function PATCH(request, { params }) {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const flagId = params.flagId;
  const { data: existing, error: fetchErr } = await supabase
    .from('org_position_flags')
    .select('id, raiser_member_id, recipient_member_id, status')
    .eq('id', flagId)
    .maybeSingle();

  if (fetchErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const participant =
    existing.raiser_member_id === member.id || existing.recipient_member_id === member.id;
  if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { status, resolution_note } = body;
  if (!['acknowledged', 'resolved', 'escalated'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates = { status };
  if (status === 'resolved') {
    updates.resolved_by = member.id;
    updates.resolved_at = new Date().toISOString();
    updates.resolution_note = resolution_note || null;
  }

  const { data, error } = await supabase
    .from('org_position_flags')
    .update(updates)
    .eq('id', flagId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flag: data });
}
