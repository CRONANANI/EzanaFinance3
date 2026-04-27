import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Ezana <noreply@ezana.world>';
const DEFAULT_GRACE_DAYS = 14;

/**
 * POST /api/account/delete — soft-delete with grace period + reactivation email.
 */
export async function POST() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Service unavailable. Please contact support.' },
        { status: 500 },
      );
    }

    const admin = createServerSupabaseClient();

    const { data: profile, error: readErr } = await admin
      .from('profiles')
      .select(
        'subscription_id, subscription_period_end, subscription_status, deleted_at, deletion_scheduled_for',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (readErr) {
      console.error('[account/delete] profile read error:', readErr);
      return NextResponse.json({ error: 'Could not read profile' }, { status: 500 });
    }

    if (profile?.deleted_at) {
      return NextResponse.json({
        success: true,
        already_scheduled: true,
        deletion_scheduled_for: profile.deletion_scheduled_for,
      });
    }

    let deletionScheduledFor;
    let stripeCanceled = false;

    const activeLike =
      profile?.subscription_status &&
      ['active', 'trialing', 'past_due'].includes(profile.subscription_status);

    if (profile?.subscription_id && stripe && activeLike) {
      try {
        const sub = await stripe.subscriptions.update(profile.subscription_id, {
          cancel_at_period_end: true,
        });
        deletionScheduledFor = new Date(sub.current_period_end * 1000).toISOString();
        stripeCanceled = true;
      } catch (stripeErr) {
        console.error('[account/delete] Stripe cancel failed:', stripeErr);
        if (
          profile?.subscription_period_end &&
          new Date(profile.subscription_period_end) > new Date()
        ) {
          deletionScheduledFor = new Date(profile.subscription_period_end).toISOString();
        } else {
          deletionScheduledFor = new Date(
            Date.now() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString();
        }
      }
    } else if (
      profile?.subscription_period_end &&
      new Date(profile.subscription_period_end) > new Date()
    ) {
      deletionScheduledFor = new Date(profile.subscription_period_end).toISOString();
    } else {
      deletionScheduledFor = new Date(
        Date.now() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    const reactivationToken = randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        deleted_at: now,
        deletion_scheduled_for: deletionScheduledFor,
        reactivation_token: reactivationToken,
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('[account/delete] profile update failed:', updateErr);
      return NextResponse.json({ error: 'Could not schedule deletion' }, { status: 500 });
    }

    await admin.from('account_deletion_log').insert({
      user_id: user.id,
      event: 'deletion_requested',
      metadata: {
        deletion_scheduled_for: deletionScheduledFor,
        stripe_canceled: stripeCanceled,
        had_active_subscription: Boolean(profile?.subscription_id),
      },
    });

    const reactivationUrl = `${SITE_ORIGIN}/account/reactivate?token=${encodeURIComponent(reactivationToken)}`;
    const scheduledFor = new Date(deletionScheduledFor);
    const formattedDate = scheduledFor.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (process.env.RESEND_API_KEY && resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: 'Your Ezana account has been scheduled for deletion',
          html: buildDeletionEmail({ reactivationUrl, formattedDate, email: user.email }),
        });
      } catch (emailErr) {
        console.error('[account/delete] Resend send failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      deletion_scheduled_for: deletionScheduledFor,
      stripe_canceled: stripeCanceled,
    });
  } catch (err) {
    console.error('[account/delete] unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}

function buildDeletionEmail({ reactivationUrl, formattedDate, email }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0e13;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="background:#0d1117;border:1px solid rgba(16,185,129,0.15);border-radius:14px;padding:40px;max-width:560px;">
        <tr><td>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;color:#10b981;text-transform:uppercase;margin-bottom:8px;">Account deletion scheduled</div>
          <h1 style="margin:0 0 20px;font-size:1.5rem;font-weight:800;color:#f0f6fc;line-height:1.3;">We're sorry to see you go</h1>
          <p style="margin:0 0 16px;font-size:0.95rem;line-height:1.6;color:#d1d5db;">
            Hi there,
          </p>
          <p style="margin:0 0 16px;font-size:0.95rem;line-height:1.6;color:#d1d5db;">
            We've received your request to delete the Ezana account associated with <strong style="color:#f0f6fc;">${escapeHtml(email)}</strong>. Your account is now scheduled for permanent deletion on <strong style="color:#f0f6fc;">${escapeHtml(formattedDate)}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:0.95rem;line-height:1.6;color:#d1d5db;">
            If you've changed your mind, you can reactivate your account anytime before then. Your data is preserved during this grace period — nothing is permanently removed until the scheduled date.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr><td>
              <a href="${reactivationUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">
                Reactivate my account
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:0.8rem;color:#6b7280;line-height:1.5;">
            Or copy this link into your browser:
          </p>
          <p style="margin:0 0 24px;font-size:0.75rem;color:#9ca3af;word-break:break-all;background:rgba(16,185,129,0.05);padding:10px 12px;border-radius:6px;border:1px solid rgba(16,185,129,0.1);">
            ${escapeHtml(reactivationUrl)}
          </p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;">
          <p style="margin:0 0 8px;font-size:0.8rem;color:#9ca3af;line-height:1.5;"><strong style="color:#d1d5db;">What happens next:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:0.8rem;color:#9ca3af;line-height:1.7;">
            <li>You can log in until <strong style="color:#d1d5db;">${escapeHtml(formattedDate)}</strong></li>
            <li>Your active subscription will not renew (no further charges)</li>
            <li>After ${escapeHtml(formattedDate)}, all your data will be permanently deleted</li>
            <li>This action cannot be undone after the deletion date</li>
          </ul>
          <p style="margin:24px 0 0;font-size:0.75rem;color:#6b7280;line-height:1.5;">
            If you didn't request this, please <a href="${reactivationUrl}" style="color:#10b981;">reactivate your account immediately</a> and contact support@ezana.world.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s ?? '').replace(/[&<>"']/g, (c) => map[c] ?? c);
}
