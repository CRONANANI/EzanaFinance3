'use client';

/**
 * Sonar Companion contexts (Nov 28 2026), in their own module so the provider, the
 * launcher, the window and pages can share them without import cycles.
 */
import { createContext, useContext, useEffect } from 'react';

export const CompanionCtx = createContext(null);
export const PageCtx = createContext(null);

export function useSonarCompanion() {
  return useContext(CompanionCtx);
}

/**
 * A page can tell the Companion more than its route does (the selected security, the open
 * pitch). The descriptor is a hint for suggestions; the server checks every id again.
 */
export function useSonarPageContext(descriptor) {
  const set = useContext(PageCtx);
  const key = JSON.stringify(descriptor || null);
  useEffect(() => {
    if (!set) return undefined;
    set(descriptor || null);
    return () => set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, key]);
}
