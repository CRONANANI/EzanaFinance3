/**
 * POST /api/admin/partner-applications/:id  { action: 'approve' | 'reject', note? }
 * Admin only. Approve creates the partner (find or invite the auth user,
 * partners row active, profiles.is_partner, app_metadata.partner_role) and
 * emails the applicant; reject records the decision and emails them.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { requireAdminAccess } from '@/lib/admin-auth';
import { resend } from '@/lib/services/resend';
import { logger } from '@/lib/logger';
import { reviewPartnerApplication } from '@/lib/partner-application';
import { grantPartnerAccess, findOrInviteAuthUser } from '@/lib/partner-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = withApiGuard(
  async (request, user, context) => {
    const denied = requireAdminAccess(request, user);
    if (denied) return denied;

    const id = context?.params?.id;
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));

    const { status, body: out } = await reviewPartnerApplication({
      db: getAdminClient(),
      resend,
      logger,
      partnerAdmin: { grantPartnerAccess, findOrInviteAuthUser },
      applicationId: id,
      action: body?.action,
      note: typeof body?.note === 'string' ? body.note : '',
      reviewerId: user?.id || null,
    });
    if (status === 200) {
      logger.info('Partner application reviewed', {
        applicationId: id,
        decision: out.status,
        reviewerId: user?.id,
      });
    }
    return NextResponse.json(out, { status });
  },
  { requireAuth: true, strict: true },
);
