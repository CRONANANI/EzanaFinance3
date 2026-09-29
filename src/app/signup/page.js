import { redirect } from 'next/navigation';
import { safeInternalPath } from '@/lib/sanitize';

/**
 * Legacy /signup. There is one sign-up surface, /auth/signup, which renders
 * outside the app shell; this path used to be a second, bare "Join Ezana
 * Finance" form under the authenticated app navbar that dropped ?next=. It now
 * only forwards, mapping ?next= onto ?redirect= and keeping a referral ?ref=.
 */
export default function LegacySignUp({ searchParams }) {
  const params = new URLSearchParams();
  const target = safeInternalPath(searchParams?.next ?? searchParams?.redirect, '');
  if (target) params.set('redirect', target);
  if (typeof searchParams?.ref === 'string') params.set('ref', searchParams.ref.slice(0, 16));
  const qs = params.toString();
  redirect(qs ? `/auth/signup?${qs}` : '/auth/signup');
}
