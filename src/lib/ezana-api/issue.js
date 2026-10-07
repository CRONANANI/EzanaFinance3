/**
 * Issuing Ezana API keys (server only, admin client).
 *
 *   approveRequest   admin approval: a pending_claim key row with a one-time
 *                    claim token (7 days). No key exists until it is claimed.
 *   claimKey         the claim page: generate the real key, store prefix and
 *                    HMAC, activate, clear the token, return the raw key once.
 *   createDeveloperKey  self-serve Developer key from Settings (max 2).
 *
 * Every path refuses to run without API_KEY_PEPPER.
 */
import { generateKey, newClaimToken, sha256, pepperConfigured } from './keys';
import { TIERS, ALL_SCOPES, SELF_SERVE_KEY_LIMIT, tierForRole } from './tiers';

export const CLAIM_TTL_DAYS = 7;

export class IssueError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requirePepper() {
  if (!pepperConfigured()) {
    throw new IssueError(503, 'API keys cannot be issued yet: API_KEY_PEPPER is not configured.');
  }
}

export function claimUrl(token) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';
  return `${origin}/ezana-api/claim?token=${encodeURIComponent(token)}`;
}

/** Requested datasets (docs page keys) that map onto API scopes. */
export function scopesFromRequest(datasets, tier) {
  const allowed = TIERS[tier]?.scopes || [];
  const asked = (Array.isArray(datasets) ? datasets : []).filter((d) => ALL_SCOPES.includes(d));
  const picked = asked.filter((s) => allowed.includes(s));
  return picked.length ? picked : allowed;
}

/**
 * Approve an access request. opts: { tier, scopes, rateLimitPerMin, expiresAt, adminEmail }.
 * Returns { key, token } (token to email; never stored).
 */
export async function approveRequest(admin, request, opts) {
  requirePepper();
  const tier = TIERS[opts.tier] ? opts.tier : tierForRole(request.role);
  const tierDef = TIERS[tier];
  const scopes = (
    opts.scopes?.length ? opts.scopes : scopesFromRequest(request.datasets, tier)
  ).filter((s) => tierDef.scopes.includes(s));
  if (!scopes.length) throw new IssueError(400, 'Choose at least one scope for this tier.');
  const rate = tier === 'institution' ? Number(opts.rateLimitPerMin) : tierDef.ratePerMin;
  if (!Number.isInteger(rate) || rate < 1 || rate > 100000) {
    throw new IssueError(400, 'Set a rate limit between 1 and 100,000 per minute.');
  }
  let expiresAt = null;
  if (opts.expiresAt) {
    const t = Date.parse(opts.expiresAt);
    if (!Number.isFinite(t) || t <= Date.now())
      throw new IssueError(400, 'Expiry must be in the future.');
    expiresAt = new Date(t).toISOString();
  }

  const { token, hash } = newClaimToken();
  /* A pending key needs a unique, pattern-valid prefix before it has a key;
     claiming replaces it with the real key's prefix. */
  const placeholder = generateKey('live');
  const { data: key, error } = await admin
    .from('api_keys')
    .insert({
      key_prefix: placeholder.prefix,
      key_hash: sha256(`unclaimed:${placeholder.raw}`),
      name: `${request.company || request.name || 'API'} key`.slice(0, 80),
      owner_email: request.email,
      company: request.company || null,
      request_id: request.id,
      tier,
      scopes,
      rate_limit_per_min: rate,
      delay_days: tierDef.delayDays,
      status: 'pending_claim',
      claim_token_hash: hash,
      claim_expires_at: new Date(Date.now() + CLAIM_TTL_DAYS * 86400000).toISOString(),
      created_by: opts.adminEmail || 'admin',
      expires_at: expiresAt,
    })
    .select('id, tier, scopes, rate_limit_per_min, delay_days')
    .single();
  if (error) throw new IssueError(500, 'Could not create the key.');

  const { error: reqErr } = await admin
    .from('api_access_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts.adminEmail || 'admin',
      api_key_id: key.id,
    })
    .eq('id', request.id);
  if (reqErr) console.error('[ezana-api approve] request update', reqErr.message);
  return { key, token };
}

/** State of a claim link without using it: 'valid' | 'used' | 'expired' | 'invalid'. */
export async function claimState(admin, token) {
  if (typeof token !== 'string' || token.length < 30 || token.length > 80)
    return { state: 'invalid' };
  const { data } = await admin
    .from('api_keys')
    .select('id, status, claim_expires_at, name, tier')
    .eq('claim_token_hash', sha256(token))
    .maybeSingle();
  if (!data) return { state: 'used' };
  if (data.status !== 'pending_claim') return { state: 'used' };
  if (!data.claim_expires_at || Date.parse(data.claim_expires_at) < Date.now()) {
    return { state: 'expired' };
  }
  return { state: 'valid', key: data };
}

/** Claim: returns { raw, prefix, tier } once. */
export async function claimKey(admin, token, userId = null) {
  requirePepper();
  const st = await claimState(admin, token);
  if (st.state !== 'valid')
    throw new IssueError(
      410,
      `This claim link is ${st.state === 'expired' ? 'expired' : 'no longer valid'}.`,
    );
  const { raw, prefix, hash } = generateKey('live');
  /* Single use: the update only matches while the token is still pending. */
  const { data, error } = await admin
    .from('api_keys')
    .update({
      key_prefix: prefix,
      key_hash: hash,
      status: 'active',
      claim_token_hash: null,
      claim_expires_at: null,
      claimed_at: new Date().toISOString(),
      ...(userId ? { owner_user_id: userId } : {}),
    })
    .eq('id', st.key.id)
    .eq('status', 'pending_claim')
    .eq('claim_token_hash', sha256(token))
    .select('id, tier')
    .maybeSingle();
  if (error || !data) throw new IssueError(410, 'This claim link is no longer valid.');
  return { raw, prefix, tier: data.tier };
}

/** Self-serve Developer key for a signed-in user. Returns { raw, prefix, id } once. */
export async function createDeveloperKey(admin, user, name) {
  requirePepper();
  const label =
    String(name || '')
      .trim()
      .slice(0, 80) || 'Developer key';
  const { data: profile } = await admin
    .from('profiles')
    .select('is_disabled')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.is_disabled) {
    throw new IssueError(403, 'API keys need an active Ezana account.');
  }
  const { count } = await admin
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('owner_user_id', user.id)
    .eq('tier', 'developer')
    .neq('status', 'revoked');
  if ((count || 0) >= SELF_SERVE_KEY_LIMIT) {
    throw new IssueError(
      409,
      `You can have up to ${SELF_SERVE_KEY_LIMIT} Developer keys. Revoke one to create another.`,
    );
  }
  const t = TIERS.developer;
  const { raw, prefix, hash } = generateKey('live');
  const { data, error } = await admin
    .from('api_keys')
    .insert({
      key_prefix: prefix,
      key_hash: hash,
      name: label,
      owner_user_id: user.id,
      owner_email: user.email,
      tier: 'developer',
      scopes: t.scopes,
      rate_limit_per_min: t.ratePerMin,
      delay_days: t.delayDays,
      status: 'active',
      created_by: 'self-serve',
      claimed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new IssueError(500, 'Could not create the key.');
  return { raw, prefix, id: data.id };
}
