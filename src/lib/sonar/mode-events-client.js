'use client';

/**
 * Send a research-mode event from the browser (Nov 2026): a deep offer shown,
 * accepted or declined, Go deeper shown or clicked. Fire and forget, never
 * blocks or fails the UI. `meta` is the classification the server sent with
 * the offer ({ mode, confidence, score, triggers }).
 */
export function sendModeEvent(action, { query, meta = null, ranMode = null, details = {} } = {}) {
  if (!query || !meta?.mode || typeof fetch !== 'function') return;
  try {
    fetch('/api/sonar/mode-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        query,
        action,
        predictedMode: meta.mode,
        confidence: meta.confidence,
        score: meta.score,
        triggers: meta.triggers || [],
        ranMode,
        details,
      }),
    }).catch(() => {});
  } catch {
    /* never surfaces */
  }
}
