import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * Resolve the theme ('light' | 'dark') to use for the current request, server-side.
 *
 * Priority:
 *   1. Authenticated user's saved preference in `profiles.user_settings.theme`
 *   2. Anonymous cookie (`ezana.theme`) — covers logged-out visitors who toggled
 *      a preference previously in the same browser
 *   3. 'light' default — for everyone else (new users, fresh incognito sessions)
 *
 * This runs inside the root layout (an async Server Component) so the theme
 * class is baked into the SSR output *before* the browser paints anything.
 * Combined with the blocking `<script>` in <head>, this eliminates the
 * split-theme flash on login / first paint.
 *
 * Note: invoking `cookies()` makes the root layout dynamic. During static
 * prerender discovery Next.js throws `DynamicServerError` — we re-throw that
 * so Next can correctly mark pages as dynamic; any OTHER error falls back to
 * 'light' rather than leaving the page with no content.
 */
export async function getServerTheme() {
  const COOKIE_NAME = 'ezana.theme';
  try {
    const supabase = createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('user_settings')
        .eq('id', user.id)
        .maybeSingle();

      const saved = data?.user_settings?.theme;
      if (saved === 'dark' || saved === 'light') return saved;
    }

    const cookieTheme = cookies().get(COOKIE_NAME)?.value;
    if (cookieTheme === 'dark') return 'dark';
    if (cookieTheme === 'light') return 'light';
  } catch (err) {
    /* Next.js throws DynamicServerError during static pre-render discovery
       when code reads cookies. That's expected signalling, not a failure —
       re-throw so Next can mark the route as dynamic. */
    if (err?.digest?.startsWith?.('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    console.error('[getServerTheme] Failed to resolve theme:', err);
  }
  return 'light';
}
