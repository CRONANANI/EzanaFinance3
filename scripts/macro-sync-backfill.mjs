// node --env-file=.env.local scripts/macro-sync-backfill.mjs bcb   (or bis | cepal | afdb | all)
import { createClient } from '@supabase/supabase-js';
import { ADAPTERS, runSync } from '../src/lib/macro-sync/index.js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);
const which = process.argv[2] || 'all';
for (const [name, adapter] of Object.entries(ADAPTERS)) {
  if (which !== 'all' && which !== name) continue;
  console.log(name, await runSync(db, adapter, { force: true }));
}
