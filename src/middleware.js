import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import {
  matchesRoutePrefix,
  PARTNER_DASHBOARD_ROUTES,
  USER_DASHBOARD_ROUTES,
} from '@/lib/auth/protected-routes';
import { getClientIp } from '@/lib/client-ip';

const ALLOWED_ORIGINS = ['https://ezana.world', 'http://localhost:3000', 'http://127.0.0.1:3000'];

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  /* Forward the resolved pathname as a request header so server components
     (e.g. the root layout) can pre-compute route-scoped body classes
     server-side. Eliminates the class-application race on first paint that
     was causing the split-theme flash on Home / Dashboard. */
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', pathname);

  /** Stripe webhook must receive the raw body — skip session / CORS handling */
  if (pathname.startsWith('/api/stripe/webhook')) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  /** Alpaca Broker webhooks — no auth cookie; forward as-is */
  if (pathname.startsWith('/api/trading/webhook')) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  let response = NextResponse.next({ request: { headers: forwardedHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Global API rate limit — keyed PER USER when authenticated, else per IP.
     A data-rich dashboard fires dozens of /api/* calls per page, so the old
     flat "100/min per IP" tripped during normal navigation (every request in
     the burst shares one IP bucket) and 429'd the very fetches the pages wait
     on — producing the "stuck on a forever-loading screen" symptom. Keying by
     user id gives each signed-in user a generous independent budget (and stops
     users behind a shared office/NAT IP from throttling each other); anonymous
     traffic keeps a tighter per-IP cap. Runs after getUser (which executes on
     every request regardless) so bucketing by user id is free. Webhooks and
     /api/auth/* are excluded; per-route limits in withApiGuard still apply. */
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const skipPaths = [
      '/api/webhooks/',
      '/api/stripe/webhook',
      '/api/alpaca/webhook',
      '/api/trading/webhook',
    ];
    if (!skipPaths.some((s) => pathname.startsWith(s))) {
      try {
        const { checkRateLimit, logSecurityEvent } = await import('@/lib/persistent-rate-limit');
        const ip = getClientIp(request);
        const { key, limit } = user
          ? { key: `global:user:${user.id}`, limit: 1000 }
          : { key: `global:ip:${ip}`, limit: 150 };
        const result = await checkRateLimit(key, limit, 60 * 1000);

        if (!result.allowed) {
          await logSecurityEvent('global_rate_limit_hit', {
            severity: 'warning',
            ip,
            userId: user?.id || null,
            endpoint: pathname,
            details: { scope: user ? 'user' : 'ip', limit, resetAt: result.resetAt.toISOString() },
          });

          return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
                'X-RateLimit-Limit': String(limit),
                'X-RateLimit-Remaining': '0',
              },
            },
          );
        }
      } catch (err) {
        console.warn('[middleware-rate-limit] error:', err?.message);
      }
    }
  }

  /** OAuth / PKCE callback — session is established client-side; do not gate */
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')) {
    return response;
  }

  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '';
    if (ALLOWED_ORIGINS.some((o) => origin === o)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    if (user && !pathname.startsWith('/api/auth/')) {
      const { data: apiProfile } = await supabase
        .from('profiles')
        .select('is_disabled')
        .eq('id', user.id)
        .maybeSingle();
      if (apiProfile?.is_disabled === true) {
        const apiResponse = NextResponse.json(
          { error: 'Account locked', code: 'ACCOUNT_DISABLED' },
          { status: 403, headers: response.headers },
        );
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  apiResponse.cookies.set(name, value, options);
                });
              },
            },
          },
        );
        await supabase.auth.signOut();
        return apiResponse;
      }
    }

    return response;
  }

  if (pathname === '/auth/verify-email' && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('redirect', '/auth/verify-email');
    return NextResponse.redirect(url);
  }

  const onPartnerProtectedRoute = matchesRoutePrefix(pathname, PARTNER_DASHBOARD_ROUTES);
  const onUserProtectedRoute = matchesRoutePrefix(pathname, USER_DASHBOARD_ROUTES);

  /** Trading landing + paper trading — public (no sign-in required to view CTA / mock) */
  const isTradingPublicPath = pathname === '/trading' || pathname === '/trading/mock';

  /** Disabled users land here; may arrive logged out after middleware sign-out + redirect. */
  if (pathname === '/account-locked') {
    return response;
  }

  /** Marketing pricing + Stripe checkout — public */
  if (
    pathname === '/pricing' ||
    pathname.startsWith('/pricing/') ||
    pathname === '/subscribe' ||
    pathname.startsWith('/subscribe/')
  ) {
    return response;
  }

  if (onPartnerProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/partner-login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (onUserProtectedRoute && !user && !isTradingPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  /** Dashboard / partner / trading (under USER_DASHBOARD_ROUTES): account lock, then verification + deletion */
  if (user && (onPartnerProtectedRoute || onUserProtectedRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'email_verified, deleted_at, deletion_scheduled_for, is_disabled, investor_questionnaire_completed',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_disabled === true) {
      const url = request.nextUrl.clone();
      url.pathname = '/account-locked';
      url.search = '';
      const redirectResponse = NextResponse.redirect(url);
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                redirectResponse.cookies.set(name, value, options);
              });
            },
          },
        },
      );
      await supabase.auth.signOut();
      return redirectResponse;
    }

    // First-time users must complete the investor questionnaire before accessing the platform.
    const isOnboardingPage = pathname === '/onboarding' || pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/auth');
    const isApiRoute = pathname.startsWith('/api');
    const isPublicRoute =
      pathname === '/' || pathname === '/waitlist' || pathname.startsWith('/select-plan');

    if (
      !isOnboardingPage &&
      !isAuthPage &&
      !isApiRoute &&
      !isPublicRoute &&
      !pathname.startsWith('/settings') &&
      profile &&
      profile.investor_questionnaire_completed !== true
    ) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    if (!isTradingPublicPath) {
      if (profile?.email_verified !== true) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/verify-email';
        url.search = '';
        return NextResponse.redirect(url);
      }

      if (profile?.deleted_at && profile?.deletion_scheduled_for) {
        const scheduledFor = new Date(profile.deletion_scheduled_for);
        if (scheduledFor < new Date()) {
          const url = request.nextUrl.clone();
          url.pathname = '/auth/signin';
          url.search = '';
          url.searchParams.set('reason', 'account_deleted');
          const redirectResponse = NextResponse.redirect(url);
          const supabaseSignOut = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              cookies: {
                getAll() {
                  return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                  cookiesToSet.forEach(({ name, value, options }) => {
                    redirectResponse.cookies.set(name, value, options);
                  });
                },
              },
            },
          );
          await supabaseSignOut.auth.signOut();
          return redirectResponse;
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
