import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { logger } from '@/lib/logger';
import { isTokenExpired } from '@/lib/partner-application';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const token = searchParams.get('token');

      if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

      const db = getAdminClient();
      const { data: app, error: lookupErr } = await db
        .from('partner_applications')
        .select(
          'id, full_name, email, email_verified, application_status, verification_token_expires',
        )
        .eq('verification_token', token)
        .maybeSingle();

      if (lookupErr) {
        logger.error('Partner verify lookup failed', { error: lookupErr.message });
        return NextResponse.json({ error: 'Could not look up this application' }, { status: 500 });
      }
      if (!app) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
      if (isTokenExpired(app)) {
        return NextResponse.json(
          { error: 'This link has expired. Request a new link or resubmit your application.' },
          { status: 410 },
        );
      }
      if (['approved', 'rejected'].includes(app.application_status)) {
        return NextResponse.json(
          { error: 'This application has already been reviewed.' },
          { status: 409 },
        );
      }

      let status = app.application_status;
      if (status === 'pending_verification') {
        const now = new Date().toISOString();
        const { error: updErr } = await db
          .from('partner_applications')
          .update({
            email_verified: true,
            email_verified_at: now,
            application_status: 'pending_documents',
            updated_at: now,
          })
          .eq('id', app.id);
        if (updErr) {
          logger.error('Partner verify update failed', {
            applicationId: app.id,
            error: updErr.message,
          });
          return NextResponse.json(
            { error: 'Could not confirm your email. Try the link again shortly.' },
            { status: 500 },
          );
        }
        status = 'pending_documents';
      }

      return NextResponse.json({
        success: true,
        applicationId: app.id,
        fullName: app.full_name,
        email: app.email,
        status: status === 'under_review' ? 'under_review' : 'pending_documents',
      });
    } catch (error) {
      return safeErrorResponse(error, { context: '[Partner Application] Verify' });
    }
  },
  { requireAuth: false, strict: true },
);
