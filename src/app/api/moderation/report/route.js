/**
 * POST /api/moderation/report  { contentType, contentId, reason, details? }
 * Signed-in users report a community post, Echo comment, direct message or
 * profile. One report per user per item (repeat reports are accepted
 * quietly). Content with open reports from three or more different users is
 * hidden pending review.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { CONTENT_TABLES, shouldAutoHide, validateReport } from '@/lib/moderation/core';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    const rl = await checkRateLimit(`moderation:report:${user.id}`, {
      interval: 60 * 60 * 1000,
      limit: 30,
    });
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json().catch(() => ({}));
    const v = validateReport(body);
    if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
    const { contentType, contentId, reason, details } = v.value;

    const admin = getAdminClient();
    const spec = CONTENT_TABLES[contentType];
    const { data: content } = await admin
      .from(spec.table)
      .select(`id, ${spec.author}`)
      .eq('id', contentId)
      .maybeSingle();
    if (!content)
      return NextResponse.json({ error: 'That content no longer exists.' }, { status: 404 });
    const reportedUserId = content[spec.author] || null;
    if (reportedUserId === user.id) {
      return NextResponse.json({ error: 'You cannot report your own content.' }, { status: 400 });
    }

    const { error } = await admin.from('content_reports').insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reported_user_id: reportedUserId,
      reason,
      details,
    });
    if (error && error.code !== '23505') {
      console.error('[moderation/report]', error.message);
      return NextResponse.json({ error: 'Could not send the report.' }, { status: 500 });
    }

    if (spec.hideable) {
      const { data: open } = await admin
        .from('content_reports')
        .select('reporter_id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('status', 'open');
      const reporters = new Set((open || []).map((r) => r.reporter_id)).size;
      if (shouldAutoHide(reporters)) {
        await admin
          .from(spec.table)
          .update({ moderation_hidden_at: new Date().toISOString() })
          .eq('id', contentId)
          .is('moderation_hidden_at', null);
      }
    }
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
