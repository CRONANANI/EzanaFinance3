/**
 * Android push through the FCM HTTP v1 API. Server only.
 * FIREBASE_SERVICE_ACCOUNT_JSON: the service account key JSON (env, never in
 * the repo). Access tokens are cached until shortly before they expire.
 */
import { signJwt } from './jwt';

let cached = null; // { token, exp, projectId }

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    return sa.client_email && sa.private_key && sa.project_id ? sa : null;
  } catch {
    return null;
  }
}

export function fcmConfigured() {
  return serviceAccount() != null;
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached;
  const sa = serviceAccount();
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set');
  const assertion = signJwt({
    alg: 'RS256',
    header: {},
    privateKey: sa.private_key,
    payload: {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`FCM token ${res.status}`);
  const j = await res.json();
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600), projectId: sa.project_id };
  return cached;
}

/**
 * Send one message. Resolves { ok, unregistered } where unregistered means
 * the token is dead and should be disabled.
 */
export async function sendFcm(token, { title, body, url }) {
  const { token: bearer, projectId } = await accessToken();
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { url: url || '/home' },
        android: { priority: 'high' },
      },
    }),
  });
  if (res.ok) return { ok: true, unregistered: false };
  const j = await res.json().catch(() => ({}));
  const code = j?.error?.details?.find?.((d) => d.errorCode)?.errorCode || j?.error?.status;
  return { ok: false, unregistered: code === 'UNREGISTERED' || res.status === 404 };
}
