/**
 * Minimal JWT signing for the push providers (server only, node:crypto).
 * RS256 for the Google service account, ES256 for Apple's APNs key.
 */
import { createSign, sign as cryptoSign } from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function signJwt({ header, payload, privateKey, alg }) {
  const input = `${b64url(JSON.stringify({ ...header, alg, typ: 'JWT' }))}.${b64url(
    JSON.stringify(payload),
  )}`;
  let sig;
  if (alg === 'RS256') {
    sig = createSign('RSA-SHA256').update(input).sign(privateKey);
  } else if (alg === 'ES256') {
    // JOSE wants the raw r||s form, not DER.
    sig = cryptoSign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  } else {
    throw new Error(`unsupported alg ${alg}`);
  }
  return `${input}.${b64url(sig)}`;
}
