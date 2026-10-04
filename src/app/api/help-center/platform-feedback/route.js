import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminClient, getCurrentUser } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { FEEDBACK_AREAS, FEEDBACK_PRODUCTS } from '@/lib/help-center/feedback-routing';

/**
 * POST /api/help-center/platform-feedback
 * Body: { area: 'platform'|'product'|'support', product?, message, email?, page?, website? }
 *
 * Feedback from the help centre's changelog section. Public (anonymous
 * allowed); a signed-in visitor's id and email come from the session, never
 * the body. Every message is saved to public.platform_feedback FIRST, so
 * nothing is lost if email delivery fails, then emailed to the team that owns
 * the area (lib/help-center/feedback-routing.js). The response names that
 * team so the page can tell the visitor who has their message.
 *
 * `website` is a honeypot: real visitors never see or fill it.
 */
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

const escapeHtml = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export async function POST(request) {
  const rl = await checkRateLimit(`help:platform-feedback:${getClientIp(request)}`, {
    limit: 5,
    window: '10 m',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const route = FEEDBACK_AREAS[String(body.area || '')];
  const product =
    body.area === 'product' && FEEDBACK_PRODUCTS.some((p) => p.value === body.product)
      ? body.product
      : null;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : null;

  /* Honeypot: answer like a success so bots learn nothing. */
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true, team: route?.team || 'Ezana team' });
  }

  const errors = {};
  if (!route) errors.area = 'Choose what your feedback is about';
  if (body.area === 'product' && !product) errors.product = 'Choose a product';
  if (message.length < MIN_MESSAGE)
    errors.message = `Tell us a little more (at least ${MIN_MESSAGE} characters)`;
  if (message.length > MAX_MESSAGE) errors.message = `Keep it under ${MAX_MESSAGE} characters`;

  const user = await getCurrentUser(request).catch(() => null);
  let email = user?.email || (typeof body.email === 'string' ? body.email.trim() : '');
  if (email && !EMAIL_RE.test(email)) errors.email = 'That email address does not look right';
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, error: 'Validation failed', errors }, { status: 400 });
  }
  email = email || null;

  /* 1. Save. */
  let saved = null;
  try {
    const { data, error } = await getAdminClient()
      .from('platform_feedback')
      .insert({
        area: body.area,
        product,
        message,
        email,
        user_id: user?.id || null,
        page_path: page,
        routed_to: route.team,
      })
      .select('id')
      .single();
    if (error) throw error;
    saved = data;
  } catch (err) {
    console.error('[platform-feedback] save failed:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: 'We could not send your feedback. Please try again.' },
      { status: 500 },
    );
  }

  /* 2. Notify the owning team. Best effort: the row is already saved. */
  const inbox =
    process.env[route.inboxEnv] || process.env.SUPPORT_INBOX || 'support@ezanafinance.com';
  if (process.env.RESEND_API_KEY) {
    try {
      const productLabel = product
        ? FEEDBACK_PRODUCTS.find((p) => p.value === product)?.label
        : null;
      const subject = `[Feedback · ${route.label}${productLabel ? ` · ${productLabel}` : ''}] ${message.slice(0, 60)}`;
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Ezana Feedback <noreply@ezana.world>',
        to: [inbox],
        ...(email ? { replyTo: email } : {}),
        subject,
        text:
          `Area: ${route.label}${productLabel ? ` (${productLabel})` : ''}\n` +
          `From: ${email || 'anonymous'}${user?.id ? ' (signed in)' : ''}\n` +
          `Page: ${page || 'help centre'}\n` +
          `Ref: ${saved.id}\n\n${message}\n`,
        html:
          `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px">` +
          `<p style="margin:0 0 8px;color:#64748b;font-size:13px">${escapeHtml(route.label)}${productLabel ? ` · ${escapeHtml(productLabel)}` : ''} · ${escapeHtml(email || 'anonymous')}</p>` +
          `<div style="white-space:pre-wrap;font-size:14px;line-height:1.55">${escapeHtml(message)}</div>` +
          `<p style="margin:16px 0 0;color:#94a3b8;font-size:12px">Ref ${saved.id} · sent from ${escapeHtml(page || 'the help centre')}</p></div>`,
      });
      if (error) console.error('[platform-feedback] email failed:', error);
    } catch (err) {
      console.error('[platform-feedback] email failed:', err?.message || err);
    }
  }

  return NextResponse.json({ ok: true, team: route.team });
}
