import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { checkRateLimit } from '@/lib/persistent-rate-limit';
import { resend } from '@/lib/services/resend';
import { logger } from '@/lib/logger';
import {
  normalizeEmail,
  resendPartnerVerification,
  RESEND_GENERIC_REPLY,
} from '@/lib/partner-application';

export const dynamic = 'force-dynamic';

/* Per-address cap on top of the guard's strict per-IP limit, so one inbox
   can't be flooded from many IPs. Over the cap the reply is still the
   generic one: the endpoint never says whether an application exists. */
const PER_EMAIL_LIMIT = 3;
const PER_EMAIL_WINDOW_MS = 60 * 60 * 1000;

async function handlePost(request) {
  let email = '';
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }
  const addr = normalizeEmail(email);
  if (!addr) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const rl = await checkRateLimit(`partner-resend:${addr}`, PER_EMAIL_LIMIT, PER_EMAIL_WINDOW_MS);
  if (rl.allowed) {
    const result = await resendPartnerVerification({
      db: getAdminClient(),
      resend,
      logger,
      email: addr,
    });
    if (!result.sent) logger.info('Partner resend skipped', { reason: result.reason });
  }
  return NextResponse.json(RESEND_GENERIC_REPLY);
}

export const POST = withApiGuard(handlePost, { requireAuth: false, strict: true });
