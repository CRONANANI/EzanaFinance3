/**
 * Verify Plaid webhook JWT in the Plaid-Verification header.
 * https://plaid.com/docs/api/webhooks/webhook-verification/
 *
 * Checks: alg is ES256; the body's SHA-256 matches the token; the token is
 * at most 5 minutes old; the signing key exists and has not expired; the
 * signature verifies. JWT ES256 signatures are raw r||s (64 bytes), so the
 * verify call uses dsaEncoding 'ieee-p1363' (Node's default, DER, would
 * reject every genuine Plaid signature).
 */
import { createHash, createPublicKey, verify } from 'crypto';

const keyCache = new Map();

async function fetchPlaidKey(kid) {
  const { plaidClient } = await import('@/lib/plaid');
  const keyRes = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
  return keyRes.data.key;
}

export async function verifyPlaidWebhookWith(
  rawBody,
  verificationHeader,
  { getKey = fetchPlaidKey, now = Math.floor(Date.now() / 1000), cache = keyCache } = {},
) {
  if (!verificationHeader) return false;

  const parts = String(verificationHeader).split('.');
  if (parts.length !== 3) return false;

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (header.alg !== 'ES256' || !header.kid) return false;

  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  if (payload.request_body_sha256 !== bodyHash) return false;
  if (typeof payload.iat !== 'number' || Math.abs(now - payload.iat) > 300) return false;

  let jwk = cache.get(header.kid);
  if (!jwk) {
    try {
      jwk = await getKey(header.kid);
    } catch {
      return false;
    }
    if (!jwk) return false;
    cache.set(header.kid, jwk);
  }
  if (jwk.expired_at && Number(jwk.expired_at) <= now) return false;

  try {
    const { kty, crv, x, y } = jwk;
    const publicKey = createPublicKey({ key: { kty, crv, x, y }, format: 'jwk' });
    return verify(
      'sha256',
      Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8'),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(parts[2], 'base64url'),
    );
  } catch {
    return false;
  }
}

export async function verifyPlaidWebhook(rawBody, verificationHeader) {
  return verifyPlaidWebhookWith(rawBody, verificationHeader);
}
