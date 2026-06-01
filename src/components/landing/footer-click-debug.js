'use client';

/**
 * Dev-only diagnostic for the landing footer's bottom-row links.
 *
 * Loaded only when ?debug=footer is in the URL. Exposes window.debugFooterClicks().
 */
import { useEffect } from 'react';

export function FooterClickDebug() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') !== 'footer') return;

    window.debugFooterClicks = () => {
      const links = document.querySelectorAll('footer nav a, footer nav button');
      if (links.length === 0) {
        console.warn('[debugFooterClicks] No footer links found. Is the footer rendered?');
        return;
      }
      console.log(`[debugFooterClicks] Testing ${links.length} link(s)…`);
      links.forEach((link) => {
        const label = link.textContent?.trim() || '(unlabeled)';
        const rect = link.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log(`%c${label}`, 'color: gray', '→ not visible (zero size)');
          return;
        }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        const captures = link.contains(hit) || hit === link;
        if (captures) {
          console.log(`%c${label}`, 'color: #059669', '→ clickable ✓');
        } else {
          console.warn(
            `%c${label}`,
            'color: #dc2626; font-weight: bold',
            `→ BLOCKED at (${Math.round(cx)}, ${Math.round(cy)}) by:`,
            hit,
          );
        }
      });
    };

    console.log(
      '%c[footer-click-debug]%c run debugFooterClicks() in this console to test footer links',
      'color: #059669; font-weight: bold',
      'color: inherit',
    );
  }, []);

  return null;
}
