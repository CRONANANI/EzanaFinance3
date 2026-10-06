/**
 * iOS push straight to Apple (APNs, HTTP/2, token auth). Server only.
 * The app's push plugin hands back an APNs device token, so iOS is sent here
 * rather than through FCM (which would need the Firebase iOS SDK in the app).
 *
 * APNS_KEY_P8      the .p8 auth key contents (env, never in the repo)
 * APNS_KEY_ID      its key id
 * APPLE_TEAM_ID    the team id (also used for the app-site association file)
 * APNS_ENVIRONMENT 'production' (TestFlight and App Store) or 'development'
 */
import { connect } from 'node:http2';
import { signJwt } from './jwt';

const TOPIC = 'world.ezana.app';
let jwtCache = null; // { token, iat }

export function apnsConfigured() {
  return !!(process.env.APNS_KEY_P8 && process.env.APNS_KEY_ID && process.env.APPLE_TEAM_ID);
}

function providerToken() {
  const now = Math.floor(Date.now() / 1000);
  // Apple accepts a token for up to an hour; refresh every 50 minutes.
  if (jwtCache && now - jwtCache.iat < 3000) return jwtCache.token;
  const token = signJwt({
    alg: 'ES256',
    header: { kid: process.env.APNS_KEY_ID },
    privateKey: process.env.APNS_KEY_P8.replace(/\\n/g, '\n'),
    payload: { iss: process.env.APPLE_TEAM_ID, iat: now },
  });
  jwtCache = { token, iat: now };
  return token;
}

function host() {
  return process.env.APNS_ENVIRONMENT === 'development'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';
}

/** Send one alert. Resolves { ok, unregistered }. */
export function sendApns(deviceToken, { title, body, url }) {
  return new Promise((resolve) => {
    let client;
    try {
      client = connect(host());
    } catch {
      resolve({ ok: false, unregistered: false });
      return;
    }
    client.on('error', () => resolve({ ok: false, unregistered: false }));
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      'apns-topic': TOPIC,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    let status = 0;
    let data = '';
    req.on('response', (h) => {
      status = Number(h[':status']);
    });
    req.setEncoding('utf8');
    req.on('data', (c) => {
      data += c;
    });
    req.on('end', () => {
      client.close();
      let reason = null;
      try {
        reason = JSON.parse(data || '{}').reason || null;
      } catch {
        /* ignore */
      }
      resolve({
        ok: status === 200,
        unregistered: status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered',
      });
    });
    req.on('error', () => {
      client.close();
      resolve({ ok: false, unregistered: false });
    });
    req.end(
      JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, url: url || '/home' }),
    );
  });
}
