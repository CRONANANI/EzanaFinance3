'use client';

import { useEffect } from 'react';

/**
 * Redirects to the legacy HTML page which has the full component cards.
 * Use for dashboard pages until React migration is complete.
 */
export default function LegacyPageRedirect({ legacyPath }) {
  useEffect(() => {
    const url = `/app-legacy/pages/${legacyPath}`;
    window.location.href = url;
  }, [legacyPath]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-muted-foreground text-xl">Loading...</div>
    </div>
  );
}
