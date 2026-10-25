import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isNativeRequest, isNativeBlockedApi, nativeRedirectFor } from '@/lib/native';
import { getClientIp } from '@/lib/client-ip';
import {
  matchesRoutePrefix,
  PARTNER_DASHBOARD_ROUTES,
  USER_DASHBOARD_ROUTES,
} from '@/lib/auth/protected-routes';
import { withTimeout } from '@/lib/with-timeout';
import { logger } from '@/lib/logger';

const ALLOWED_ORIGINS = ['https://ezana.world', 'http://localhost:3000', 'http://127.0.0.1:3000'];

// MFA is enforced on every login for every user across all app versions.
// Emergency global off-switch (operational only — NOT a per-user/device bypass):
// set env MFA_ENFORCED=false to disable if a rollout issue locks users out.
const MFA_ENFORCED = process.env.MFA_ENFORCED !== 'false';
// Optional enrollment: when 'false' (the default), users without a factor are NOT forced to
// enroll — MFA is available but not mandatory. Set MFA_REQUIRE_ENROLLMENT=true to make
// enrollment mandatory again (production hardening). Step-up challenge for users who HAVE a
// factor is unaffected and still governed by MFA_ENFORCED above.
const MFA_REQUIRE_ENROLLMENT = process.env.MFA_REQUIRE_ENROLLMENT === 'true';

/* QA PLAT-1: every awaited network call here is bounded. Production saw the
   platform kill this middleware 58 times for not answering within 25s when
   the database was saturated; a hung call must never hang the request.
   Per call: rate limit fails open, a session lookup that times out treats
   protected pages as signed out (API routes pass through; withApiGuard
   re-checks), profile / org gating reads fail open (the page's own server
   gate still runs), and the MFA assurance check fails closed. */
const T_RATE_LIMIT_MS = 800;
const T_AUTH_MS = 1500;
/* API routes re-authenticate in withApiGuard; here the session only feeds
   the account-lock check, so it gets less time (rate limit + this < 2s). */
const T_AUTH_API_MS = 1000;
const T_DB_MS = 1200;

function warnTimeout(res, pathname, requestId) {
  logger.warn('[middleware] timeout', {
    label: res.label,
    timedOut: Boolean(res.timedOut),
    error: res.error?.message,
    pathname,
    requestId,
  });
}

/** Sign out on a redirect response, bounded so it can never hang. */
async function signOutOn(request, target, pathname, requestId) {
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            target.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  const res = await withTimeout(client.auth.signOut(), T_DB_MS, 'auth.signOut');
  if (!res.ok) warnTimeout(res, pathname, requestId);
}

/* Request IDs (reliability audit P3): reuse a well-formed incoming
   x-request-id, else Vercel's x-vercel-id, else a fresh UUID. Forwarded to
   the route (request header) and returned to the client (response header);
   api-guard tags the Sentry scope and logger lines with it. */
const REQUEST_ID_RE = /^[A-Za-z0-9:_-]{8,128}$/;
function requestIdFor(request) {
  const incoming = request.headers.get('x-request-id');
  if (incoming && REQUEST_ID_RE.test(incoming)) return incoming;
  const vercel = request.headers.get('x-vercel-id');
  if (vercel && REQUEST_ID_RE.test(vercel)) return vercel;
  return crypto.randomUUID();
}

export async function middleware(request) {
  const requestId = requestIdFor(request);
  const response = await handle(request, requestId);
  try {
    response?.headers?.set('x-request-id', requestId);
  } catch {
    /* immutable redirect headers: nothing to add */
  }
  return response;
}

