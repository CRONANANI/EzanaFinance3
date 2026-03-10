import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  let res = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data: { session } } = await supabase.auth.getSession();

    const protectedRoutes = ['/home-dashboard', '/portfolio', '/settings'];
    const isProtectedRoute = protectedRoutes.some((route) =>
      req.nextUrl.pathname.startsWith(route)
    );

    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/auth/signin', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const authRoutes = ['/auth/signin', '/auth/signup'];
    const isAuthRoute = authRoutes.some((route) =>
      req.nextUrl.pathname.startsWith(route)
    );

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/home-dashboard', req.url));
    }
  } catch (err) {
    console.error('Middleware auth error:', err);
  }

  return res;
}

export const config = {
  matcher: [
    '/home-dashboard/:path*',
    '/portfolio/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
};
