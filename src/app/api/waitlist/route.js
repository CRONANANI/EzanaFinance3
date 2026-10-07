/**
 * POST /api/waitlist: join the Ezana waitlist (the /auth/signup form).
 *
 * Body: { firstName, lastName, email, role, organization?, useCase?,
 *         heardFrom?, referralCode?, plan?, redirect?, ageConfirmed,
 *         marketingConsent? }
 *
 * ageConfirmed (18+) is required. marketingConsent is optional and off by
 * default; the stored wording is always the server's own copy, never what the
 * client sent, so the consent record matches the form exactly.
 *
 * No email enumeration: an address already on the list gets the same success
 * body as a new one and no second email. An admin later approves the row from
 * /admin/waitlist, which emails a one-time invite link.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { isValidCodeFormat, normalizeCode } from '@/lib/referrals';
import { safeInternalPath, escapeHtml } from '@/lib/sanitize';
import { EMAIL_RE } from '@/lib/auth/password-rules';
import { senderAddress } from '@/lib/waitlist/invite';
import { WAITLIST_HEARD_FROM, WAITLIST_ROLES } from '@/lib/waitlist/options';
import { AGE_CONFIRM_TEXT, WAITLIST_MARKETING_CONSENT_TEXT, isTrue } from '@/lib/legal/consent';
import { emailFooterHtml } from '@/lib/email/footer';

export const dynamic = 'force-dynamic';

const ROLE_VALUES = WAITLIST_ROLES.map((o) => o.value);
const HEARD_VALUES = WAITLIST_HEARD_FROM.map((o) => o.value);

const SUCCESS = {
  success: true,
  message: "You're on the list. We'll email you when your invite is ready.",
};

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
      }

      const firstName = str(body.firstName);
      const lastName = str(body.lastName);
      const email = str(body.email).toLowerCase();
      const role = str(body.role);
      const organization = str(body.organization);
      const useCase = str(body.useCase);
      const heardFrom = str(body.heardFrom);
      const referralRaw = str(body.referralCode);
      const plan = str(body.plan);
      const redirectRaw = str(body.redirect);

      const errors = {};
      if (!firstName || firstName.length > 60) errors.firstName = 'Enter your first name.';
      if (!lastName || lastName.length > 60) errors.lastName = 'Enter your last name.';
      if (!EMAIL_RE.test(email) || email.length > 254) {
        errors.email = 'Enter a valid email address.';
      }
      if (!ROLE_VALUES.includes(role)) errors.role = 'Choose what describes you.';
      if (organization.length > 120) errors.organization = 'Keep this under 120 characters.';
      if (useCase.length > 500) errors.useCase = 'Keep this under 500 characters.';
      if (heardFrom && !HEARD_VALUES.includes(heardFrom)) {
        errors.heardFrom = 'Choose one of the options.';
      }
      if (referralRaw && !isValidCodeFormat(referralRaw)) {
        errors.referralCode = 'That referral code does not look right.';
      }
      if (plan.length > 20) errors.plan = 'Invalid plan.';
      if (!isTrue(body.ageConfirmed)) {
        errors.ageConfirmed = 'You must be 18 or older to use Ezana.';
      }
      const marketingConsent = isTrue(body.marketingConsent);
      const consentAt = new Date().toISOString();
      if (Object.keys(errors).length) {
        return NextResponse.json({ error: 'Please check the form.', errors }, { status: 400 });
      }

      const referralCode = referralRaw ? normalizeCode(referralRaw) : null;
      const redirect = redirectRaw ? safeInternalPath(redirectRaw, '') || null : null;
      const supabase = getAdminClient();

      /* Already listed: same answer as a new entry, and no second email. */
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existing) return NextResponse.json(SUCCESS, { status: 200 });

      const forwardedFor = request.headers.get('x-forwarded-for');
      const { data, error: insertError } = await supabase
        .from('waitlist')
        .insert({
          email,
          full_name: `${firstName} ${lastName}`,
          referral_source: 'signup_page',
          ip_address: forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown',
          user_agent: (request.headers.get('user-agent') || 'unknown').slice(0, 400),
          status: 'pending',
          metadata: {
            first_name: firstName,
            last_name: lastName,
            role,
            organization: organization || null,
            use_case: useCase || null,
            heard_from: heardFrom || null,
            referral_code: referralCode,
            plan: plan || null,
            redirect,
            signup_page: 'auth_signup',
            signup_timestamp: consentAt,
            age_confirmed: true,
            age_confirmed_text: AGE_CONFIRM_TEXT,
            age_confirmed_at: consentAt,
            marketing_consent: marketingConsent,
            marketing_consent_text: WAITLIST_MARKETING_CONSENT_TEXT,
            marketing_consent_at: marketingConsent ? consentAt : null,
          },
        })
        .select('legacy_user, legacy_number')
        .single();

      if (insertError) {
        /* A racing duplicate on the unique email: same answer as success. */
        if (insertError.code === '23505') return NextResponse.json(SUCCESS, { status: 200 });
        console.error('[waitlist] insert error:', insertError);
        return NextResponse.json(
          { error: 'Could not join the waitlist. Please try again.' },
          { status: 500 },
        );
      }

      if (process.env.RESEND_API_KEY) {
        try {
          await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: senderAddress(),
            to: email,
            subject: "You're on the Ezana waitlist",
            html: waitlistEmail(firstName, data?.legacy_user, data?.legacy_number),
          });
        } catch (emailError) {
          console.error('[waitlist] email send error:', emailError);
        }
      }

      return NextResponse.json(SUCCESS, { status: 200 });
    } catch (error) {
      console.error('[waitlist] error:', error);
      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500 },
      );
    }
  },
  { requireAuth: false, strict: true },
);

function waitlistEmail(firstName, isLegacy, legacyNumber) {
  const name = escapeHtml(firstName || 'there');
  const legacyBadge = isLegacy
    ? `
    <div style="background:#047857;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
      <p style="color:#d1fae5;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Legacy Member</p>
      <p style="color:#ffffff;font-size:44px;font-weight:800;margin:0;line-height:1;">#${Number(legacyNumber) || ''}</p>
      <p style="color:#d1fae5;font-size:14px;margin:12px 0 0;">of the first 1,000 members</p>
    </div>`
    : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <p style="color:#047857;font-size:20px;font-weight:700;margin:0 0 28px;text-align:center;">Ezana Finance</p>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:36px;">
      <h1 style="color:#111827;font-size:22px;margin:0 0 14px;">You're on the list, ${name}.</h1>
      ${legacyBadge}
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 14px;">
        Thanks for joining the Ezana waitlist. We are opening access in waves so every new member gets a working account and real support.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
        When your wave opens we will email you a personal invite link. It is good for 14 days and lets you create your account in under a minute.
      </p>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin:28px 0 0;">
      You received this email because you joined the Ezana Finance waitlist.
    </p>
    ${emailFooterHtml()}
  </div>
</body>
</html>`;
}
