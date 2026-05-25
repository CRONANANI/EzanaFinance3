'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const SAVED_KEY = 'echo_saved_articles';

function readSavedIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeSavedIds(set) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(set)));
}

export function SaveAuthPrompt({
  onClose,
  onSignUp,
  onSignIn,
  icon = 'bi-bookmark-fill',
  headline,
  body,
}) {
  return (
    <div className="echo-auth-prompt-backdrop" onClick={onClose}>
      <div className="echo-auth-prompt" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="echo-auth-prompt-close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
        <div className="echo-auth-prompt-icon">
          <i className={`bi ${icon}`} />
        </div>
        <h3 className="echo-auth-prompt-headline">{headline}</h3>
        <p className="echo-auth-prompt-body">{body}</p>
        <div className="echo-auth-prompt-actions">
          <button
            type="button"
            className="echo-chart-cta-btn echo-chart-cta-btn-primary"
            onClick={onSignUp}
          >
            Sign up free
          </button>
          <button
            type="button"
            className="echo-chart-cta-btn echo-chart-cta-btn-secondary"
            onClick={onSignIn}
          >
            Already have an account? Log in
          </button>
        </div>
      </div>
    </div>
  );
}

export function EchoSaveButton({ articleId, articleTags = [], placement = 'top', articleTracker }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSaved, setIsSaved] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsSaved(readSavedIds().has(articleId));
  }, [articleId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/echo/saved-articles', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.savedIds)) {
          setIsSaved(data.savedIds.includes(articleId));
          writeSavedIds(new Set(data.savedIds));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, articleId]);

  const handleSaveClick = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    setSaving(true);
    const ids = readSavedIds();
    const willBeSaved = !ids.has(articleId);

    try {
      await fetch('/api/echo/saved-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          articleId,
          action: willBeSaved ? 'save' : 'unsave',
          tags: articleTags,
          keywordClickCount: articleTracker?.getKeywordClickCount?.() ?? 0,
        }),
      });

      if (willBeSaved) ids.add(articleId);
      else ids.delete(articleId);
      writeSavedIds(ids);
      setIsSaved(willBeSaved);

      if (willBeSaved) articleTracker?.recordSave?.();
    } catch (err) {
      console.error('[EchoSaveButton]', err);
    } finally {
      setSaving(false);
    }
  }, [articleId, articleTags, isAuthenticated, articleTracker]);

  const redirectParam = encodeURIComponent(pathname || '/ezana-echo');
  const authPrompt = showAuthPrompt ? (
    <SaveAuthPrompt
      onClose={() => setShowAuthPrompt(false)}
      onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
      onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
      headline="Save articles to read later"
      body="Create a free account to bookmark articles, get personalized recommendations based on what you read, and unlock the full Ezana platform."
    />
  ) : null;

  if (placement === 'top') {
    return (
      <>
        <button
          type="button"
          className={`echo-save-btn echo-save-btn-top ${isSaved ? 'is-saved' : ''}`}
          onClick={handleSaveClick}
          disabled={saving}
          aria-label={isSaved ? 'Article saved' : 'Save article'}
          title={isSaved ? 'Saved' : 'Save for later'}
        >
          <i className={`bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
          <span className="echo-save-btn-label">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        {authPrompt}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`echo-save-btn echo-save-btn-bottom ${isSaved ? 'is-saved' : ''}`}
        onClick={handleSaveClick}
        disabled={saving}
      >
        <i className={`bi ${isSaved ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}`} />
        <span>{isSaved ? 'Article saved to your reading list' : 'Save this article'}</span>
      </button>
      {authPrompt}
    </>
  );
}
