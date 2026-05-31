'use client';

import { useEffect } from 'react';
import { readConsent } from './CookieConsentBanner';

export function AnalyticsGate() {
  useEffect(() => {
    const load = () => {
      const consent = readConsent();
      if (!consent?.analytics) return;
      // Initialize analytics (PostHog / GA / Plausible) here when added.
    };
    load();
    window.addEventListener('ezana:cookie-consent-changed', load);
    return () => window.removeEventListener('ezana:cookie-consent-changed', load);
  }, []);
  return null;
}
