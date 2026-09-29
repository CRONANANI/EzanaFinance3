/**
 * POST /api/referrals/validate { code } -> { valid, message }
 *
 * Public, rate-limited per IP (code lookups are the enumeration surface).
 * Never reveals who owns a code.
 */
import { NextResponse } from 'next/server';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { codeFormatProblem, normalizeCode, REFEREE_REWARD } from '@/lib/referrals';
import { findReferrerByCode } from '@/lib/referrals-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_MESSAGE = `Valid. You'll get 1 free month of ${REFEREE_REWARD.planName} after you verify your email.`;

export async function POST(request) {
  const rl = await checkRateLimit(`referral-validate:${getClientIp(request)}`, {
    limit: 20,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => ({}));
  const problem = codeFormatProblem(body?.code);
  if (problem) return NextResponse.json({ valid: false, message: problem });

  const code = normalizeCode(body.code);
  const owner = isServerSupabaseConfigured()
    ? await findReferrerByCode(getAdminClient(), code)
    : null;
  return NextResponse.json(
    owner
      ? { valid: true, message: VALID_MESSAGE }
      : { valid: false, message: "We couldn't find that code. Check it and try again." },
  );
}
