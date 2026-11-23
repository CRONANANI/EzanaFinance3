'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

/* Google first: it is the provider most visitors pick (Nov 22, 2026). */
const PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub', icon: 'bi-github' },
];

/* Google's own four-colour G, as its sign-in branding asks for. */
function GoogleMark() {
  return (
    <svg className="as-oauth-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.5 13.9a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9.2l3.4-2.7Z" />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"
      />
    </svg>
  );
}

/* Where /auth/callback should send the visitor. Kept in sessionStorage, not
   in the callback URL, so the redirect URL stays exactly /auth/callback and
   matches the auth provider's allow-list whatever its pattern. */
export const OAUTH_INTENT_KEY = 'ezana.oauth.intent';

let enabledPromise = null;
/** Which providers the auth service has switched on (its public settings). */
function loadEnabled() {
  if (!enabledPromise) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    enabledPromise =
      url && key
        ? fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.external || {})
            .catch(() => {
              enabledPromise = null;
              return {};
            })
        : Promise.resolve({});
  }
  return enabledPromise;
}

/**
 * "Continue with GitHub / Google". A button only renders for a provider that
 * is switched on, so nothing here can lead to a dead end; with neither on,
 * the whole block (and its "or" rule) renders nothing.
 */
export default function OAuthButtons({ flow = 'signin', type, redirect, onError }) {
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    loadEnabled().then((ext) => alive && setEnabled(ext));
    return () => {
      alive = false;
    };
  }, []);

  const shown = PROVIDERS.filter((p) => enabled?.[p.id] === true);
  if (!shown.length) return null;

  const start = async (provider) => {
    setBusy(provider);
    onError?.('');
    try {
      window.sessionStorage.setItem(
        OAUTH_INTENT_KEY,
        JSON.stringify({ flow, type: type || '', redirect: redirect || '', at: Date.now() }),
      );
    } catch {
      /* private mode: the callback falls back to the defaults */
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy('');
      onError?.('Could not start that sign-in. Please try again.');
    }
  };

  return (
    <div className="as-oauth">
      <div className="as-or" role="separator">
        <span>or</span>
      </div>
      <div className="as-oauth-grid as-oauth-grid--one">
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className="as-btn as-btn--outline as-btn--social"
            disabled={!!busy}
            aria-busy={busy === p.id || undefined}
            onClick={() => start(p.id)}
          >
            {p.id === 'google' ? (
              <GoogleMark />
            ) : (
              <i className={`bi ${p.icon}`} aria-hidden="true" />
            )}
            Continue with {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
