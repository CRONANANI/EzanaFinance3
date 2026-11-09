'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "Try again" for a route error boundary. reset() alone only re-renders on the
 * client, so an error that came from the server render would just throw again;
 * refreshing the route in the same transition re-fetches it first (the pattern
 * the Next.js docs give for error.js).
 */
export function useRetry(reset) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset?.();
    });
  }, [router, reset]);
}
