import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { resend } from '@/lib/services/resend';
import {
  NEWSLETTER_CONSENT_TEXT,
  NEWSLETTER_FROM,
  listUnsubscribeHeader,
  newsletterConfirmUrl,
  newsletterUnsubscribeUrl,
} from '@/lib/newsletter/config';
import { buildConfirmationEmail } from '@/lib/newsletter/emails';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Allows + addressing (noah+news@x.com) but rejects the obvious typos (no @, no dot).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Marketing newsletter signup — double opt-in with an express-consent record.
 * Separate from /api/newsletter/subscribe (the Echo list) and /api/waitlist.
 * Rate-limited by IP (strict) since it's public + scrapeable, and it returns the
 * SAME generic success whether the address is new or already pending, so it is
 * not an email-enumeration oracle.
 */
export const POST = withApiGuard(
  async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { email, fullName, marketing_consent, consent_text, source } = body || {};

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // Express consent is MANDATORY and never inferred from the act of submitting.
    if (marketing_consent !== true) {
      return NextResponse.json(
        { error: 'Please tick the consent box to subscribe.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = createServerSupabaseClient();

    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const consentText =
      typeof consent_text === 'string' && consent_text.trim()
        ? consent_text.trim().slice(0, 500)
        : NEWSLETTER_CONSENT_TEXT;

    // Identical response for new AND pending — do not reveal which.
    const pendingResponse = NextResponse.json(
      { ok: true, state: 'pending', message: 'Check your email to confirm your subscription.' },
      { status: 200 },
    );

    // Email is stored normalized; the lower(email) unique index guards case.
    const { data: existing } = await supabase
      .from('marketing_subscribers')
      .select('id, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // Already confirmed → acknowledge, don't re-send, don't leak more than this.
    if (existing?.status === 'confirmed') {
      return NextResponse.json(
        { ok: true, state: 'already_subscribed', message: "You're already subscribed." },
        { status: 200 },
      );
    }
    // Prior spam complaint → never re-mail. Silent generic success.
    if (existing?.status === 'complained') {
      return pendingResponse;
    }

    const confirmToken = randomBytes(32).toString('hex');
    const nowIso = new Date().toISOString();
    // A fresh consent record on EVERY (re)subscribe — a prior unsubscribe never
    // carries consent forward.
    const consentRow = {
      marketing_consent: true,
      consent_text: consentText,
      consent_at: nowIso,
      consent_ip: ip,
      consent_user_agent: userAgent,
    };

    let unsubscribeToken = null;
    if (existing) {
      // pending / unsubscribed / bounced → re-subscribe with a new token + fresh consent.
      const { data: updated, error: updErr } = await supabase
        .from('marketing_subscribers')
        .update({
          full_name: fullName || null,
          status: 'pending',
          ...consentRow,
          confirm_token: confirmToken,
          confirm_sent_at: nowIso,
          confirmed_at: null,
          unsubscribed_at: null,
          unsubscribe_reason: null,
          updated_at: nowIso,
        })
        .eq('id', existing.id)
        .select('unsubscribe_token')
        .single();
      if (updErr) {
        console.error('marketing subscribe update error:', updErr);
        return NextResponse.json(
          { error: 'Subscription failed. Please try again.' },
          { status: 500 },
        );
      }
      unsubscribeToken = updated?.unsubscribe_token || null;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('marketing_subscribers')
        .insert([
          {
            email: normalizedEmail,
            full_name: fullName || null,
            status: 'pending',
            ...consentRow,
            confirm_token: confirmToken,
            confirm_sent_at: nowIso,
            source: typeof source === 'string' ? source.slice(0, 64) : 'landing_footer',
            metadata: { signup_page: 'landing_footer' },
          },
        ])
        .select('unsubscribe_token')
        .single();
      if (insErr) {
        // Unique-violation race → treat as generic pending success, don't leak.
        if (insErr.code === '23505') return pendingResponse;
        console.error('marketing subscribe insert error:', insErr);
        return NextResponse.json(
          { error: 'Subscription failed. Please try again.' },
          { status: 500 },
        );
      }
      unsubscribeToken = inserted?.unsubscribe_token || null;
    }

    // Send the confirmation email. A send failure must not 500 the request (the
    // row is saved); the user is still told to check their inbox.
    if (process.env.RESEND_API_KEY && unsubscribeToken) {
      try {
        const { subject, html, text } = buildConfirmationEmail({
          confirmUrl: newsletterConfirmUrl(confirmToken),
          unsubscribeUrl: newsletterUnsubscribeUrl(unsubscribeToken),
        });
        await resend.emails.send({
          from: NEWSLETTER_FROM,
          to: normalizedEmail,
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': listUnsubscribeHeader(unsubscribeToken),
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
      } catch (e) {
        console.error('marketing confirmation email error:', e);
      }
    }

    return pendingResponse;
  },
  { requireAuth: false, strict: true },
);
