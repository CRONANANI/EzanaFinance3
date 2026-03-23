import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const redirect = requestUrl.searchParams.get('redirect') || '/home-dashboard';
  const oauthError = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (oauthError) {
    const msg = errorDescription || oauthError;
    const signPath = type === 'partner' ? '/auth/partner-login' : '/auth/signin';
    return NextResponse.redirect(
      new URL(`${signPath}?error=${encodeURIComponent(msg)}`, request.url)
    );
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const signPath = type === 'partner' ? '/auth/partner-login' : '/auth/signin';
      return NextResponse.redirect(
        new URL(`${signPath}?error=${encodeURIComponent(error.message || 'auth_failed')}`, request.url)
      );
    }

    if (type === 'partner' && data?.session?.user) {
      const user = data.session.user;
      let isPartner = !!user.user_metadata?.partner_role;

      if (!isPartner) {
        const { data: partner } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
        isPartner = !!partner;
      }

      if (isPartner) {
        return NextResponse.redirect(new URL('/partner-home', request.url));
      }

      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/auth/partner-denied', request.url));
    }
  }

  return NextResponse.redirect(new URL(redirect, request.url));
}
