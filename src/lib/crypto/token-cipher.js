import crypto from 'crypto';

/**
 * Application-layer token cipher (AES-256-GCM, authenticated encryption).
 *
 * Used to encrypt stored brokerage secrets (SnapTrade `user_secret`, Plaid
 * `access_token`) before they are written to the database, and decrypt them
 * in-memory only at the moment they're handed to a provider SDK. Plaintext must
 * never sit in a column.
 *
 * The 32-byte key comes from the TOKEN_ENCRYPTION_KEY env var (base64) and is
 * never hardcoded. Stored values are self-describing: `v1:<iv>:<tag>:<ct>` (all
 * base64). The `v1:` prefix makes decryption backward-compatible with existing
 * plaintext rows (returned as-is) so the app keeps working between deploy and
 * the one-time migration, and leaves room for a future `v2:` key rotation.
 */

const ALG = 'aes-256-gcm';

// 32-byte key, base64-encoded, from env. NEVER hardcode.
function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)');
  return key;
}

// Returns a self-describing string: v1:<iv>:<authTag>:<ciphertext> (all base64)
export function encryptToken(plaintext) {
  if (plaintext == null) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, getKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptToken(stored) {
  if (stored == null) return stored;
  // Backward-compat: anything without our version prefix is legacy plaintext.
  if (typeof stored !== 'string' || !stored.startsWith('v1:')) return stored;
  const [, ivB64, tagB64, ctB64] = stored.split(':');
  const decipher = crypto.createDecipheriv(ALG, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

export function isEncrypted(v) {
  return typeof v === 'string' && v.startsWith('v1:');
}
