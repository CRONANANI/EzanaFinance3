/**
 * POST /api/admin/api-requests/<id>  Admin only.
 *   { action: 'approve', tier, scopes?, rateLimitPerMin?, expiresAt? }
 *       creates a pending key and a 7-day claim link, emails it (Resend);
 *       without email the link is returned once for the admin to send.
 *   { action: 'decline', note?, notify? }
 */
import { NextResponse } from 'next/server';
import { emailFooterHtml } from '@/lib/email/footer';
import { Resend } from 'resend';
import { getAdminClient } from '@/lib/supabase';
import { escapeHtml, sanitizeUUID } from '@/lib/sanitize';
import { requireWaitlistAdmin } from '@/lib/waitlist/admin';
import { senderAddress } from '@/lib/waitlist/invite';
import { approveRequest, claimUrl, CLAIM_TTL_DAYS, IssueError } from '@/lib/ezana-api/issue';
import { TIERS } from '@/lib/ezana-api/tiers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const { user, denied } = await requireWaitlistAdmin(request);
  if (denied) return denied;
  const id = sanitizeUUID(params?.id);
  if (!id) return NextResponse.json({ ok: false, error: 'Invalid id.' }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const admin = getAdminClient();
  const { data: req } = await admin
    .from('api_access_requests')
    .select('id, name, email, company, role, datasets, status')
    .eq('id', id)
    .maybeSingle();
  if (!req) return NextResponse.json({ ok: false, error: 'Request not found.' }, { status: 404 });

  if (body?.action === 'decline') {
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null;
    await admin
      .from('api_access_requests')
      .update({
        status: 'declined',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.email,
        review_note: note,
      })
      .eq('id', id);
    if (body.notify && process.env.RESEND_API_KEY) {
      try {
        await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: senderAddress(),
          to: req.email,
          subject: 'Your Ezana API request',
          html: plainEmail(
            `Thank you for your interest in the Ezana API. We are not able to offer a key for this request right now.${note ? ` ${note}` : ''}`,
          ),
        });
      } catch (e) {
        console.error('[admin/api-requests decline] email', e?.message || e);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body?.action !== 'approve') {
    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  }
  if (req.status === 'approved') {
    return NextResponse.json({ ok: false, error: 'Already approved.' }, { status: 409 });
  }
  if (body.tier && !TIERS[body.tier]) {
    return NextResponse.json({ ok: false, error: 'Unknown tier.' }, { status: 400 });
  }
  try {
    const { key, token } = await approveRequest(admin, req, {
      tier: body.tier,
      scopes: Array.isArray(body.scopes) ? body.scopes : null,
      rateLimitPerMin: body.rateLimitPerMin != null ? Number(body.rateLimitPerMin) : null,
      expiresAt: body.expiresAt || null,
      adminEmail: user.email,
    });
    const url = claimUrl(token);
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, emailed: false, claimUrl: url, key });
    }
    try {
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: senderAddress(),
        to: req.email,
        subject: 'Your Ezana API key is ready to claim',
        html: claimEmail(req.name, url, TIERS[key.tier].name),
      });
      if (error) throw new Error(error.message || 'send failed');
    } catch (e) {
      console.error('[admin/api-requests approve] email', e?.message || e);
      return NextResponse.json({ ok: true, emailed: false, claimUrl: url, key });
    }
    return NextResponse.json({ ok: true, emailed: true, key });
  } catch (e) {
    if (e instanceof IssueError)
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error('[admin/api-requests approve]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not approve.' }, { status: 500 });
  }
}

function shell(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
<p style="color:#047857;font-size:20px;font-weight:700;margin:0 0 28px;text-align:center;">Ezana Finance</p>
<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:36px;">${inner}</div>
${emailFooterHtml()}
</div></body></html>`;
}

function plainEmail(text) {
  return shell(
    `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${escapeHtml(text)}</p>`,
  );
}

function claimEmail(name, url, tierName) {
  const href = escapeHtml(url);
  return shell(`<h1 style="color:#111827;font-size:22px;margin:0 0 14px;">Your API key is ready, ${escapeHtml(name || 'there')}.</h1>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">Your request for the Ezana API was approved on the ${escapeHtml(tierName)} tier. Claim your key with the button below. The key is shown once when you claim it, so store it somewhere safe.</p>
<p style="margin:0 0 24px;"><a href="${href}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;">Claim your key</a></p>
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">The link works once and expires in ${CLAIM_TTL_DAYS} days. If the button does not work, paste this address into your browser:<br><span style="color:#047857;word-break:break-all;">${href}</span></p>`);
}
