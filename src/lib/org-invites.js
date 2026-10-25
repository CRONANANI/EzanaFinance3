/**
 * Org invite helpers (QA ORG-1 / ORG-20): the invite link, the invite email,
 * and the org-scope check for an invite's team/cohort. Pure apart from the
 * clients passed in, so the route stays thin and the logic is testable with
 * mocked Supabase / Resend.
 */

import { safeInternalPath } from '@/lib/sanitize';

const DEFAULT_SITE_URL = 'https://ezana.world';

const escapeHtml = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const ROLE_LABELS = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

export function inviteLink(token, siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL) {
  return `${String(siteUrl).replace(/\/+$/, '')}/auth/org-login?invite=${encodeURIComponent(token)}`;
}

/**
 * Send the invite email. Never throws: returns true when Resend accepted it,
 * false on any failure (missing key, provider error, network), so the caller
 * can still hand back the copyable link.
 */
export async function sendOrgInviteEmail(resendClient, { email, orgName, role, link, from }) {
  try {
    if (!resendClient?.emails?.send || !email || !link) return false;
    const sender = from || process.env.RESEND_FROM_EMAIL || 'Ezana Finance <noreply@ezana.world>';
    const org = escapeHtml(orgName || 'your investment council');
    const roleLabel = escapeHtml(ROLE_LABELS[role] || 'Member');
    const href = escapeHtml(link);
    const { error } = await resendClient.emails.send({
      from: sender,
      to: email,
      subject: `You're invited to join ${orgName || 'your council'} on Ezana`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #0f172a;">
  <p>Hi,</p>
  <p>You've been invited to join ${org} on Ezana Finance as ${roleLabel}.</p>
  <p style="margin: 28px 0;"><a href="${href}" style="background: #10b981; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept the invite</a></p>
  <p style="color: #64748b; font-size: 13px;">If the button doesn't work, paste this link into your browser: ${href}</p>
</div>`,
      text: `You've been invited to join ${orgName || 'your council'} on Ezana Finance. Accept the invite: ${link}`,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * An invite's team_id / cohort_id must belong to the inviter's org. Returns
 * null when fine, or an error string naming the bad field.
 */
export async function validateInviteScope(client, orgId, { team_id, cohort_id } = {}) {
  const checks = [
    ['team_id', 'org_teams', team_id],
    ['cohort_id', 'org_cohorts', cohort_id],
  ];
  for (const [field, table, id] of checks) {
    if (!id) continue;
    const { data, error } = await client
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();
    if (error || !data) return `${field} is not part of your organization`;
  }
  return null;
}

/**
 * An invite-accept return path (/auth/org-login?invite=TOKEN), validated with
 * safeInternalPath so it can never be an off-site redirect. The org sign-in
 * card uses it to skip its "not a member" sign-outs: the invitee is not a
 * member until they press Join.
 */
export function isInviteReturnPath(path) {
  const safe = safeInternalPath(path, '');
  if (!safe) return false;
  const url = new URL(safe, 'http://local.invalid');
  return url.pathname === '/auth/org-login' && !!url.searchParams.get('invite');
}
