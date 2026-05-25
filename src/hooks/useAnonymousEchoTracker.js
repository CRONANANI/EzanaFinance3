'use client';

import { useEffect } from 'react';

const ANON_KEY = 'ezana_anon_id';
const TRACK_ENDPOINT = '/api/echo/anon-track';

export function getAnonId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

function postAnonEvent(anonId, eventType, eventData) {
  if (!anonId) return;
  fetch(TRACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anon_id: anonId, event_type: eventType, event_data: eventData }),
    keepalive: true,
  }).catch(() => {});
}

function attachAnonymousTracker(articleEl, { anonId, articleId, articleTitle, tags, category }) {
  let scrollDepth = 0;
  let lastVisibleMs = Date.now();
  let totalVisibleMs = 0;
  let keywordClicks = 0;
  let readFired = false;
  let openFired = false;

  const fireOpen = () => {
    if (openFired) return;
    openFired = true;
    postAnonEvent(anonId, 'article_open', {
      article_id: articleId,
      title: articleTitle,
      topics: tags,
      category,
    });
  };

  const getDwellMs = () => {
    if (document.visibilityState === 'visible') {
      return totalVisibleMs + (Date.now() - lastVisibleMs);
    }
    return totalVisibleMs;
  };

  const maybeFireRead = () => {
    if (readFired) return;
    if (scrollDepth < 0.75) return;
    if (getDwellMs() < 45_000) return;
    readFired = true;
    postAnonEvent(anonId, 'article_read', {
      article_id: articleId,
      title: articleTitle,
      topics: tags,
      category,
      scroll_depth: scrollDepth,
      dwell_ms: getDwellMs(),
      keyword_clicks: keywordClicks,
    });
  };

  fireOpen();

  const onScroll = () => {
    const rect = articleEl.getBoundingClientRect();
    const articleHeight = articleEl.offsetHeight;
    if (articleHeight <= 0) return;
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const pixelsScrolled = visibleBottom - rect.top;
    const depth = Math.max(0, Math.min(1, pixelsScrolled / articleHeight));
    if (depth > scrollDepth) scrollDepth = depth;
    maybeFireRead();
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      lastVisibleMs = Date.now();
    } else {
      totalVisibleMs += Date.now() - lastVisibleMs;
    }
  };

  const onKeywordClick = (e) => {
    const btn = e.target.closest?.('[data-keyword-id]');
    if (!btn || !articleEl.contains(btn)) return;
    keywordClicks += 1;
    postAnonEvent(anonId, 'keyword_click', {
      article_id: articleId,
      title: articleTitle,
      keyword_id: btn.getAttribute('data-keyword-id'),
      keyword_term: btn.textContent?.trim(),
      topics: tags,
      category,
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  articleEl.addEventListener('click', onKeywordClick);
  onScroll();

  const dwellInterval = setInterval(maybeFireRead, 5_000);

  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    articleEl.removeEventListener('click', onKeywordClick);
    clearInterval(dwellInterval);
    if (document.visibilityState === 'visible') {
      totalVisibleMs += Date.now() - lastVisibleMs;
    }
    maybeFireRead();
  };
}

export function useAnonymousEchoTracker({
  articleId,
  articleTitle,
  tags = [],
  category,
  enabled = true,
  articleBodyRef,
}) {
  useEffect(() => {
    if (!enabled || !articleId) return undefined;

    let cancelled = false;
    let cleanup = null;
    let retryTimer = null;
    const anonId = getAnonId();
    const meta = { anonId, articleId, articleTitle, tags, category };

    const tryAttach = () => {
      if (cancelled || !articleBodyRef?.current) return false;
      cleanup = attachAnonymousTracker(articleBodyRef.current, meta);
      return true;
    };

    if (!tryAttach()) {
      retryTimer = setInterval(() => {
        if (tryAttach()) clearInterval(retryTimer);
      }, 100);
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearInterval(retryTimer);
      cleanup?.();
    };
  }, [enabled, articleId, articleTitle, tags, category, articleBodyRef]);
}
