import { redirect } from 'next/navigation';
import { safeInternalPath } from '@/lib/sanitize';

/**
 * Legacy partner login (QA PAR-9). The old client form here skipped the
 * login-attempt lockout and ignored ?redirect=; partners now sign in at
 * /auth/partner/signin (the shared SignInCard). Old links and bookmarks are
 * forwarded there with ?redirect= (sanitized) and ?error= preserved.
 */
export default function PartnerLoginRedirect({ searchParams }) {
  const params = new URLSearchParams();
  const requested = searchParams?.redirect ?? searchParams?.next;
  const target = safeInternalPath(requested, '');
  if (target) params.set('redirect', target);
  if (typeof searchParams?.error === 'string') params.set('error', searchParams.error);
  const qs = params.toString();
  redirect(qs ? `/auth/partner/signin?${qs}` : '/auth/partner/signin');
}
