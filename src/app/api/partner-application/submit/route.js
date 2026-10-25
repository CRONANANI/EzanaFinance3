import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { sanitizeObject } from '@/lib/sanitize';
import { resend } from '@/lib/services/resend';
import { logger } from '@/lib/logger';
import { submitPartnerApplication } from '@/lib/partner-application';

export const dynamic = 'force-dynamic';

async function handlePost(request) {
  const rawBody = await request.json();
  const { status, body } = await submitPartnerApplication({
    db: getAdminClient(),
    resend,
    logger,
    body: sanitizeObject(rawBody),
    isDev: process.env.NODE_ENV === 'development',
  });
  return NextResponse.json(body, { status });
}

export const POST = withApiGuard(handlePost, { requireAuth: false, strict: true });
