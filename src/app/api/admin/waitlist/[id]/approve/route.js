/**
 * POST /api/admin/waitlist/:id/approve
 * Admin only. Issues a fresh one-time invite (pending, or approved to resend),
 * stores only its hash, and emails the link. Without email configured, the
 * link comes back in the response so the admin can send it by hand.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminClient } from '@/lib/supabase';
import { escapeHtml, sanitizeUUID } from '@/lib/sanitize';
import { emailFooterHtml } from '@/lib/email/footer';
import { requireWaitlistAdmin } from '@/lib/waitlist/admin';
import {
  INVITE_TTL_DAYS,
  inviteNames,
  inviteUrl,
  newInviteToken,
  senderAddress,
} from '@/lib/waitlist/invite';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { user, denied } = await requireWaitlistAdmin(request);
  if (denied) return denied;
  const id = sanitizeUUID(params?.id);
  if (!id) return NextResponse.json({ ok: false, error: 'Invalid id.' }, { status: 400 });

  const admin = getAdminClient();
  const { data: row, error: readErr } = await admin
    .from('waitlist')
    .select('id, email, full_name, status, metadata')
    .eq('id', id)
    .maybeSingle();
  if (readErr || !row) {
    return NextResponse.json({ ok: false, error: 'Waitlist entry not found.' }, { status: 404 });
  }
  if (row.status !== 'pending' && row.status !== 'approved') {
    return NextResponse.json(
      { ok: false, error: `Cannot invite an entry that is ${row.status}.` },
      { status: 409 },
    );
  }

  const { token, hash } = newInviteToken();
  const now = new Date();
  const expires = new Date(now.getTime() + INVITE_TTL_DAYS * 86400000);
  const { error: upErr } = await admin
    .from('waitlist')
    .update({
      status: 'approved',
      invite_token_hash: hash,
      invite_expires_at: expires.toISOString(),
      approved_at: now.toISOString(),
      invited_at: now.toISOString(),
      approved_by: user.email,
    })
    .eq('id', id);
  if (upErr) {
    console.error('[admin/waitlist approve] update failed:', upErr.message);
    return NextResponse.json({ ok: false, error: 'Could not approve.' }, { status: 500 });
  }

  const url = inviteUrl(token);
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, emailed: false, inviteUrl: url });
  }
  try {
    const { firstName } = inviteNames(row);
    const { error: sendErr } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: senderAddress(),
      to: row.email,
      subject: 'Your Ezana invite is ready',
      html: inviteEmail(firstName, url),
    });
    if (sendErr) throw new Error(sendErr.message || 'send failed');
  } catch (err) {
    console.error('[admin/waitlist approve] email failed:', err?.message || err);
    return NextResponse.json({ ok: true, emailed: false, inviteUrl: url });
  }
  return NextResponse.json({ ok: true, emailed: true });
}

function inviteEmail(firstName, url) {
  const name = escapeHtml(firstName || 'there');
  const href = escapeHtml(url);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <p style="color:#047857;font-size:20px;font-weight:700;margin:0 0 28px;text-align:center;">Ezana Finance</p>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:36px;">
      <h1 style="color:#111827;font-size:22px;margin:0 0 14px;">Your invite is ready, ${name}.</h1>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your spot on the Ezana waitlist has come up. Use the button below to create your account.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${href}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;">Create your account</a>
      </p>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
        The link is personal, works once and expires in ${INVITE_TTL_DAYS} days. If the button does not work, paste this address into your browser:<br>
        <span style="color:#047857;word-break:break-all;">${href}</span>
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
