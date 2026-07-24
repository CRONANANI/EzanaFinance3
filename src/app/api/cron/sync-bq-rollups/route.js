import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { isBigQueryConfigured } from '@/lib/bigquery-client';
import {
  getFiscalYearCoverage,
  getAgencyTotals,
  getTopRecipients,
  getRecentAwards,
} from '@/lib/bigquery-contracts';
import { normalizeAgency } from '@/lib/gov-agency-taxonomy';

/**
 * Sync BigQuery contract rollups → Supabase (the page reads the small rollups,
 * never raw BigQuery). Refreshes gov_contract_coverage for every fiscal year,
 * then processes a BOUNDED number of fiscal years per invocation (resumable via
 * ingest_progress) so it can't time out. Keeps the top N recipients per FY.
 * CRON_SECRET bearer (or ?key=). Idempotent (upserts on the rollup PKs).
 *   GET /api/cron/sync-bq-rollups?maxFys=2&topN=1000
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const PROGRESS = 'ingest_progress';
const JOB = 'sync-bq-rollups';
const DEFAULT_MAX_FYS = 2;
const DEFAULT_TOP_N = 1000;
const UPSERT_CHUNK = 500;

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

/** BigQuery numeric/int cells come back as number | string | {value}. */
function num(v) {
  if (v == null) return 0;
  if (typeof v === 'object' && 'value' in v) return Number(v.value) || 0;
  return Number(v) || 0;
}

