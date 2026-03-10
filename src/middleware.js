import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

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
