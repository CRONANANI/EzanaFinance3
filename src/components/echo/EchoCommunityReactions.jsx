'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SaveAuthPrompt } from '@/components/echo/EchoSaveButton';

export function EchoCommunityReactions({ articleId, articleTitle }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const redirectParam = encodeURIComponent(pathname || `/ezana-echo/${articleId}`);

  const handleClick = () => {
    if (isAuthenticated) {
      router.push(`/community?article=${encodeURIComponent(articleId)}`);
      return;
    }
    setShowAuthPrompt(true);
  };

  return (
    <div className="echo-community-reactions">
      <button type="button" className="echo-community-reactions-btn" onClick={handleClick}>
        <i className="bi bi-chat-dots" />
        <span>Discuss in Community</span>
      </button>
      <p className="echo-community-reactions-hint">
        Join the conversation about {articleTitle ? `"${articleTitle}"` : 'this article'} with other
        Ezana readers.
      </p>
      {showAuthPrompt && (
        <SaveAuthPrompt
          icon="bi-chat-dots-fill"
          headline="Join the community discussion"
          body="Create a free account to react to articles, share your take, and connect with other investors reading Ezana Echo."
          onClose={() => setShowAuthPrompt(false)}
          onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
          onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
        />
      )}
    </div>
  );
}