async function upsertChunked(admin, table, rows, onConflict) {
  let count = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(table).upsert(chunk, { onConflict });
    if (error) errors.push(`${table}@${i}: ${error.message}`);
    else count += chunk.length;
  }
  return { count, errors };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isBigQueryConfigured()) {
    return NextResponse.json({ ok: false, error: 'BigQuery not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const maxFys = Math.min(Math.max(Number(searchParams.get('maxFys')) || DEFAULT_MAX_FYS, 1), 19);
  const topN = Math.min(Math.max(Number(searchParams.get('topN')) || DEFAULT_TOP_N, 1), 5000);

  const admin = getAdminClient();
  const syncedAt = new Date().toISOString();
  const errors = [];
  let bytesBilled = 0;

  // 1) Coverage for every fiscal year (cheap: partition column only) → upsert.
  const cov = await getFiscalYearCoverage();
  if (cov.error) {
    return NextResponse.json({ ok: false, error: `coverage: ${cov.error}` }, { status: 502 });
  }
  bytesBilled += cov.bytesBilled || 0;
  const coverageRows = cov.rows
    .map((r) => ({ fiscal_year: Number(r.fiscal_year), awards: num(r.awards), total: num(r.total) }))
    .filter((r) => Number.isFinite(r.fiscal_year));
  if (coverageRows.length) {
    const { errors: e } = await upsertChunked(
      admin,
      'gov_contract_coverage',
      coverageRows.map((r) => ({
        fiscal_year: r.fiscal_year,
        award_count: r.awards,
        total_amount: r.total,
        synced_at: syncedAt,
      })),
      'fiscal_year',
    );
    errors.push(...e);
  }

  // 2) Pick the next bounded batch of fiscal years (ascending) after the
  //    checkpoint, so a full sweep completes over several invocations.
  const allFys = coverageRows.map((r) => r.fiscal_year).sort((a, b) => a - b);
  const { data: ck } = await admin.from(PROGRESS).select('*').eq('job', JOB).maybeSingle();
  const lastFy = ck?.fiscal_year ?? null;
  const remaining = lastFy == null ? allFys : allFys.filter((y) => y > lastFy);
  const batch = remaining.slice(0, maxFys);

  const processed = [];
  let recipientRows = 0;
  let agencyRows = 0;

  for (const fy of batch) {
    // Agency totals → rollup (normalize bucket server-side).
    // eslint-disable-next-line no-await-in-loop
    const agencies = await getAgencyTotals({ fiscalYear: fy });
    bytesBilled += agencies.bytesBilled || 0;
    if (agencies.error) {
      errors.push(`fy${fy} agencies: ${agencies.error}`);
      break; // stop; checkpoint not advanced → retried next run
    }
    const agencyUpserts = agencies.rows.map((r) => ({
      fiscal_year: fy,
      awarding_agency: String(r.awarding_agency || 'Unknown'),
      agency_bucket: normalizeAgency(r.awarding_agency),
      total_amount: num(r.total),
      award_count: num(r.awards),
      synced_at: syncedAt,
    }));
    // eslint-disable-next-line no-await-in-loop
    const aRes = await upsertChunked(admin, 'gov_contract_agency_rollup', agencyUpserts, 'fiscal_year,awarding_agency');
    agencyRows += aRes.count;
    errors.push(...aRes.errors);

    // Top-N recipients → rollup.
    // eslint-disable-next-line no-await-in-loop
    const recipients = await getTopRecipients({ fiscalYear: fy, limit: topN });
    bytesBilled += recipients.bytesBilled || 0;
    if (recipients.error) {
      errors.push(`fy${fy} recipients: ${recipients.error}`);
      break;
    }
    const recipientUpserts = recipients.rows.map((r) => ({
      fiscal_year: fy,
      recipient_name: String(r.recipient_name || 'Unknown'),
      awarding_agency: String(r.awarding_agency || 'Unknown'),
      agency_bucket: normalizeAgency(r.awarding_agency),
      total_amount: num(r.total),
      award_count: num(r.awards),
      synced_at: syncedAt,
    }));
    // eslint-disable-next-line no-await-in-loop
    const rRes = await upsertChunked(admin, 'gov_contract_recipient_rollup', recipientUpserts, 'fiscal_year,recipient_name,awarding_agency');
    recipientRows += rRes.count;
    errors.push(...rRes.errors);

    processed.push(fy);
  }

  // Rolling display feed: the ticker's "newest awards". Delete-then-insert so
  // the table stays ~200 rows and never accumulates stale awards — BigQuery is
  // the archive, this is not. Pulls only the latest one or two fiscal years, so
  // the ORDER BY action_date scans one or two partitions, not the whole table.
  let recentRows = 0;
  const latestFys = allFys.slice(-2);
  if (latestFys.length) {
    const recent = await getRecentAwards({ limit: 200, fiscalYears: latestFys });
    bytesBilled += recent.bytesBilled || 0;
    if (recent.error) {
      errors.push(`recent awards: ${recent.error}`);
    } else if (recent.rows.length) {
      const feedRows = recent.rows.map((r) => ({
        generated_award_id: r.generated_award_id,
        award_id_piid: r.award_id_piid ?? null,
        recipient_name: String(r.recipient_name || 'Unknown'),
        recipient_parent_name: r.recipient_parent_name ?? null,
        awarding_agency: String(r.awarding_agency || 'Unknown'),
        awarding_sub_agency: r.awarding_sub_agency ?? null,
        funding_agency: r.funding_agency ?? null,
        award_amount: num(r.award_amount),
        // BigQuery DATE comes back as { value: 'YYYY-MM-DD' }.
        action_date: r.action_date?.value ?? r.action_date,
        fiscal_year: Number(r.fiscal_year),
        naics_code: r.naics_code ?? null,
        naics_description: r.naics_description ?? null,
        psc_code: r.psc_code ?? null,
        psc_description: r.psc_description ?? null,
        pop_state: r.pop_state ?? null,
        pop_city: r.pop_city ?? null,
        description: r.description ?? null,
        synced_at: syncedAt,
      }));
      // Replace the whole feed. The delete + insert are not transactional here,
      // but the table is display-only and refreshed every run, so a brief empty
      // window (ticker simply hides) is acceptable.
      const { error: delErr } = await admin
        .from('gov_contract_recent_awards')
        .delete()
        .neq('generated_award_id', '');
      if (delErr) errors.push(`recent awards delete: ${delErr.message}`);
      const rRes = await upsertChunked(
        admin,
        'gov_contract_recent_awards',
        feedRows,
        'generated_award_id',
      );
      recentRows = rRes.count;
      errors.push(...rRes.errors);
    }
  }

  // Advance the checkpoint to the last FY fully processed this run.
  const newLastFy = processed.length ? processed[processed.length - 1] : lastFy;
  const done = allFys.length > 0 && newLastFy != null && newLastFy >= allFys[allFys.length - 1];
  await admin.from(PROGRESS).upsert(
    {
      job: JOB,
      fiscal_year: done ? null : newLastFy, // reset when a full sweep completes
      status: done ? 'done' : 'running',
      detail: { processed, recipient_rows: recipientRows, agency_rows: agencyRows, bytes_billed: bytesBilled },
      updated_at: syncedAt,
    },
    { onConflict: 'job' },
  );

  return NextResponse.json({
    ok: errors.length === 0,
    done,
    fiscal_years_processed: processed,
    coverage_years: allFys.length,
    recipient_rows: recipientRows,
    agency_rows: agencyRows,
    recent_awards_rows: recentRows,
    bytes_billed: bytesBilled,
    errors: errors.slice(0, 20),
  });
}
