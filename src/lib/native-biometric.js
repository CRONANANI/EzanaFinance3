'use client';

/**
 * Face ID / fingerprint unlock for the apps. Only the on/off preference is
 * stored (Capacitor Preferences); credentials never are. Off by default.
 */
import { isNativeApp } from '@/lib/native';

export const BIOMETRIC_PREF_KEY = 'ezana.biometricLock';
/** Re-lock after this long in the background. */
export const BACKGROUND_RELOCK_MS = 5 * 60 * 1000;

const real = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

export async function getBiometricLockEnabled() {
  if (!real()) return false;
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key: BIOMETRIC_PREF_KEY });
  return value === '1';
}

export async function setBiometricLockEnabled(on) {
  if (!real()) return;
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key: BIOMETRIC_PREF_KEY, value: on ? '1' : '0' });
}

/** { available, label } where label is "Face ID", "Touch ID" or "fingerprint". */
export async function biometryInfo() {
  if (!isNativeApp() || !real()) return { available: false, label: null };
  const { BiometricAuth, BiometryType } = await import('@aparajita/capacitor-biometric-auth');
  const r = await BiometricAuth.checkBiometry();
  const label =
    r.biometryType === BiometryType.faceId
      ? 'Face ID'
      : r.biometryType === BiometryType.touchId
        ? 'Touch ID'
        : r.biometryType === BiometryType.faceAuthentication
          ? 'face unlock'
          : 'fingerprint';
  return { available: !!r.isAvailable || !!r.deviceIsSecure, label };
}

/** Resolves true when the user authenticated (biometrics or device passcode). */
export async function authenticateBiometric() {
  if (!real()) return true;
  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock Ezana',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      androidTitle: 'Unlock Ezana',
    });
    return true;
  } catch {
    return false;
  }
}

/** Pure: should the app lock on resume after `awayMs` in the background? */
export function shouldRelock(enabled, awayMs) {
  return !!enabled && Number(awayMs) >= BACKGROUND_RELOCK_MS;
}
