'use client';

/**
 * Native push registration (iOS and Android apps only). Permission is asked
 * only when the user turns on an alert, never at launch: call
 * enableNativePush() from the alert toggles. The token is upserted through
 * /api/push/register and disabled on sign-out.
 */
import { isNativeApp, nativePlatform } from '@/lib/native';

const TOKEN_KEY = 'ezana.pushToken';
const APP_VERSION = '1.0';

let registering = null;

async function plugin() {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return PushNotifications;
}

function rememberToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function storedPushToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function sendToken(token) {
  rememberToken(token);
  await fetch('/api/push/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: nativePlatform(), appVersion: APP_VERSION }),
  });
}

/**
 * Ask for notification permission (first time only) and register this device.
 * Resolves true when the device is registered, false when the user declined
 * or this is not the app. Safe to call repeatedly.
 */
export function enableNativePush() {
  if (!isNativeApp() || !window.Capacitor?.isNativePlatform?.()) return Promise.resolve(false);
  if (registering) return registering;
  registering = (async () => {
    const Push = await plugin();
    let perm = await Push.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await Push.requestPermissions();
    }
    if (perm.receive !== 'granted') return false;
    const done = new Promise((resolve) => {
      Push.addListener('registration', async ({ value }) => {
        try {
          await sendToken(value);
          resolve(true);
        } catch {
          resolve(false);
        }
      });
      Push.addListener('registrationError', () => resolve(false));
    });
    await Push.register();
    return done;
  })().finally(() => {
    registering = null;
  });
  return registering;
}

/**
 * On launch: if permission was already granted, refresh the token silently
 * (tokens rotate). Never prompts.
 */
export async function refreshNativePushIfGranted() {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  const Push = await plugin();
  const perm = await Push.checkPermissions();
  if (perm.receive === 'granted') await enableNativePush();
}

/** Sign-out: disable this device's token so pushes stop for that account. */
export async function disableNativePush() {
  const token = storedPushToken();
  if (!token) return;
  try {
    await fetch('/api/push/register', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      keepalive: true,
    });
  } catch {
    /* best effort */
  }
}
