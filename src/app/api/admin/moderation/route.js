/**
 * Admin moderation queue (admin session or ADMIN_LOCK_SECRET bearer).
 *   GET   open reports grouped by content, with a preview and the author's email
 *   POST  { contentType, contentId, action: 'hide' | 'copyright' | 'dismiss' | 'suspended' }
 *         hide: hide the content and mark its reports actioned
 *         copyright: hide it after a valid copyright notice (also usable for a
 *         notice that came by email, with no report) and email the uploader
 *         that it was removed and how to counter-notify (see /copyright)
 *         dismiss: close the reports and unhide the content
 *         suspended: record that the author was suspended (the page calls
 *         /api/admin/lock-user for the suspension itself)
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { requireAdminAccess } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';
import { CONTENT_TABLES, CONTENT_TYPES, isUuid } from '@/lib/moderation/core';
import { resend } from '@/lib/services/resend';
import { emailFooterHtml } from '@/lib/email/footer';
import { DMCA_FALLBACK_EMAIL, dmcaAgent } from '@/lib/legal/dmca';
import { NEWSLETTER_SITE_URL } from '@/lib/newsletter/config';

/** Transactional notice to the uploader after a copyright removal. */
async function emailCopyrightRemoval(admin, spec, contentId) {
  if (!process.env.RESEND_API_KEY) return false;
  const { data: row } = await admin
    .from(spec.table)
    .select(spec.author)
    .eq('id', contentId)
    .maybeSingle();
  const authorId = row?.[spec.author];
  if (!authorId) return false;
  const { data } = await admin.auth.admin.getUserById(authorId);
  const to = data?.user?.email;
  if (!to) return false;
  const contact = dmcaAgent()?.email || DMCA_FALLBACK_EMAIL;
  const policy = `${NEWSLETTER_SITE_URL}/copyright`;
  const { error } = await resend.emails.send({
    from: 'Ezana Finance <noreply@ezana.world>',
    to,
    subject: 'Something you posted on Ezana was removed after a copyright notice',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#111827;">
  <p style="color:#047857;font-weight:700;margin:0 0 20px;">Ezana Finance</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px;">We received a copyright notice about something you posted on Ezana, and we have removed it.</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 14px;">If you believe it was removed by mistake or misidentification, or that you have the right to post it, you can send a counter-notice to <a href="mailto:${contact}" style="color:#047857;">${contact}</a>. What a counter-notice must contain is set out in our <a href="${policy}" style="color:#047857;">Copyright and DMCA policy</a>.</p>
  <p style="font-size:15px;line-height:1.6;margin:0;">Accounts that receive repeated valid notices are closed.</p>
  ${emailFooterHtml()}
</div>`,
  });
  if (error) console.error('[admin/moderation] copyright email', error.message || error);
  return !error;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PREVIEW_COLS = {
  community_post: 'id, content, moderation_hidden_at',
  echo_comment: 'id, content, moderation_hidden_at',
  message: 'id, content, moderation_hidden_at',
  profile: 'id, full_name, username',
};

export const GET = withApiGuard(
  async (request, user) => {
    const forbidden = requireAdminAccess(request, user);
    if (forbidden) return forbidden;
    const admin = getAdminClient();
    const { data: reports, error } = await admin
      .from('content_reports')
      .select(
        'id, reporter_id, content_type, content_id, reported_user_id, reason, details, created_at',
      )
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(1000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const groups = new Map();
    for (const r of reports || []) {
      const k = `${r.content_type}:${r.content_id}`;
      if (!groups.has(k)) {
        groups.set(k, {
          contentType: r.content_type,
          contentId: r.content_id,
          reportedUserId: r.reported_user_id,
          firstReportedAt: r.created_at,
          reasons: {},
          details: [],
          reporters: new Set(),
        });
      }
      const g = groups.get(k);
      g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1;
      if (r.details) g.details.push(r.details);
      g.reporters.add(r.reporter_id);
    }

    const list = [...groups.values()];
    for (const type of CONTENT_TYPES) {
      const ids = list.filter((g) => g.contentType === type).map((g) => g.contentId);
      if (!ids.length) continue;
      const { data } = await admin
        .from(CONTENT_TABLES[type].table)
        .select(PREVIEW_COLS[type])
        .in('id', ids);
      const byId = new Map((data || []).map((d) => [d.id, d]));
      for (const g of list.filter((x) => x.contentType === type)) {
        const d = byId.get(g.contentId);
        g.preview = d ? String(d.content || d.full_name || d.username || '').slice(0, 400) : null;
        g.hidden = !!d?.moderation_hidden_at;
      }
    }
    const emails = new Map();
    for (const id of [...new Set(list.map((g) => g.reportedUserId).filter(Boolean))]) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emails.set(id, data.user.email);
    }
    const out = list
      .map((g) => ({
        ...g,
        reporters: g.reporters.size,
        reportedEmail: emails.get(g.reportedUserId) || null,
      }))
      .sort(
        (a, b) => b.reporters - a.reporters || a.firstReportedAt.localeCompare(b.firstReportedAt),
      );
    return NextResponse.json({ groups: out });
  },
  { requireAuth: true, strict: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    const forbidden = requireAdminAccess(request, user);
    if (forbidden) return forbidden;
    const body = await request.json().catch(() => ({}));
    const { contentType, contentId, action } = body || {};
    if (!CONTENT_TYPES.includes(contentType) || !isUuid(contentId)) {
      return NextResponse.json({ error: 'Unknown content.' }, { status: 400 });
    }
    if (!['hide', 'copyright', 'dismiss', 'suspended'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    const admin = getAdminClient();
    const spec = CONTENT_TABLES[contentType];
    if (action === 'copyright' && !spec.hideable) {
      return NextResponse.json(
        { error: 'Profiles cannot be hidden; remove the image from storage instead.' },
        { status: 400 },
      );
    }
    if (spec.hideable && action !== 'dismiss') {
      await admin
        .from(spec.table)
        .update({ moderation_hidden_at: new Date().toISOString() })
        .eq('id', contentId)
        .is('moderation_hidden_at', null);
    }
    if (spec.hideable && action === 'dismiss') {
      await admin.from(spec.table).update({ moderation_hidden_at: null }).eq('id', contentId);
    }
    const { error } = await admin
      .from('content_reports')
      .update({
        status: action === 'dismiss' ? 'dismissed' : 'actioned',
        action:
          action === 'dismiss'
            ? 'none'
            : action === 'hide' || action === 'copyright'
              ? 'hidden'
              : 'user_suspended',
        reviewed_by: user?.email || 'admin',
        reviewed_at: new Date().toISOString(),
      })
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('status', 'open');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (action === 'copyright') {
      const emailed = await emailCopyrightRemoval(admin, spec, contentId);
      return NextResponse.json({ ok: true, emailed });
    }
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true, strict: true },
);
