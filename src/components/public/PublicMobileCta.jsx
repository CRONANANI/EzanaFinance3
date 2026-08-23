'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

import './public-mobile-cta.css';

/* Slim sign-up bar pinned to the bottom of PUBLIC pages on phones. It replaces
   the authenticated app's bottom tab bar, which used to leak onto the public
   Echo routes and pointed signed-out visitors at pages they cannot reach.

   Renders only when every one of these holds:
     - the visitor is signed out (a signed-in visitor gets the real tab bar)
     - the route is not part of an auth flow (see EXCLUDED_PREFIXES)
     - the cookie banner is not open (the two never stack)
     - the visitor has not dismissed it this session
   Width is gated in CSS at <768px, so the bar never appears on desktop. */

/* Auth flows own their own primary action, so the bar would either be
   redundant (sign-up) or compete with the page (Login, Become a Partner). */
const EXCLUDED_PREFIXES = ['/auth', '/signin', '/signup', '/subscribe', '/payment'];

/* Survives client-side navigation within the session, and is cheap to lose:
   sessionStorage is wrapped because private-mode Safari throws on access. */
const DISMISS_KEY = 'ezana.publicCta.dismissed.v1';

function readDismissed() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function PublicMobileCta() {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  /* Starts dismissed so the server render and the first client render agree;
     the effect below reveals it once sessionStorage has been consulted. */
  const [dismissed, setDismissed] = useState(true);
  const [bannerOpen, setBannerOpen] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  /* The cookie banner reserves its own space by setting --cookie-banner-height
     on <html>. Watching that one attribute keeps the two components decoupled:
     no shared context, no event contract to keep in sync. */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const read = () =>
      setBannerOpen(
        Boolean(document.documentElement.style.getPropertyValue('--cookie-banner-height')),
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => observer.disconnect();
  }, []);

  const excluded = EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );
  const visible = !loading && !isAuthenticated && !excluded && !dismissed && !bannerOpen;

  /* Reserve the bar's height at the bottom of the page so a fixed bar can
     never sit on top of the last row of content or the footer. Mirrors the
     cookie banner's --cookie-banner-height contract. */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    if (!visible) {
      body.classList.remove('pcta-open');
      return undefined;
    }
    body.classList.add('pcta-open');
    const update = () => {
      const el = document.querySelector('.pcta-bar');
      if (!el) return;
      document.documentElement.style.setProperty(
        '--pcta-height',
        `${Math.ceil(el.getBoundingClientRect().height)}px`,
      );
    };
    update();
    const raf = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    const el = document.querySelector('.pcta-bar');
    if (el) observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', update);
      body.classList.remove('pcta-open');
      document.documentElement.style.removeProperty('--pcta-height');
    };
  }, [visible]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode: the in-memory state above still holds for this page */
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="pcta-bar" role="complementary" aria-label="Sign up">
      <p className="pcta-copy">Your edge is waiting.</p>
      <a className="pcta-btn" href="/auth/signup">
        Get started
      </a>
      <button type="button" className="pcta-close" onClick={dismiss} aria-label="Dismiss">
        <i className="bi bi-x-lg" aria-hidden />
      </button>
    </div>
  );
}

export default PublicMobileCta;
