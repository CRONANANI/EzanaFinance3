'use client';

import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/native';

/** False on the server and the first client render (no hydration mismatch). */
export function useIsNativeApp() {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return native;
}
