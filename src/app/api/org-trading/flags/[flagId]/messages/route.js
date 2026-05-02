import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const flagId = params.flagId;
  const { data: flag, error: flagErr } = await supabase
    .from('org_position_flags')
    .select('id, raiser_member_id, recipient_member_id')
    .eq('id', flagId)
    .maybeSingle();

  if (flagErr || !flag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const participant =
    flag.raiser_member_id === member.id || flag.recipient_member_id === member.id;
  if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { body } = payload;
  if (!body || String(body).trim() === '') {
    return NextResponse.json({ error: 'Body required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('org_flag_messages')
    .insert({ flag_id: flagId, author_member_id: member.id, body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
