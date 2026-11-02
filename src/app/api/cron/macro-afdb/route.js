import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ADAPTERS, runSync } from '@/lib/macro-sync';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * GET /api/cron/macro-afdb  (daily check, weekly refresh; src/lib/macro-sync)
 * Copies the source into public.macro_series_values for Sonar. Auth: Bearer cron
 * secret, checked by cronRoute.
 */
const SOURCE = 'afdb';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run() {
  const started = Date.now();
  try {
    const result = await runSync(getAdminClient(), ADAPTERS[SOURCE], { budgetMs: 240000 });
    if (result.rowsWritten) revalidateTag(`macro-${SOURCE}`);
    return NextResponse.json({ ok: !result.errors?.length, ...result, ms: Date.now() - started });
  } catch (e) {
    console.error(`[cron/macro-${SOURCE}]`, e?.message || e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}

export const GET = cronRoute(`macro-${SOURCE}`, run, { ttlSeconds: 330 });
