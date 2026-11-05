import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { parseCsl, parseFederalRegister, federalRegisterUrl } from '@/lib/export-controls/parse';

/**
 * GET /api/cron/ingest-export-controls[?backfill=1]
 *
 * Deep research (Nov 2026): daily US export controls.
 *   1. The BIS lists (Entity List, Military End User, Unverified List) from the
 *      Consolidated Screening List download (EXPORT_CSL_URL overrides the
 *      default). Quality gate: fewer than MIN_ENTRIES BIS rows means the
 *      download is broken or changed shape, and nothing is written.
 *   2. Industry and Security Bureau documents from the Federal Register API:
 *      the last 30 days daily, three years with ?backfill=1.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const CSL_URL =
  'https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json';
const MIN_ENTRIES = 300;
const CHUNK = 500;

async function getBody(url, ms = 60_000) {
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/json, text/csv' } },
    ms,
  );
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const type = res.headers.get('content-type') || '';
  return /json/.test(type) || /\.json(\?|$)/.test(url) ? res.json() : res.text();
}

async function run(request) {
  const started = Date.now();
  const { searchParams } = new URL(request.url);
  const backfill = searchParams.get('backfill') === '1';
  const admin = getAdminClient();
  const errors = [];
  const out = { entries: 0, rules: 0 };
  const now = new Date().toISOString();

  /* 1. BIS lists */
  try {
    const entries = parseCsl(await getBody(process.env.EXPORT_CSL_URL || CSL_URL));
    if (entries.length < MIN_ENTRIES) {
      errors.push(`csl: only ${entries.length} BIS entries; nothing written`);
    } else {
      for (let i = 0; i < entries.length; i += CHUNK) {
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin.from('export_control_entries').upsert(
          entries.slice(i, i + CHUNK).map((e) => ({ ...e, synced_at: now })),
          { onConflict: 'id' },
        );
        if (error) {
          errors.push(`entries: ${error.message}`);
          break;
        }
        out.entries += Math.min(CHUNK, entries.length - i);
      }
    }
  } catch (e) {
    errors.push(`csl: ${e?.message || e}`);
  }

  /* 2. Federal Register documents */
  const since = new Date(Date.now() - (backfill ? 3 * 365 : 30) * 864e5).toISOString().slice(0, 10);
  for (let page = 1; page <= (backfill ? 20 : 3); page += 1) {
    if (Date.now() - started > 200_000) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const body = await getBody(federalRegisterUrl({ page, since }), 30_000);
      const rules = parseFederalRegister(body);
      if (!rules.length) break;
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from('export_control_rules').upsert(
        rules.map((r) => ({ ...r, synced_at: now })),
        { onConflict: 'document_number' },
      );
      if (error) {
        errors.push(`rules: ${error.message}`);
        break;
      }
      out.rules += rules.length;
      if (!body?.next_page_url) break;
    } catch (e) {
      errors.push(`federal register p${page}: ${e?.message || e}`);
      break;
    }
  }

  return NextResponse.json({ ok: errors.length === 0, ...out, since, errors });
}

export const GET = cronRoute('ingest-export-controls', run, { ttlSeconds: 360 });
