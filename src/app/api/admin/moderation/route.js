/**
 * Admin moderation queue (admin session or ADMIN_LOCK_SECRET bearer).
 *   GET   open reports grouped by content, with a preview and the author's email
 *   POST  { contentType, contentId, action: 'hide' | 'dismiss' | 'suspended' }
 *         hide: hide the content and mark its reports actioned
 *         dismiss: close the reports and unhide the content
 *         suspended: record that the author was suspended (the page calls
 *         /api/admin/lock-user for the suspension itself)
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { requireAdminAccess } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase';
import { CONTENT_TABLES, CONTENT_TYPES, isUuid } from '@/lib/moderation/core';

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
    if (!['hide', 'dismiss', 'suspended'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    const admin = getAdminClient();
    const spec = CONTENT_TABLES[contentType];
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
        action: action === 'dismiss' ? 'none' : action === 'hide' ? 'hidden' : 'user_suspended',
        reviewed_by: user?.email || 'admin',
        reviewed_at: new Date().toISOString(),
      })
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('status', 'open');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true, strict: true },
);
