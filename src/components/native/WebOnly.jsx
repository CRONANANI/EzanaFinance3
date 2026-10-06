'use client';

import { useIsNativeApp } from './useIsNativeApp';

/**
 * Renders its children on the web. Inside the iOS and Android apps it renders
 * a quiet line instead: no link and no price, because store rules forbid
 * steering buyers outside the app.
 */
export function WebOnly({ children, note = true, className = '' }) {
  const native = useIsNativeApp();
  if (!native) return children;
  if (!note) return null;
  return <p className={`native-web-only ${className}`.trim()}>Available on ezana.world</p>;
}

export default WebOnly;
