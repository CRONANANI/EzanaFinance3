import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { RESPONSE_STATUSES } from '@/lib/org-flag-taxonomy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FLAG_DETAIL_SELECT = `
  *,
  attachments:org_flag_attachments(*),
  evidence:org_flag_evidence(*),
  responses:org_flag_response(
    *,
    responder:org_members!org_flag_response_responder_member_id_fkey(display_name, role, sub_role)
  ),
  raiser:org_members!org_position_flags_raiser_member_id_fkey(display_name, role, sub_role),
  recipient:org_members!org_position_flags_recipient_member_id_fkey(display_name, role, sub_role),
  sector_head:org_members!org_position_flags_sector_head_member_id_fkey(display_name, role, sub_role),
  outcome:org_flag_outcome(*),
  messages:org_flag_messages(
    *,
    author:org_members!org_flag_messages_author_member_id_fkey(display_name, role, sub_role)
  )
`;

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
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

    // Flags are public within the org (deliberate). Cross-org is blocked by RLS,
    // but double-check the org match here too.
    if (flag.org_id !== member.org_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (flag.messages?.length) {
      flag.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return NextResponse.json({ flag });
  },
  { requireAuth: true },
);

/**
 * PATCH — the resolution loop (P0). A routed recipient answers the flag:
 * Accept · Acknowledge · Reject (with a REQUIRED written rebuttal) · Escalate.
 * Every response is recorded in org_flag_response. Only the covering analyst or
 * the sector head the flag was routed to may respond — enforced here, not just
 * in the UI.
 */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const flagId = params.flagId;
    const { data: existing, error: fetchErr } = await supabase
      .from('org_position_flags')
      .select('id, org_id, raiser_member_id, recipient_member_id, sector_head_member_id, status')
      .eq('id', flagId)
      .maybeSingle();

    if (fetchErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.org_id !== member.org_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only the routed recipients (covering analyst / sector head) may respond.
    const isRoutedRecipient =
      existing.recipient_member_id === member.id || existing.sector_head_member_id === member.id;
    if (!isRoutedRecipient) {
      return NextResponse.json(
        { error: 'Only the routed recipient can respond to this flag.' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Accept both `response` (new) and legacy `status` for back-compat.
    const response = body.response || body.status;
    const rebuttalText = (body.rebuttal_text || '').trim();

    if (!RESPONSE_STATUSES.includes(response)) {
      return NextResponse.json(
        { error: `response must be one of ${RESPONSE_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    // The rebuttal is the feature: rejecting a flag forces a written defense.
    if (response === 'rejected' && !rebuttalText) {
      return NextResponse.json(
        { error: 'A written rebuttal is required to reject a flag.' },
        { status: 400 },
      );
    }

    // Record the response (the audit trail — every answer is written down).
    const { error: respErr } = await supabase.from('org_flag_response').insert({
      flag_id: flagId,
      org_id: existing.org_id,
      responder_member_id: member.id,
      response,
      rebuttal_text: response === 'rejected' ? rebuttalText : rebuttalText || null,
    });
    if (respErr) {
      console.error('[org-trading/flags PATCH] response insert', respErr);
      return NextResponse.json({ error: respErr.message }, { status: 500 });
    }

    // Reflect the answer on the flag itself.
    const updates = {
      status: response,
      resolved_by: member.id,
      resolved_at: new Date().toISOString(),
      resolution_note: rebuttalText || null,
    };
    if (response === 'escalated') updates.escalated_to_ic = true;

    const { data, error } = await supabase
      .from('org_position_flags')
      .update(updates)
      .eq('id', flagId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ flag: data });
  },
  { requireAuth: true },
);
