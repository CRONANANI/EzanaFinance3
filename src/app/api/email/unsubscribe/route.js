import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { UNSUBSCRIBE_CATEGORIES, verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import { escapeHtml } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * One-click unsubscribe for notification emails. No sign-in: the signed token
 * names the account and the category. Takes effect immediately and is
 * idempotent. GET is the link in the email; POST is the RFC 8058 one-click
 * request mail apps send from the List-Unsubscribe-Post header.
 */
async function apply(token) {
  const hit = verifyUnsubscribeToken(token);
  if (!hit) return null;
  const { setting, label } = UNSUBSCRIBE_CATEGORIES[hit.category];
  const admin = getAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('user_settings')
    .eq('id', hit.userId)
    .maybeSingle();
  if (error || !profile) return null;
  const user_settings = { ...(profile.user_settings || {}), [setting]: false };
  const { error: updErr } = await admin
    .from('profiles')
    .update({ user_settings })
    .eq('id', hit.userId);
  if (updErr) {
    console.error('[email-unsubscribe] update failed', updErr.message);
    return null;
  }
  return label;
}

function page(title, body, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>${escapeHtml(
      title,
    )}</title></head><body style="margin:0;background:#f8fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;"><main style="max-width:480px;margin:72px auto;padding:32px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;"><p style="color:#047857;font-weight:700;margin:0 0 16px;">Ezana Finance</p><h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(
      title,
    )}</h1><p style="font-size:15px;line-height:1.6;color:#374151;margin:0;">${body}</p></main></body></html>`,
    {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    },
  );
}

export async function GET(request) {
  const rl = await checkRateLimit(`email-unsub:${getClientIp(request)}`, { limit: 30 });
  if (!rl.success) return rateLimitResponse(rl);
  const label = await apply(new URL(request.url).searchParams.get('token'));
  if (!label) {
    return page(
      'This link is not valid',
      'The unsubscribe link is broken or incomplete. You can turn emails off in Settings, Notifications.',
      400,
    );
  }
  return page(
    'You are unsubscribed',
    `You will no longer receive ${escapeHtml(label)}. It took effect right away. You can turn them back on in Settings, Notifications.`,
  );
}

export async function POST(request) {
  const label = await apply(new URL(request.url).searchParams.get('token'));
  return NextResponse.json({ ok: !!label }, { status: label ? 200 : 400 });
}
