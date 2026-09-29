import { redirect } from 'next/navigation';
import { safeInternalPath } from '@/lib/sanitize';

/**
 * Legacy /signin. There is one sign-in surface, /auth/signin, which renders
 * outside the app shell; this path used to be a second, bare form that showed
 * the authenticated app navbar to signed-out visitors. It now only forwards,
 * mapping ?next= onto the auth page's ?redirect=.
 */
export default function LegacySignIn({ searchParams }) {
  const target = safeInternalPath(searchParams?.next ?? searchParams?.redirect, '');
  redirect(target ? `/auth/signin?redirect=${encodeURIComponent(target)}` : '/auth/signin');
}
