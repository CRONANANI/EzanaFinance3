'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import './cookie-consent-banner.css';

const STORAGE_KEY = 'ezana.cookieConsent.v1';

const DEFAULT_PREFS = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export function readConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.decidedAt) return null;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return null;
  }
}

export function writeConsent(prefs) {
  if (typeof window === 'undefined') return;
  const payload = {
    ...DEFAULT_PREFS,
    ...prefs,
    necessary: true,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('ezana:cookie-consent-changed', { detail: payload }));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setVisible(true);
    }
    const handler = () => {
      const cur = readConsent();
      setPrefs(cur || DEFAULT_PREFS);
      setShowCustomize(true);
      setVisible(true);
    };
    window.addEventListener('ezana:open-cookie-settings', handler);
    return () => window.removeEventListener('ezana:open-cookie-settings', handler);
  }, []);

  const acceptAll = useCallback(() => {
    writeConsent({ analytics: true, marketing: true, preferences: true });
    setVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    writeConsent({ analytics: false, marketing: false, preferences: false });
    setVisible(false);
  }, []);

  const saveCustom = useCallback(() => {
    writeConsent(prefs);
    setVisible(false);
    setShowCustomize(false);
  }, [prefs]);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent" aria-modal="false">
      <div className="cookie-banner-inner">
        {!showCustomize ? (
          <>
            <div className="cookie-banner-text">
              <h2 className="cookie-banner-title">We value your privacy</h2>
              <p className="cookie-banner-body">
                We use cookies to keep you signed in, remember your preferences, and (with your
                permission) understand how you use Ezana. You can accept all, reject all, or pick
                what&apos;s on. Read our{' '}
                <Link href="/privacy-policy" className="cookie-banner-link">
                  Privacy Policy
                </Link>{' '}
                for details.
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button
                type="button"
                className="cookie-banner-btn cookie-banner-btn--ghost"
                onClick={() => setShowCustomize(true)}
              >
                Customize
              </button>
              <button
                type="button"
                className="cookie-banner-btn cookie-banner-btn--ghost"
                onClick={rejectAll}
              >
                Reject all
              </button>
              <button
                type="button"
                className="cookie-banner-btn cookie-banner-btn--primary"
                onClick={acceptAll}
              >
                Accept all
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-banner-text">
              <h2 className="cookie-banner-title">Customize cookie preferences</h2>
              <p className="cookie-banner-body">
                Choose which categories of cookies Ezana may set on your device. You can change
                these any time from the footer.
              </p>
            </div>
            <ul className="cookie-banner-categories">
              <li className="cookie-banner-cat">
                <label className="cookie-banner-cat-row">
                  <input type="checkbox" checked disabled />
                  <span>
                    <strong>Necessary</strong> — required for the site to function (auth, security).
                    Always on.
                  </span>
                </label>
              </li>
              <li className="cookie-banner-cat">
                <label className="cookie-banner-cat-row">
                  <input
                    type="checkbox"
                    checked={prefs.preferences}
                    onChange={(e) => setPrefs((p) => ({ ...p, preferences: e.target.checked }))}
                  />
                  <span>
                    <strong>Preferences</strong> — remember UI choices like theme and dashboard
                    layout across sessions.
                  </span>
                </label>
              </li>
              <li className="cookie-banner-cat">
                <label className="cookie-banner-cat-row">
                  <input
                    type="checkbox"
                    checked={prefs.analytics}
                    onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                  />
                  <span>
                    <strong>Analytics</strong> — anonymous product usage so we know what to improve.
                  </span>
                </label>
              </li>
              <li className="cookie-banner-cat">
                <label className="cookie-banner-cat-row">
                  <input
                    type="checkbox"
                    checked={prefs.marketing}
                    onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                  />
                  <span>
                    <strong>Marketing</strong> — help us measure campaigns. Off by default.
                  </span>
                </label>
              </li>
            </ul>
            <div className="cookie-banner-actions">
              <button
                type="button"
                className="cookie-banner-btn cookie-banner-btn--ghost"
                onClick={() => setShowCustomize(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="cookie-banner-btn cookie-banner-btn--primary"
                onClick={saveCustom}
              >
                Save preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
