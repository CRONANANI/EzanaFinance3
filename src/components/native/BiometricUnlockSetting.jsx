'use client';

import { useEffect, useState } from 'react';
import { LedgerRow, LedgerToggle } from '@/components/settings/ledger/primitives';
import { useIsNativeApp } from './useIsNativeApp';
import {
  biometryInfo,
  getBiometricLockEnabled,
  setBiometricLockEnabled,
  authenticateBiometric,
} from '@/lib/native-biometric';

/**
 * "Unlock with Face ID" (or "with fingerprint"), in the apps only. Off by
 * default; turning it on asks for one successful unlock first so nobody locks
 * themselves out with biometrics that are not set up.
 */
export function BiometricUnlockSetting() {
  const native = useIsNativeApp();
  const [info, setInfo] = useState({ available: false, label: null });
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!native) return;
    biometryInfo()
      .then(setInfo)
      .catch(() => {});
    getBiometricLockEnabled()
      .then(setOn)
      .catch(() => {});
  }, [native]);

  if (!native || !info.available) return null;

  const toggle = async (next) => {
    if (next && !(await authenticateBiometric())) return;
    await setBiometricLockEnabled(next);
    setOn(next);
  };

  return (
    <LedgerRow
      title={`Unlock with ${info.label}`}
      helper="Ask for it when the app opens and after five minutes in the background."
    >
      <LedgerToggle
        checked={on}
        onChange={toggle}
        label={`Unlock with ${info.label}`}
        hint="Only this setting is stored on the device, never your password."
      />
    </LedgerRow>
  );
}
