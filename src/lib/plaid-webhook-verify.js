/**
 * Verify Plaid webhook JWT in the Plaid-Verification header.
 * https://plaid.com/docs/api/webhooks/webhook-verification/
 */
import { createHash, createPublicKey, verify } from 'crypto';
import { plaidClient } from '@/lib/plaid';

const keyCache = new Map();

export async function verifyPlaidWebhook(rawBody, verificationHeader) {
  if (!verificationHeader) return false;

  const parts = verificationHeader.split('.');
  if (parts.length !== 3) return false;

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return false;
  }

  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  if (payload.request_body_sha256 !== bodyHash) return false;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat !== 'number' || Math.abs(now - payload.iat) > 300) return false;

  const kid = header.kid;
  if (!kid) return false;

  let jwk = keyCache.get(kid);
  if (!jwk) {
    const keyRes = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
    jwk = keyRes.data.key;
    keyCache.set(kid, jwk);
  }

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const signedData = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
  const signature = Buffer.from(parts[2], 'base64url');

  return verify(null, signedData, publicKey, signature);
}
