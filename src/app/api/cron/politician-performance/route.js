/**
 * @fileoverview
 * Scheduled worker that recomputes `politician_annual_performance`.
 *
 *   GET   — Weekly refresh invoked by Vercel Cron (see `vercel.json`).
 *           Only recomputes the current year + the previous year, since
 *           older years are historically stable.
 *
 *   POST  — Manual backfill. With body `{ "backfill": true }` it recomputes
 *           every year from 2016 through the current year. Expect 10–30
 *           minutes end-to-end because of FMP historical-price lookups.
 *
 * Both verbs require `Authorization: Bearer $CRON_SECRET`.
 *
 * Backfill example (after deploy):
 *     curl -X POST https://<host>/api/cron/politician-performance \
 *          -H "Authorization: Bearer $CRON_SECRET" \
 *          -H "Content-Type: application/json" \
 *          -d '{"backfill":true}'
 */

import { NextResponse } from 'next/server';
import { computeAllPoliticianPerformance } from '@/lib/politicians/compute-performance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro cap — historical price lookups are slow

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const currentYear = new Date().getFullYear();
    const result = await computeAllPoliticianPerformance({
      years: [currentYear, currentYear - 1],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/politician-performance] GET failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    if (body?.backfill === true) {
      const result = await computeAllPoliticianPerformance();
      return NextResponse.json({ ok: true, mode: 'backfill', ...result });
    }

    if (Array.isArray(body?.years) && body.years.length > 0) {
      const years = body.years
        .map((y) => Number.parseInt(y, 10))
        .filter((y) => Number.isFinite(y) && y >= 2000 && y <= 2100);
      if (years.length === 0) {
        return NextResponse.json({ error: 'invalid years' }, { status: 400 });
      }
      const result = await computeAllPoliticianPerformance({ years });
      return NextResponse.json({ ok: true, mode: 'years', ...result });
    }

    return NextResponse.json(
      { error: 'Body must include {"backfill":true} or {"years":[...]}' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[cron/politician-performance] POST failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
