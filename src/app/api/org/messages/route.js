import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getMemberPermissions } from '@/lib/orgMockData';

export const dynamic = 'force-dynamic';

async function getCurrentMember(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('org_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

/** GET /api/org/messages?filter=inbox|sent|unread&limit=50 */
export async function GET(request) {
  const supabase = createServerSupabase();
  const member = await getCurrentMember(supabase);
  if (!member) return NextResponse.json({ messages: [] });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'inbox';
  const limit = Math.min(100, Number(searchParams.get('limit') || 50));

  let q = supabase
    .from('org_direct_messages')
    .select('*')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter === 'inbox') q = q.eq('recipient_member_id', member.id);
  else if (filter === 'sent') q = q.eq('sender_member_id', member.id);
  else if (filter === 'unread') q = q.eq('recipient_member_id', member.id).eq('is_read', false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ messages: [], error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data || [] });
}

/** POST /api/org/messages */
export async function POST(request) {
  const supabase = createServerSupabase();
  const member = await getCurrentMember(supabase);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: permRows } = await supabase
    .from('org_member_permissions')
    .select('permission_key')
    .eq('org_member_id', member.id);
  const overrides = (permRows || []).map((p) => p.permission_key);
  const memberForPerms = {
    role: member.role,
    sub_role: member.sub_role,
  };
  const perms = getMemberPermissions(memberForPerms, overrides);
  if (!perms.includes('send_to_team')) {
    return NextResponse.json({ error: 'You do not have Send to Team permission.' }, { status: 403 });
  }

  const body = await request.json();
  const {
    recipient_member_id: recipientMemberId,
    subject,
    body: msgBody,
    attachment_kind: attachmentKind,
    attachment_ref: attachmentRef,
    attachment_label: attachmentLabel,
    attachment_meta: attachmentMeta,
  } = body;

  const text = typeof msgBody === 'string' ? msgBody.trim() : '';
  if (!recipientMemberId || (!text && !attachmentKind)) {
    return NextResponse.json(
      { error: 'Recipient and message body (or attachment) required.' },
      { status: 400 }
    );
  }

  const { data: recipient } = await supabase
    .from('org_members')
    .select('id, org_id')
    .eq('id', recipientMemberId)
    .eq('is_active', true)
    .maybeSingle();
  if (!recipient || recipient.org_id !== member.org_id) {
    return NextResponse.json({ error: 'Invalid recipient.' }, { status: 400 });
  }

  const bodyStored =
    text ||
    (attachmentLabel ? `Shared: ${attachmentLabel}` : '(attachment)');

  const { data, error } = await supabase
    .from('org_direct_messages')
    .insert({
      org_id: member.org_id,
      sender_member_id: member.id,
      recipient_member_id: recipientMemberId,
      subject: subject || null,
      body: bodyStored,
      attachment_kind: attachmentKind || null,
      attachment_ref: attachmentRef || null,
      attachment_label: attachmentLabel || null,
      attachment_meta: attachmentMeta && typeof attachmentMeta === 'object' ? attachmentMeta : {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isServerSupabaseConfigured()) {
    try {
      const admin = createServerSupabaseClient();
      const { data: recipRow } = await admin
        .from('org_members')
        .select('user_id')
        .eq('id', recipientMemberId)
        .maybeSingle();
      const senderName = member.display_name || 'A team member';
      if (recipRow?.user_id) {
        await admin.from('user_notifications').insert({
          user_id: recipRow.user_id,
          title: 'Team message',
          content: `${senderName} sent you: ${subject || 'a message'}`,
          type: 'org_message',
        });
      }
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ message: data });
}