async function handle(request, requestId) {
  const pathname = request.nextUrl.pathname;

  /* App and Android link verification files: Apple and Google fetch these
     directly and reject any redirect, so they pass through untouched. */
  if (pathname.startsWith('/.well-known/')) return NextResponse.next();

  /* Ezana API v1: keys authenticate and rate-limit per key in the route, so
     skip the session lookup, profile gates, CSP nonce and per-IP limit here
     (next.config.js still adds the security headers). */
  if (pathname === '/v1' || pathname.startsWith('/v1/') || pathname.startsWith('/api/v1/')) {
    const h = new Headers(request.headers);
    h.set('x-request-id', requestId);
    return NextResponse.next({ request: { headers: h } });
  }

  /* Inside the iOS and Android apps (user-agent suffix EzanaApp/): real-money
     trading, account linking and web checkout are web-only in v1, and the
     landing page gives way to Home. Browsers never match. */
  if (isNativeRequest(request.headers)) {
    if (pathname.startsWith('/api/')) {
      if (isNativeBlockedApi(pathname)) {
        return NextResponse.json(
          { error: 'This feature is available on ezana.world.' },
          { status: 403 },
        );
      }
    } else {
      const to = nativeRedirectFor(pathname);
      if (to) {
        const url = request.nextUrl.clone();
        url.pathname = to;
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }

  // Global rate limit: 100 req/min per IP on /api/* (excludes auth + webhooks)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const skipPaths = [
      '/api/webhooks/',
      '/api/stripe/webhook',
      '/api/revenuecat/webhook',
      '/api/alpaca/webhook',
      '/api/trading/webhook',
      '/api/mux/webhook',
      '/api/plaid/webhook',
      /* Monitors and Vercel Cron (Bearer-authenticated) are never limited. */
      '/api/health',
      '/api/healthz',
      '/api/readyz',
      '/api/cron/',
      /* Judges share venue Wi-Fi: limited per judge token in the routes. */
      '/api/competitions/judge/',
    ];
    const shouldSkip = skipPaths.some((s) => pathname.startsWith(s));

    if (!shouldSkip) {
      try {
        const { checkRateLimit, logSecurityEvent } = await import('@/lib/persistent-rate-limit');
        const ip = getClientIp(request) || 'unknown';
        const limited = await withTimeout(
          checkRateLimit(`global:${ip}`, 100, 60 * 1000),
          T_RATE_LIMIT_MS,
          'rate-limit',
        );
        /* Fail open: a slow limiter must not stall every API call. */
        if (!limited.ok) warnTimeout(limited, pathname, requestId);
        const result = limited.ok ? limited.value : { allowed: true };

        if (!result.allowed) {
          /* Fire and forget: the audit row never delays the 429. */
          logSecurityEvent('global_rate_limit_hit', {
            severity: 'warning',
            ip,
            endpoint: pathname,
            details: { resetAt: result.resetAt.toISOString() },
          }).catch(() => {});

          return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
                'X-RateLimit-Limit': '100',
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

  /* Forward the resolved pathname as a request header so server components
     (e.g. the root layout) can pre-compute route-scoped body classes
     server-side. Eliminates the class-application race on first paint that
     was causing the split-theme flash on Home / Dashboard. */
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', pathname);
  forwardedHeaders.set('x-request-id', requestId);

  /* Layer 3 — per-request CSP with a nonce so we can drop script-src
     'unsafe-inline'. Next.js reads the nonce from the request's
     Content-Security-Policy header and applies it to its own inline scripts;
     our two inline <script>s in layout.js read it from `x-nonce`. The nonce is
     set on the request headers (for Next + layout) and the CSP is also set on
     the page response below. 'unsafe-eval' is allowed in dev only (HMR needs
     it); production stays strict. style-src keeps 'unsafe-inline' — style
     injection is far lower risk than script injection and removing it breaks
     CSS-in-JS. All integration allowlists (Stripe, Plaid, Supabase, Alpaca,
     Finnhub, Vercel, Sentry, Anthropic, Polymarket…) are preserved verbatim. */
  const nonce = btoa(crypto.randomUUID());
  const isProd = process.env.NODE_ENV === 'production';
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isProd ? '' : " 'unsafe-eval'"} https://js.stripe.com https://cdn.vercel-insights.com https://vercel.live https://cdn.plaid.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.open-meteo.com https://archive-api.open-meteo.com https://www.alphavantage.co https://financialmodelingprep.com https://finnhub.io https://api.stripe.com https://gamma-api.polymarket.com https://clob.polymarket.com https://*.supabase.co wss://*.supabase.co https://*.alpaca.markets https://*.vercel-insights.com https://*.finnhub.io wss://*.finnhub.io https://*.vercel.live https://api.anthropic.com https://*.sentry.io https://cdn.plaid.com https://production.plaid.com https://sandbox.plaid.com https://stream.mux.com https://*.mux.com",
    // Learning videos: Mux HLS manifests and segments (hls.js fetches them; Safari plays them natively).
    "media-src 'self' blob: https://stream.mux.com https://*.mux.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://vercel.live https://cdn.plaid.com",
    // Allow same-origin + blob web workers (e.g. Sentry replay compression).
    // Without this they fall through to default-src 'self', which blocks blob:.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
  forwardedHeaders.set('x-nonce', nonce);
  forwardedHeaders.set('Content-Security-Policy', cspHeader);

  /** Stripe webhook must receive the raw body — skip session / CORS handling */
  if (pathname.startsWith('/api/stripe/webhook')) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  /** Alpaca Broker webhooks — no auth cookie; forward as-is */
  if (pathname.startsWith('/api/trading/webhook')) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  /* Next.js prefetches links on hover/viewport. Skip the auth + profile gating
     (a getUser() network round-trip plus profile queries) for prefetch
     requests: a prefetch must never redirect, and the real navigation re-runs
     this middleware and enforces everything. Without this, hovering the nav
     fires a burst of getUser()/DB calls — one per prefetched link — which makes
     page-to-page switching feel slow. Page routes only; /api handled above. */
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    (request.headers.get('sec-purpose') || '').includes('prefetch');
  if (isPrefetch && !pathname.startsWith('/api/')) {
    return NextResponse.next({ request: { headers: forwardedHeaders } });
  }

  /* The Ezana Echo home is public reading and renders nothing per user on the
     server (the admin bits are client side). It needs the CSP nonce but not
     the getUser() round trip or the profile gates, which cost every visitor a
     network hop before the first byte. Article and author pages are NOT on
     this path: the article page reads the session server side (admin preview
     of drafts and archived pieces, personalised "more"), which needs the
     session refresh below. */
  if (request.method === 'GET' && pathname === '/ezana-echo') {
    const echoResponse = NextResponse.next({ request: { headers: forwardedHeaders } });
    echoResponse.headers.set('Content-Security-Policy', cspHeader);
    return echoResponse;
  }

  let response = NextResponse.next({ request: { headers: forwardedHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);

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

  const authRes = await withTimeout(
    supabase.auth.getUser(),
    pathname.startsWith('/api/') ? T_AUTH_API_MS : T_AUTH_MS,
    'auth.getUser',
  );
  /* A timed-out or failed lookup is "unknown", treated as signed out below:
     protected pages send the visitor to sign in (reason=timeout), API routes
     pass through to withApiGuard, which authenticates on its own. */
  const authUnknown = !authRes.ok;
  if (authUnknown) warnTimeout(authRes, pathname, requestId);
  const user = authRes.ok ? (authRes.value?.data?.user ?? null) : null;

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
      const apiProfileRes = await withTimeout(
        supabase.from('profiles').select('is_disabled').eq('id', user.id).maybeSingle(),
        T_DB_MS,
        'profiles.is_disabled',
      );
      /* Fail open: route handlers still authorise every request. */
      if (!apiProfileRes.ok) warnTimeout(apiProfileRes, pathname, requestId);
      const apiProfile = apiProfileRes.ok ? apiProfileRes.value?.data : null;
      if (apiProfile?.is_disabled === true) {
        const apiResponse = NextResponse.json(
          { error: 'Account locked', code: 'ACCOUNT_DISABLED' },
          { status: 403, headers: response.headers },
        );
        await signOutOn(request, apiResponse, pathname, requestId);
        return apiResponse;
      }
    }

    return response;
  }

  /* Org (university) members use Team Hub as their dashboard, never the regular
     member home. Redirect them server-side so /home never renders for an org
     user (avoids the regular-home flash before the client-side bounce). */
  if (user && pathname === '/home') {
    const orgRes = await withTimeout(
      supabase
        .from('org_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      T_DB_MS,
      'org_members.home',
    );
    /* Fail open: /home renders; the client-side bounce still applies. */
    if (!orgRes.ok) warnTimeout(orgRes, pathname, requestId);
    const orgMember = orgRes.ok ? orgRes.value?.data : null;
    if (orgMember) {
      const url = request.nextUrl.clone();
      url.pathname = '/org-team-hub';
      url.search = '';
      return NextResponse.redirect(url);
    }
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

  /* QA PAR-9: the current partner sign-in card (lockout, ?redirect), not the
     legacy /auth/partner-login page. */
  if (onPartnerProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/partner/signin';
    url.search = '';
    url.searchParams.set('redirect', pathname);
    if (authUnknown) url.searchParams.set('reason', 'timeout');
    return NextResponse.redirect(url);
  }

  if (onUserProtectedRoute && !user && !isTradingPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.search = '';
    url.searchParams.set('redirect', pathname);
    if (authUnknown) url.searchParams.set('reason', 'timeout');
    return NextResponse.redirect(url);
  }

  /** Dashboard / partner / trading (under USER_DASHBOARD_ROUTES): account lock, then verification + deletion */
  let profileGate = null;
  if (user && (onPartnerProtectedRoute || onUserProtectedRoute)) {
    profileGate = await withTimeout(
      supabase
        .from('profiles')
        .select(
          'email_verified, deleted_at, deletion_scheduled_for, is_disabled, investor_questionnaire_completed',
        )
        .eq('id', user.id)
        .maybeSingle(),
      T_DB_MS,
      'profiles.gates',
    );
    /* Fail open: skip every profile gate below rather than guess (a missing
       profile would otherwise send a verified user to /auth/verify-email).
       The page's own server gate still runs. */
    if (!profileGate.ok) warnTimeout(profileGate, pathname, requestId);
  }
  if (profileGate?.ok) {
    const profile = profileGate.value?.data ?? null;

    if (profile?.is_disabled === true) {
      const url = request.nextUrl.clone();
      url.pathname = '/account-locked';
      url.search = '';
      const redirectResponse = NextResponse.redirect(url);
      await signOutOn(request, redirectResponse, pathname, requestId);
      return redirectResponse;
    }

    // First-time users must complete the investor questionnaire before accessing the platform.
    const isOnboardingPage = pathname === '/onboarding' || pathname.startsWith('/onboarding');
    const isAuthPage = pathname.startsWith('/auth');
    const isApiRoute = pathname.startsWith('/api');
    const isPublicRoute =
      pathname === '/' || pathname === '/waitlist' || pathname.startsWith('/select-plan');

    // Org (university) routes are gated too: /onboarding detects org
    // membership and shows the role questionnaire (OrgQuestionnaire), not the
    // consumer one. Before, org routes were exempt, so members who signed in
    // through the org login (which lands on /org-team-hub) never saw it.
    // Reuses the `profile` already fetched above (no second query).

    if (
      user &&
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
          await signOutOn(request, redirectResponse, pathname, requestId);
          return redirectResponse;
        }
      }
    }
  }

  // ── MFA gate — second factor across all app versions ──
  // Enrollment is OPTIONAL by default (MFA_REQUIRE_ENROLLMENT=false); users who have
  // enrolled are still challenged to aal2 when MFA_ENFORCED is on.
  // Runs after the disabled / onboarding / email-verified gates above. Covers
  // consumer + partner protected routes AND org routes (/org-trading is not in
  // the dashboard-route lists, so it is included explicitly here). The MFA
  // pages themselves are exempt so the user is never trapped.
  const isMfaPage = pathname === '/auth/mfa' || pathname === '/auth/mfa-setup';
  const onOrgRoute = pathname.startsWith('/org-team-hub') || pathname.startsWith('/org-trading');

  if (
    MFA_ENFORCED &&
    user &&
    (onUserProtectedRoute || onPartnerProtectedRoute || onOrgRoute) &&
    !isMfaPage &&
    !isTradingPublicPath &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/api')
  ) {
    const aalRes = await withTimeout(
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      T_DB_MS,
      'mfa.aal',
    );
    /* Fail closed: an unknown assurance level never skips the second
       factor. The MFA page itself is exempt above, so this cannot loop. */
    if (!aalRes.ok) {
      warnTimeout(aalRes, pathname, requestId);
      const url = request.nextUrl.clone();
      url.pathname = '/auth/mfa';
      url.search = '';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    try {
      const aal = aalRes.value?.data;
      if (aal) {
        // Has a verified factor but hasn't stepped up this session → challenge.
        if (aal.currentLevel !== 'aal2' && aal.nextLevel === 'aal2') {
          const url = request.nextUrl.clone();
          url.pathname = '/auth/mfa';
          url.search = '';
          url.searchParams.set('redirect', pathname);
          return NextResponse.redirect(url);
        }
        // No verified factor → only force enrollment when explicitly required.
        // Default (MFA_REQUIRE_ENROLLMENT=false): MFA is optional, so skip the gate and
        // let the user proceed without a factor.
        if (MFA_REQUIRE_ENROLLMENT && aal.currentLevel === 'aal1' && aal.nextLevel === 'aal1') {
          const url = request.nextUrl.clone();
          url.pathname = '/auth/mfa-setup';
          url.search = '';
          url.searchParams.set('redirect', pathname);
          return NextResponse.redirect(url);
        }
      }
    } catch (e) {
      // Fail open on a transient AAL error so the app is never hard-locked.
      console.warn('[middleware-mfa] AAL check failed:', e?.message);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
