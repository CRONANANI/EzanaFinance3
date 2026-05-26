'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SaveAuthPrompt } from '@/components/echo/EchoSaveButton';
import { WorthItTile } from './WorthItTile';

export function EchoFooterWorthIt({ articleId, articleTitle, articleTracker }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [worth, setWorth] = useState(false);
  const [worthCount, setWorthCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authIntent, setAuthIntent] = useState('worth');

  const redirectParam = encodeURIComponent(pathname || `/ezana-echo/${articleId}`);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/echo/engagement?articleId=${encodeURIComponent(articleId)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setWorthCount(data.like_count ?? data.likeCount ?? 0);
        setWorth(Boolean(data.user_has_liked ?? data.userHasLiked));
        setSaveCount(data.save_count ?? data.saveCount ?? 0);
        setSaved(Boolean(data.user_has_saved ?? data.userHasSaved));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const requireAuth = (intent) => {
    setAuthIntent(intent);
    setShowAuthPrompt(true);
  };

  const handleWorth = async () => {
    if (!isAuthenticated) return requireAuth('worth');
    const next = !worth;
    setWorth(next);
    setWorthCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await fetch('/api/echo/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ articleId }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorth(Boolean(data.user_has_liked ?? data.liked));
        setWorthCount(data.like_count ?? data.likeCount ?? 0);
      } else {
        setWorth(!next);
        setWorthCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    } catch {
      setWorth(!next);
      setWorthCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) return requireAuth('save');
    const next = !saved;
    setSaved(next);
    setSaveCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await fetch('/api/echo/saved-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          articleId,
          action: next ? 'save' : 'unsave',
        }),
      });
      if (res.ok) {
        if (next) articleTracker?.recordSave?.();
      } else {
        setSaved(!next);
        setSaveCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    } catch {
      setSaved(!next);
      setSaveCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/ezana-echo/${articleId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: articleTitle, url });
        articleTracker?.recordShare?.('native');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        articleTracker?.recordShare?.('link');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        /* silent */
      }
    }
  };

  const authMessages = {
    worth: {
      icon: 'bi-heart-fill',
      headline: 'Sign in to react',
      body: 'Create a free account to tell others this read was worth their time.',
    },
    save: {
      icon: 'bi-bookmark-fill',
      headline: 'Sign in to save',
      body: 'Create a free account to save articles to your personal library.',
    },
  };

  const msg = authMessages[authIntent] || authMessages.worth;

  return (
    <section className="echo-footer-worthit">
      <p className="echo-worthit-question">Was this worth your time?</p>
      <div className="echo-worthit-grid">
        <WorthItTile
          iconDefault="bi-heart"
          iconActive="bi-heart-fill"
          label="Worth it"
          subLabel={worthCount > 0 ? `${worthCount} said yes` : 'be the first'}
          subLabelActive={worthCount > 1 ? `you + ${worthCount - 1} others` : 'just you so far'}
          isActive={worth}
          onClick={handleWorth}
        />
        <WorthItTile
          iconDefault="bi-bookmark"
          iconActive="bi-bookmark-fill"
          label="Save for later"
          labelActive="Saved"
          subLabel={saveCount > 0 ? `${saveCount} saves` : 'add to library'}
          subLabelActive="in your library"
          isActive={saved}
          onClick={handleSave}
        />
        <WorthItTile
          iconDefault="bi-share"
          iconActive="bi-share-fill"
          label="Pass it on"
          subLabel="share or repost"
          isActive={false}
          isToggle={false}
          onClick={handleShare}
        />
      </div>

      {showAuthPrompt && (
        <SaveAuthPrompt
          icon={msg.icon}
          headline={msg.headline}
          body={msg.body}
          onClose={() => setShowAuthPrompt(false)}
          onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
          onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
        />
      )}
    </section>
  );
}
