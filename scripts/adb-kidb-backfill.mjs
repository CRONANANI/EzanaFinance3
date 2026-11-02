// One-time local backfill with no 300s limit:
//   node --env-file=.env.local scripts/adb-kidb-backfill.mjs
import { createClient } from '@supabase/supabase-js';
import { syncKidb } from '../src/lib/adb/kidb.js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);
const result = await syncKidb(db, { force: true });
console.log(result);
