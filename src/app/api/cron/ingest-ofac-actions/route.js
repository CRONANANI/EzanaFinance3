import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { withIngestRun } from '@/lib/ingest-runs';
import { parseRecentActions } from '@/lib/sanctions/actions';

/**
 * OFAC Recent Actions (Treasury's own dated notices) into ofac_actions, for
 * the Sanctions page's official actions feed. Reads the first PAGES listing
 * pages of https://ofac.treasury.gov/recent-actions; each notice's date comes
 * from its own URL. If the first page yields no notices the page layout has
 * changed: the run fails and writes nothing.
 *   GET /api/cron/ingest-ofac-actions
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const LISTING = 'https://ofac.treasury.gov/recent-actions';
const PAGES = 3;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

async function fetchPage(n) {
  const res = await fetch(n ? `${LISTING}?page=${n}` : LISTING, {
    headers: { 'User-Agent': 'EzanaFinance/1.0 (+https://ezana.world)', Accept: 'text/html' },
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${res.status} page ${n}`);
  return res.text();
}

async function handler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const errors = [];
  const found = new Map();
  for (let n = 0; n < PAGES; n += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const items = parseRecentActions(await fetchPage(n));
      if (n === 0 && !items.length) {
        return NextResponse.json(
          {
            ok: false,
            error: 'no notices found on the first listing page; layout may have changed',
          },
          { status: 502 },
        );
      }
      for (const it of items) if (!found.has(it.id)) found.set(it.id, it);
    } catch (e) {
      if (n === 0) {
        return NextResponse.json(
          { ok: false, error: `download: ${e?.message || e}` },
          { status: 502 },
        );
      }
      errors.push(String(e?.message || e));
    }
  }
  const stamp = new Date().toISOString();
  const rows = [...found.values()].map((a) => ({
    id: a.id,
    action_date: a.date,
    title: a.title,
    url: a.url,
    kinds: a.kinds,
    program_hints: a.programHints,
    synced_at: stamp,
  }));
  const { error } = await getAdminClient().from('ofac_actions').upsert(rows, { onConflict: 'id' });
  if (error) {
    return NextResponse.json({ ok: false, error: `upsert: ${error.message}` }, { status: 500 });
  }
  revalidateTag('sanctions');
  return NextResponse.json({
    ok: true,
    rowsRead: rows.length,
    written: rows.length,
    validation: `${rows.length} notices from ${PAGES} listing pages`,
    errors,
  });
}

/* Every run is logged to ingest_runs from this route's own JSON body. */
export const GET = withIngestRun('ofac-actions', handler);
