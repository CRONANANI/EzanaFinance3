/**
 * Auth helper for API routes — extracts the authenticated
 * Supabase user from the request (Bearer token or cookies).
 *
 * Usage in any API route:
 *   const user = await getAuthUser(request);
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export async function getAuthUser(request) {
  try {
    // 1. Try Bearer token first (for programmatic / SDK clients)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) return user;
    }

    // 2. Try cookies (when using @supabase/ssr with httpOnly cookies)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;

    return null;
  } catch {
    return null;
  }
}
