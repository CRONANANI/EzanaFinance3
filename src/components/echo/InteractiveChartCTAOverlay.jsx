'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

/**
 * Wraps an interactive chart and intercepts clicks for non-authenticated users.
 */
export function InteractiveChartCTAOverlay({ teaserHeadline, teaserBody, children }) {
  const { isAuthenticated } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef(null);

  const handleClick = (e) => {
    if (isAuthenticated) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = Math.max(20, Math.min(rect.width - 320, e.clientX - rect.left));
      const y = Math.max(20, Math.min(rect.height - 240, e.clientY - rect.top));
      setPopupPos({ x, y });
    }
    setShowPopup(true);
  };

  useEffect(() => {
    if (!showPopup) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowPopup(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPopup]);

  const redirectParam = encodeURIComponent(pathname || '/ezana-echo');

  return (
    <div
      ref={containerRef}
      className="echo-chart-cta-wrapper"
      style={{ position: 'relative' }}
      onClick={handleClick}
      onTouchEnd={handleClick}
    >
      {children}

      {!isAuthenticated && !showPopup && (
        <div className="echo-chart-cta-hint" aria-hidden>
          <i className="bi bi-hand-index" /> Tap any era to explore
        </div>
      )}

      {showPopup && (
        <>
          <div
            className="echo-chart-cta-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(false);
            }}
          />
          <div
            className="echo-chart-cta-popup"
            style={{ left: popupPos.x, top: popupPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="echo-chart-cta-close"
              onClick={() => setShowPopup(false)}
              aria-label="Close"
            >
              <i className="bi bi-x-lg" />
            </button>
            <div className="echo-chart-cta-badge">
              <i className="bi bi-lock-fill" /> Full version
            </div>
            <h4 className="echo-chart-cta-headline">{teaserHeadline}</h4>
            <p className="echo-chart-cta-body">{teaserBody}</p>
            <div className="echo-chart-cta-actions">
              <button
                type="button"
                className="echo-chart-cta-btn echo-chart-cta-btn-primary"
                onClick={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
              >
                Sign up free
              </button>
              <button
                type="button"
                className="echo-chart-cta-btn echo-chart-cta-btn-secondary"
                onClick={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
              >
                Already have an account? Log in
              </button>
            </div>
            <div className="echo-chart-cta-footnote">
              Takes 30 seconds. No credit card required.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
