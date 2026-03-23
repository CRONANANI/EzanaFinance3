import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { matchesRoutePrefix, PARTNER_DASHBOARD_ROUTES, USER_DASHBOARD_ROUTES } from '@/lib/auth/protected-routes';

const ALLOWED_ORIGINS = ['https://ezana.world', 'http://localhost:3000', 'http://127.0.0.1:3000'];

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  /** Stripe webhook must receive the raw body — skip session / CORS handling */
  if (pathname.startsWith('/api/stripe/webhook')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  /** OAuth callback and auth pages must not run session-gate logic (session is created here) */
  if (pathname.startsWith('/auth')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    return response;
  }

  if (matchesRoutePrefix(pathname, PARTNER_DASHBOARD_ROUTES) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/partner-login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (matchesRoutePrefix(pathname, USER_DASHBOARD_ROUTES) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
