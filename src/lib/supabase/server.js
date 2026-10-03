import { createClient } from '@supabase/supabase-js';

let _serverClient = null;

export function getServerSupabase() {
  if (_serverClient) return _serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _serverClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    /* Never through the Next/Vercel Data Cache. supabase-js reads are GET
       requests, so without this a select could be answered from a cached
       response that survives deploys: /api/cron/parse-house-ptrs re-read the
       same 40 already-parsed filings on every run while 5,611 waited. Routes
       that want caching set it on their own response (Cache-Control /
       s-maxage), not on the database read. */
    global: {
      fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });

  return _serverClient;
}

export async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) return null;
  return data.user;
}
