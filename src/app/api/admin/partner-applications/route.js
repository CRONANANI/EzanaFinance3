/**
 * GET /api/admin/partner-applications?status=under_review|pending_documents|pending_verification|approved|rejected|all
 * Admin only. Applications newest first, each with 10-minute signed URLs for
 * its documents (private `documents` bucket), plus per-status counts.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { requireAdminAccess } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';
import { listPartnerApplications } from '@/lib/partner-application';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const denied = requireAdminAccess(request, user);
    if (denied) return denied;

    const status = new URL(request.url).searchParams.get('status') || 'under_review';
    const result = await listPartnerApplications(getAdminClient(), status);
    if (result.error) {
      logger.error('Admin partner applications list failed', { error: result.error });
      return NextResponse.json({ error: 'Could not load partner applications' }, { status: 500 });
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  },
  { requireAuth: true },
);
