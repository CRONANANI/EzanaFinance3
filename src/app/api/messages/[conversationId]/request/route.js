/**
 * POST /api/messages/[conversationId]/request
 * Body: { action: 'accept' | 'decline' }
 *
 * The recipient answers a message request. Accept moves the thread into
 * both inboxes; decline hides it from the recipient and stops the
 * requester sending more (rules in src/lib/messages/requests.js).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getLazyAdminClient } from '@/lib/supabase';
import { insertNotificationAndPush } from '@/lib/push/fanout';
import { decideRespond, STATUS } from '@/lib/messages/requests';

export const dynamic = 'force-dynamic';

const admin = getLazyAdminClient();

export const POST = withApiGuard(
  async (request, user, context) => {
    try {
      const { conversationId } = context?.params ?? {};
      if (!conversationId) {
        return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
      }
      const body = await request.json().catch(() => ({}));
      const action = typeof body?.action === 'string' ? body.action : '';

      const { data: convo } = await admin
        .from('conversations')
        .select('id, participant_a, participant_b, status, requested_by')
        .eq('id', conversationId)
        .maybeSingle();

      const plan = decideRespond({ convo, userId: user.id, action });
      if (!plan.ok) {
        return NextResponse.json({ error: plan.error }, { status: plan.code });
      }

      /* Conditional on the row still being an open request, so a double
         click or a reply racing the button can't flip it twice. */
      const { data: updated, error } = await admin
        .from('conversations')
        .update({ status: plan.status, responded_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('status', STATUS.REQUEST)
        .select('id, status')
        .maybeSingle();

      if (error) {
        console.error('[messages/request POST] update error:', error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
      }
      if (!updated) {
        return NextResponse.json(
          { error: 'There is no open request on this conversation.' },
          { status: 409 },
        );
      }

      /* Tell the requester when they're accepted; a decline stays silent. */
      if (plan.status === STATUS.ACTIVE && convo.requested_by) {
        try {
          const { data: me } = await admin
            .from('profiles')
            .select('full_name, user_settings')
            .eq('id', user.id)
            .maybeSingle();
          const name =
            (me?.full_name || me?.user_settings?.display_name || '').trim() || 'A member';
          await insertNotificationAndPush(admin, {
            user_id: convo.requested_by,
            type: 'community',
            title: `${name} accepted your message request`,
            content: 'You can keep the conversation going in Messages.',
          });
        } catch (notifErr) {
          console.error('[messages/request POST] notification:', notifErr);
        }
      }

      return NextResponse.json({ conversation: { id: updated.id, status: updated.status } });
    } catch (e) {
      console.error('[messages/request POST] exception:', e?.message);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
