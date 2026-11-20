'use client';

/**
 * Opens the Terms of Service and Privacy Policy as popups instead of new pages
 * (Nov 20, 2026). Mounted once in the root layout; listens for clicks on any
 * link to /terms-of-service or /privacy-policy (footer, pricing, upgrade,
 * cookie banner, newsletter, help articles, legal cross-links) and shows
 * LegalModal in place.
 *
 * The full pages stay for direct visits, search engines and sharing. A link
 * still navigates normally when it is opened in a new tab or window (modifier
 * keys, middle click, target="_blank"), when it carries data-legal-skip (the
 * popup's own "Open full page" link), or when the visitor is already on that
 * page. Code can also open one with
 * window.dispatchEvent(new CustomEvent('ezana:open-legal', { detail: 'terms' })).
 * The popup module loads only on first use.
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const LegalModal = dynamic(() => import('./LegalModal'), { ssr: false });

const ROUTES = { '/terms-of-service': 'terms', '/privacy-policy': 'privacy' };
const HOSTS = new Set(['ezana.world', 'www.ezana.world']);

function docFor(anchor) {
  if (!anchor || anchor.hasAttribute('data-legal-skip')) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  let url;
  try {
    url = new URL(anchor.getAttribute('href') || '', window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin && !HOSTS.has(url.hostname)) return null;
  if (url.hash && url.pathname === window.location.pathname) return null;
  return ROUTES[url.pathname.replace(/\/+$/, '')] || null;
}

export default function LegalModalHost() {
  const pathname = usePathname();
  const [doc, setDoc] = useState(null);
  const close = useCallback(() => setDoc(null), []);

  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target?.closest?.('a[href]');
      const next = docFor(anchor);
      if (!next || ROUTES[pathname] === next) return;
      e.preventDefault();
      setDoc(next);
    };
    const onOpen = (e) => {
      if (e.detail === 'terms' || e.detail === 'privacy') setDoc(e.detail);
    };
    /* Warm the privacy text when a privacy link is hovered or focused. */
    const onHint = (e) => {
      if (docFor(e.target?.closest?.('a[href]')) === 'privacy') {
        import('./LegalModal').then((m) => m.prefetchPrivacy()).catch(() => {});
      }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerover', onHint, { passive: true });
    document.addEventListener('focusin', onHint);
    window.addEventListener('ezana:open-legal', onOpen);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerover', onHint);
      document.removeEventListener('focusin', onHint);
      window.removeEventListener('ezana:open-legal', onOpen);
    };
  }, [pathname]);

  /* Navigating away (for example "Open full page") closes the popup. */
  useEffect(() => {
    setDoc(null);
  }, [pathname]);

  return doc ? <LegalModal doc={doc} onClose={close} /> : null;
}
