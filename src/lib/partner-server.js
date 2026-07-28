import { redirect } from 'next/navigation';
import { getUserClient } from '@/lib/supabase';
import { isActivePartner } from '@/lib/partner-access';

/**
 * Server-side access gate for the partner experience. Call from a partner route
 * layout (server component). Redirects a non-partner to /home before any partner
 * chrome renders — the JS-proof route gate that pairs with the partner data's
 * RLS. Uses the SAME isActivePartner definition as the post-login router.
 */
export async function requirePartner() {
  const supabase = getUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isActivePartner(supabase, user))) {
    redirect('/home');
  }
}
