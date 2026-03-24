'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function authErrorPath(flow, type) {
  if (type === 'partner') return '/auth/partner-login';
  if (flow === 'signup') return '/auth/signup';
  return '/auth/signin';
}

async function routeAfterSession(supabase, router, type, redirectParam) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    router.replace(`/auth/signin?error=${encodeURIComponent('No user session after sign-in')}`);
    return;
  }

  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('onboarding_completed, email_verified')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    console.error('[auth/callback] profile fetch:', profileErr.message);
  }

  if (!profile) {
    const { error: insErr } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      onboarding_completed: false,
      email_verified: false,
      updated_at: new Date().toISOString(),
    });
    if (insErr) {
      console.error('[auth/callback] profile insert:', insErr.message);
      const createdAt = new Date(user.created_at).getTime();
      if (Date.now() - createdAt < 120000) {
        router.replace('/auth/verify-email');
        return;
      }
    } else {
      profile = { onboarding_completed: false, email_verified: false };
    }
  }

  if (!profile || profile.email_verified !== true) {
    router.replace('/auth/verify-email');
    return;
  }

  if (type === 'partner') {
    let isPartner = !!user.user_metadata?.partner_role;
    if (!isPartner) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      isPartner = !!partner;
    }
    if (isPartner) {
      router.replace('/partner-home');
      return;
    }
    await supabase.auth.signOut();
    router.replace('/auth/partner-denied');
    return;
  }

  if (profile.onboarding_completed === false) {
    router.replace('/onboarding');
    return;
  }

  const dest = redirectParam.startsWith('/') ? redirectParam : '/home-dashboard';
  router.replace(dest);
}

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    const run = async () => {
      const flow = searchParams.get('flow');
      const type = searchParams.get('type');
      const redirectParam = searchParams.get('redirect') || '/home-dashboard';
      const oauthError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      const errBase = authErrorPath(flow, type);

      if (oauthError) {
        const msg = errorDescription || oauthError;
        router.replace(`${errBase}?error=${encodeURIComponent(msg)}`);
        return;
      }

      let code = searchParams.get('code');

      /** Implicit / fragment flow — tokens in hash (not sent to server) */
      if (!code && typeof window !== 'undefined' && window.location.hash?.length > 1) {
        const hp = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        if (access_token && refresh_token) {
          setMessage('Saving session…');
          const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sErr) {
            console.error('[auth/callback] setSession from hash failed:', sErr.message);
            router.replace(`${errBase}?error=${encodeURIComponent(sErr.message)}`);
            return;
          }
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          await routeAfterSession(supabase, router, type, redirectParam);
          return;
        }
      }

      if (!code) {
        console.error('[auth/callback] Missing code. Full URL:', typeof window !== 'undefined' ? window.location.href : '');
        router.replace(
          `${errBase}?error=${encodeURIComponent('Missing authorization code. Try signing in again.')}`
        );
        return;
      }

      setMessage('Verifying with Ezana…');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message);
        router.replace(`${errBase}?error=${encodeURIComponent(exchangeError.message)}`);
        return;
      }

      await routeAfterSession(supabase, router, type, redirectParam);
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f0a] px-4">
      <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mb-4" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
