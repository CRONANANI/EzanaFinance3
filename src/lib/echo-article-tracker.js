/**
 * Article engagement tracker — fires events to /api/notifications/track.
 * Confirmed read = 75% scroll depth + 45s visible dwell.
 */

const TRACK_ENDPOINT = '/api/notifications/track';

export function createArticleTracker({
  articleId,
  articleTitle,
  tags = [],
  category,
  enabled = true,
}) {
  let scrollDepth = 0;
  let lastVisibleMs = Date.now();
  let totalVisibleMs = 0;
  let keywordClicks = 0;
  let readFired = false;
  let openFired = false;
  let articleEl = null;
  let scrollHandler = null;
  let visibilityHandler = null;
  let dwellInterval = null;

  function postEvent(eventType, eventData) {
    if (!enabled) return;
    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event_type: eventType, event_data: eventData }),
      keepalive: true,
    }).catch(() => {});
  }

  function fireOpenEvent() {
    if (openFired) return;
    openFired = true;
    postEvent('article_open', {
      article_id: articleId,
      title: articleTitle,
      topics: tags,
      category,
    });
  }

  function getDwellMs() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      return totalVisibleMs + (Date.now() - lastVisibleMs);
    }
    return totalVisibleMs;
  }

  function maybeFireReadEvent() {
    if (readFired) return;
    if (scrollDepth < 0.75) return;
    if (getDwellMs() < 45_000) return;
    readFired = true;
    postEvent('article_read', {
      article_id: articleId,
      title: articleTitle,
      topics: tags,
      category,
      scroll_depth: scrollDepth,
      dwell_ms: getDwellMs(),
      keyword_clicks: keywordClicks,
    });
  }

  function attach(el) {
    articleEl = el;
    fireOpenEvent();

    scrollHandler = () => {
      if (!articleEl) return;
      const rect = articleEl.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      const articleHeight = articleEl.offsetHeight;
      if (articleHeight <= 0) return;
      const visibleBottom = Math.min(rect.bottom, viewportBottom);
      const pixelsScrolled = visibleBottom - rect.top;
      const depth = Math.max(0, Math.min(1, pixelsScrolled / articleHeight));
      if (depth > scrollDepth) scrollDepth = depth;
      maybeFireReadEvent();
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    scrollHandler();

    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        lastVisibleMs = Date.now();
      } else {
        totalVisibleMs += Date.now() - lastVisibleMs;
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    dwellInterval = setInterval(maybeFireReadEvent, 5_000);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      if (dwellInterval) clearInterval(dwellInterval);
      if (document.visibilityState === 'visible') {
        totalVisibleMs += Date.now() - lastVisibleMs;
      }
      maybeFireReadEvent();
    };
  }

  function recordKeywordClick(keywordId, keywordTerm) {
    keywordClicks += 1;
    postEvent('keyword_click', {
      article_id: articleId,
      title: articleTitle,
      keyword_id: keywordId,
      keyword_term: keywordTerm,
      topics: tags,
      category,
    });
  }

  function recordSave() {
    postEvent('article_save', {
      article_id: articleId,
      title: articleTitle,
      topics: tags,
      category,
    });
  }

  function recordShare(method = 'link') {
    postEvent('article_share', {
      article_id: articleId,
      title: articleTitle,
      topics: tags,
      category,
      method,
    });
  }

  function getKeywordClickCount() {
    return keywordClicks;
  }

  return {
    attach,
    recordKeywordClick,
    recordSave,
    recordShare,
    getKeywordClickCount,
  };
}
