import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function authErrorRedirect(requestUrl, flow, type, message) {
  const isPartner = type === 'partner';
  const isSignupFlow = flow === 'signup';
  let path = '/auth/signin';
  if (isPartner) path = '/auth/partner-login';
  else if (isSignupFlow) path = '/auth/signup';
  return NextResponse.redirect(new URL(`${path}?error=${encodeURIComponent(message)}`, requestUrl.origin));
}

/**
 * OAuth PKCE callback — uses @supabase/ssr so session cookies are written correctly
 * (fixes silent failures with older auth-helpers in Route Handlers).
 */
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const flow = requestUrl.searchParams.get('flow');
  const redirectParam = requestUrl.searchParams.get('redirect') || '/home-dashboard';
  const oauthError = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (oauthError) {
    const msg = errorDescription || oauthError;
    return authErrorRedirect(requestUrl, flow, type, msg);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // set can fail in some Server Component contexts; route handler is fine
          }
        },
      },
    }
  );

  if (!code) {
    return authErrorRedirect(
      requestUrl,
      flow,
      type,
      'Missing authorization code. Try signing in again.'
    );
  }

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message);
    return authErrorRedirect(requestUrl, flow, type, exchangeError.message || 'Could not complete sign-in');
  }

  const sessionUser = data?.session?.user;
  if (!sessionUser) {
    return authErrorRedirect(requestUrl, flow, type, 'No user session after OAuth');
  }

  /** Partner OAuth */
  if (type === 'partner') {
    const user = sessionUser;
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
      return NextResponse.redirect(new URL('/partner-home', origin));
    }

    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/auth/partner-denied', origin));
  }

  /** Standard user OAuth — onboarding vs dashboard */
  const user = sessionUser;

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    console.error('[auth/callback] profile fetch:', profileErr.message);
  }

  if (!profile) {
    const { error: insErr } = await supabase.from('profiles').insert({
      id: user.id,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    });
    if (insErr) {
      console.error('[auth/callback] profile insert:', insErr.message);
      /** Heuristic: brand-new auth user (≈ just created) */
      const createdAt = new Date(user.created_at).getTime();
      if (Date.now() - createdAt < 120000) {
        return NextResponse.redirect(new URL('/onboarding', origin));
      }
    } else {
      return NextResponse.redirect(new URL('/onboarding', origin));
    }
  } else if (profile.onboarding_completed === false) {
    return NextResponse.redirect(new URL('/onboarding', origin));
  }

  /** NULL or true: legacy or finished onboarding */
  const dest = redirectParam.startsWith('/') ? redirectParam : '/home-dashboard';
  return NextResponse.redirect(new URL(dest, origin));
}
