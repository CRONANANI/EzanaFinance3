/**
 * Waitlist invites. An approved waitlist row carries the SHA-256 of a random
 * one-time token; the raw token only ever lives in the invite email. The
 * token opens /auth/signup?invite=..., where the account is created server
 * side (/api/auth/accept-invite) and the hash is cleared.
 */
import crypto from 'node:crypto';

export const INVITE_TTL_DAYS = 14;

/** A URL-safe one-time token and the hash we store. */
export function newInviteToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function inviteUrl(token) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';
  return `${origin}/auth/signup?invite=${encodeURIComponent(token)}`;
}

/** Looks up a live invite (approved, not expired, not used). Service-role client. */
export async function findInvite(admin, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const { data } = await admin
    .from('waitlist')
    .select('id, email, full_name, status, invite_expires_at, metadata')
    .eq('invite_token_hash', hashInviteToken(token))
    .maybeSingle();
  if (!data || data.status !== 'approved') return null;
  if (!data.invite_expires_at || new Date(data.invite_expires_at).getTime() < Date.now()) {
    return null;
  }
  return data;
}

/** First and last name from the row's metadata, falling back to full_name. */
export function inviteNames(row) {
  const m = row?.metadata || {};
  const parts = String(row?.full_name || '')
    .trim()
    .split(/\s+/);
  return {
    firstName: m.first_name || parts[0] || '',
    lastName: m.last_name || parts.slice(1).join(' ') || '',
  };
}

/** Sender used by every waitlist email. */
export function senderAddress() {
  return process.env.RESEND_FROM_EMAIL || 'Ezana Finance <noreply@ezana.world>';
}
