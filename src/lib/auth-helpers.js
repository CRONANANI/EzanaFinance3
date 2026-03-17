/**
 * Auth helper for API routes — extracts the authenticated
 * Supabase user from the request's Authorization header.
 *
 * Usage in any API route:
 *   const user = await getAuthUser(request);
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */

import { createClient } from '@supabase/supabase-js';

export async function getAuthUser(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.replace('Bearer ', '');

    // Create a Supabase client using the user's JWT to verify identity
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return user; // { id, email, ... }
  } catch {
    return null;
  }
}
