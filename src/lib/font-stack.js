/**
 * Canvas cannot read CSS custom properties: `ctx.font = '9px var(--font-mono)'`
 * is silently rejected and the canvas keeps its 10px sans-serif default. This
 * resolves a --font-* token from :root once, so canvas text uses the same
 * family as the rest of the page. Families are theme-independent (light and
 * dark share them), so one read per token per page load is enough.
 *
 *   ctx.font = `600 9px ${fontStack('--font-mono')}`;
 */
const FALLBACKS = {
  '--font-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--font-mono': 'ui-monospace, Menlo, Consolas, monospace',
  '--font-serif': "Georgia, 'Times New Roman', serif",
};

const cache = new Map();

export function fontStack(token) {
  if (cache.has(token)) return cache.get(token);
  const fallback = FALLBACKS[token] || 'sans-serif';
  if (typeof window === 'undefined') return fallback;
  let value = '';
  try {
    value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  } catch {
    value = '';
  }
  const stack = value || fallback;
  cache.set(token, stack);
  return stack;
}
