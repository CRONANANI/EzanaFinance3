'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

const PROVIDERS = [
  { id: 'github', label: 'GitHub', icon: 'bi-github' },
  { id: 'google', label: 'Google', icon: 'bi-google' },
];

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
      <div className={`as-oauth-grid${shown.length === 1 ? ' as-oauth-grid--one' : ''}`}>
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className="as-btn as-btn--outline"
            disabled={!!busy}
            aria-busy={busy === p.id || undefined}
            onClick={() => start(p.id)}
          >
            <i className={`bi ${p.icon}`} aria-hidden="true" />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
