'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SaveAuthPrompt } from '@/components/echo/EchoSaveButton';

export function EchoCtaCallout({ block }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const redirectParam = encodeURIComponent(pathname || '/ezana-echo');

  const handleCta = () => {
    if (block.ctaAuthGate && !isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    router.push(block.ctaHref || '/market-analysis');
  };

  return (
    <aside className="echo-cta-callout">
      {block.headline && <h3 className="echo-cta-callout-headline">{block.headline}</h3>}
      {block.body && <p className="echo-cta-callout-body">{block.body}</p>}
      {block.ctaLabel && (
        <button type="button" className="echo-cta-callout-btn" onClick={handleCta}>
          {block.ctaLabel}
        </button>
      )}
      {showAuthPrompt && (
        <SaveAuthPrompt
          icon="bi-graph-up-arrow"
          headline="Unlock sector analysis"
          body="Create a free account to see which sub-industries and companies Ezana tracks for the next phase of the technology cycle."
          onClose={() => setShowAuthPrompt(false)}
          onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
          onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
        />
      )}
    </aside>
  );
}
