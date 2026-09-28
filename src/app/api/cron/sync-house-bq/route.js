import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  BQ_DATASET,
  EXPORT_PREFIX,
  getLoaderBigQuery,
  gsUri,
  isLoaderConfigured,
  uploadNdjson,
} from '@/lib/house-disclosures/bq-loader';

/**
 * Mirror the House disclosure tables from Supabase into BigQuery.
 *
 * Supabase stays the system of record — the ingest upserts on doc_id and the
 * PTR parser flips per-row flags, both of which want row-level mutation that
 * BigQuery is poor at. Rather than dual-write and let the two drift with no
 * way to tell which is right, this replaces the BigQuery side wholesale:
 * page every row out to newline-delimited JSON in GCS, then run one load job
 * per table with WRITE_TRUNCATE. BigQuery is therefore exactly Supabase as of
 * the last successful sync, or exactly the sync before it — never a
 * half-applied mixture, because WRITE_TRUNCATE swaps the table contents
 * atomically when the job succeeds and leaves them untouched when it fails.
 *
 * Auth: CRON_SECRET bearer (or ?key= for cron setups that cannot send a
 * header), matching the other cron routes here.
 *   GET /api/cron/sync-house-bq
 *   GET /api/cron/sync-house-bq?tables=trades
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/* A full export of ~49k filings plus the trades, paged and uploaded, then two
   load jobs polled to completion. */
export const maxDuration = 300;

/* Supabase caps a single select at 1,000 rows; page well under any statement
   timeout while keeping the round trips down. */
const PAGE = 1000;
/* Rows per uploaded part. Keeps each object to a few MB so a failed upload
   costs one part, not the whole export. */
const ROWS_PER_PART = 25000;

const TABLES = {
  filings: {
    source: 'house_disclosure_filings',
    target: 'filings',
    /* Ordered by the primary key so paging is stable: without an ORDER BY,
       Postgres may return overlapping or missing rows across range requests
       and the mirror would silently lose filings. */
    orderBy: 'doc_id',
    /* Mirrors the BigQuery DDL exactly. Listed rather than passing '*' so a
       new Supabase column cannot reach a load job whose schema has no such
       field and fail the whole sync. */
    columns: [
      'doc_id',
      'prefix',
      'last_name',
      'first_name',
      'suffix',
      'filing_type',
      'filing_type_label',
      'state_dst',
      'state',
      'district',
      'filing_year',
      'filing_date',
      'pdf_url',
      'is_ptr',
      'is_electronic',
      'trades_parsed',
      'needs_ocr',
      'synced_at',
      'covered_year',
      'disclosure_type',
      'filing_date_raw',
    ],
  },
  trades: {
    source: 'house_trades',
    target: 'trades',
    orderBy: 'id',
    columns: [
      'id',
      'doc_id',
      'last_name',
      'first_name',
      'state_dst',
      'ticker',
      'asset_name',
      'tx_type',
      'tx_date',
      'notification_date',
      'amount_low',
      'amount_high',
      'amount_midpoint',
      'amount_bracket_label',
      'raw_row',
      'synced_at',
    ],
  },
};

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

/**
 * One NDJSON line per row.
 *
 * Timestamps go out as ISO strings, which BigQuery parses into TIMESTAMP, and
 * dates as bare YYYY-MM-DD. The numeric bracket columns arrive from
 * postgres-js as strings ("15000"), and BigQuery's JSON loader will not
 * coerce a quoted value into INT64, so they are converted here. A null stays
 * null: the brackets are genuinely absent on some rows and 0 would be a
 * different, wrong claim.
 */
function toNdjson(rows, numericInts, numericFloats) {
  return rows
    .map((row) => {
      const out = { ...row };
      for (const k of numericInts) {
        if (out[k] !== null && out[k] !== undefined) out[k] = Number.parseInt(out[k], 10);
      }
      for (const k of numericFloats) {
        if (out[k] !== null && out[k] !== undefined) out[k] = Number.parseFloat(out[k]);
      }
      return JSON.stringify(out);
    })
    .join('\n');
}

const NUMERIC_INTS = { trades: ['amount_low', 'amount_high'], filings: [] };
const NUMERIC_FLOATS = { trades: ['amount_midpoint'], filings: [] };

/** Page every row of one Supabase table out to GCS as NDJSON parts. */
async function exportTable(admin, key, runId, errors) {
  const spec = TABLES[key];
  const prefix = `${EXPORT_PREFIX}/${spec.target}/${runId}`;
  let from = 0;
  let exported = 0;
  let partIndex = 0;
  let buffer = [];

  const flush = async () => {
    if (!buffer.length) return;
    const name = `${prefix}/part-${String(partIndex).padStart(3, '0')}.json`;
    await uploadNdjson(name, toNdjson(buffer, NUMERIC_INTS[key] || [], NUMERIC_FLOATS[key] || []));
    partIndex += 1;
    buffer = [];
  };

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from(spec.source)
      .select(spec.columns.join(','))
      .order(spec.orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      errors.push(`${key}: export ${error.message}`);
      return { exported, prefix, ok: false, parts: partIndex };
    }
    const rows = data || [];
    if (!rows.length) break;
    buffer.push(...rows);
    exported += rows.length;
    if (buffer.length >= ROWS_PER_PART) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  await flush();

  if (!partIndex) {
    /* Zero rows, and the read SUCCEEDED — a failed page returns above with
       ok: false, so reaching here means the table really is empty. That is a
       live state, not an error: house_trades holds nothing until the PTR
       parser has run.

       An empty table still needs a part written. A load job pointed at a
       prefix with no objects fails with "not found", and skipping the load
       would leave yesterday's rows in BigQuery while Supabase has none —
       exactly the drift this job exists to prevent. A zero-byte NDJSON file
       loads as zero rows, so WRITE_TRUNCATE empties the mirror properly. */
    await uploadNdjson(`${prefix}/part-000.json`, '');
    return { exported: 0, prefix, ok: true, parts: 1 };
  }
  return { exported, prefix, ok: true, parts: partIndex };
}

/** WRITE_TRUNCATE load from the run's GCS prefix into the mirror table. */
async function loadTable(bq, key, prefix, errors) {
  const spec = TABLES[key];
  try {
    /* createJob with an explicit sourceUris, NOT table.load(uri).
       table.load() given a string treats it as a LOCAL FILE PATH and pipes it
       through fs.createReadStream; loading from GCS through that API needs a
       File object from @google-cloud/storage, which is deliberately not a
       dependency here (gcs.js avoids it the same way, reusing
       google-auth-library instead). createJob takes plain gs:// strings. */
    const [job] = await bq.createJob({
      /* The dataset is created in US by the DDL, and a load job must be
         submitted in the same location as its destination. */
      location: 'US',
      configuration: {
        load: {
          sourceUris: [gsUri(`${prefix}/part-*.json`)],
          destinationTable: {
            projectId: bq.projectId,
            datasetId: BQ_DATASET,
            tableId: spec.target,
          },
          sourceFormat: 'NEWLINE_DELIMITED_JSON',
          writeDisposition: 'WRITE_TRUNCATE',
          /* The table's DDL schema is authoritative. Autodetect would infer
             types from whatever this export happens to contain — an all-null
             column becoming STRING, for instance — and silently reshape the
             mirror. */
          autodetect: false,
          /* Zero tolerance: a row BigQuery cannot parse means the export and
             the schema disagree, which is exactly the drift this job exists
             to prevent. Better a failed sync that keeps yesterday's table. */
          maxBadRecords: 0,
        },
      },
    });

    /* createJob returns as soon as the job is ACCEPTED. promise() resolves
       when it actually finishes, and rejects if it finishes with an error —
       without this the count check below would race an in-flight load. */
    await job.promise();

    const [meta] = await job.getMetadata();
    const errs = meta?.status?.errors;
    if (errs?.length) {
      errors.push(`${key}: load ${errs.map((e) => e.message).join('; ')}`);
      return { ok: false, jobId: meta?.id ?? null, loaded: 0 };
    }
    return {
      ok: true,
      jobId: meta?.id ?? meta?.jobReference?.jobId ?? null,
      loaded: Number(meta?.statistics?.load?.outputRows ?? 0),
    };
  } catch (e) {
    /* A rejected promise() carries the job's own error list where it has
       one; those messages are the useful part. */
    const detail = Array.isArray(e?.errors) ? e.errors.map((x) => x.message).join('; ') : null;
    errors.push(`${key}: load ${detail || e?.message || e}`);
    return { ok: false, jobId: null, loaded: 0 };
  }
}

/**
 * COUNT(*) in Supabase — the authoritative side of the comparison.
 *
 * Deliberately re-read AFTER the load rather than reusing the number of rows
 * the export happened to page through. Those two differ exactly when it
 * matters: the ingest and the PTR parser both write to these tables on their
 * own schedules, and offset paging across a table being written to can skip
 * or repeat rows. Comparing BigQuery against the export would then agree with
 * itself and call a skewed mirror correct.
 */
async function countInSupabase(admin, source, errors, key) {
  const { count, error } = await admin.from(source).select('*', { count: 'exact', head: true });
  if (error) {
    errors.push(`${key}: source count ${error.message}`);
    return null;
  }
  return count ?? null;
}

/** COUNT(*) in the mirror, for the post-load comparison. */
async function countInBigQuery(bq, target, errors, key) {
  try {
    const [rows] = await bq.query({
      query: `SELECT COUNT(*) AS n FROM \`${bq.projectId}.${BQ_DATASET}.${target}\``,
      /* The mirror is created in US by the DDL. */
      location: 'US',
    });
    return Number(rows?.[0]?.n ?? 0);
  } catch (e) {
    errors.push(`${key}: verify ${e?.message || e}`);
    return null;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isLoaderConfigured()) {
    /* Named explicitly rather than falling back to the reader account: the
       reader holds Storage Object Viewer only, so a fallback would fail
       partway through with a permission error after writing part of an
       export. */
    return NextResponse.json(
      {
        ok: false,
        error:
          'GCP_LOADER_SERVICE_ACCOUNT_JSON not configured. The read-only ' +
          'GCP_SERVICE_ACCOUNT_JSON cannot create objects or run load jobs.',
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const requested = (searchParams.get('tables') || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t in TABLES);
  const keys = requested.length ? requested : Object.keys(TABLES);

  const admin = getAdminClient();
  const bq = getLoaderBigQuery();
  const errors = [];
  /* Things that did not go to plan but say nothing about whether the mirror
     is correct — currently only a failed log write. */
  const warnings = [];
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {};

  for (const key of keys) {
    const spec = TABLES[key];
    // eslint-disable-next-line no-await-in-loop
    const exp = await exportTable(admin, key, runId, errors);
    let load = { ok: false, jobId: null, loaded: 0 };
    let bqCount = null;

    let srcCount = null;
    if (exp.ok) {
      // eslint-disable-next-line no-await-in-loop
      load = await loadTable(bq, key, exp.prefix, errors);
      if (load.ok) {
        // eslint-disable-next-line no-await-in-loop
        bqCount = await countInBigQuery(bq, spec.target, errors, key);
        // eslint-disable-next-line no-await-in-loop
        srcCount = await countInSupabase(admin, spec.source, errors, key);
      }
    }

    /* The check that makes this trustworthy: BigQuery's own COUNT(*) against
       Supabase's own COUNT(*). A load job can report success having dropped
       rows, and an export paged across a table that was being written to can
       be skewed — so neither the job status nor the export's own tally is
       enough. These two counts agreeing is what "the mirror equals the
       source" actually means.

       A small difference usually means the ingest or the parser wrote while
       the export was running; tomorrow's run settles it. It is still
       reported rather than tolerated, because the alternative is a mirror
       that is quietly a few rows wrong for a day with nothing saying so. */
    const matched = bqCount !== null && srcCount !== null && bqCount === srcCount;
    if (load.ok && !matched) {
      errors.push(
        `${key}: count mismatch — supabase ${srcCount ?? 'unknown'}, ` +
          `bigquery ${bqCount ?? 'unknown'}, exported ${exp.exported}` +
          (bqCount !== null && srcCount !== null ? ` (difference ${bqCount - srcCount})` : ''),
      );
    }

    const ok = exp.ok && load.ok && matched;
    report[key] = {
      rows_exported: exp.exported,
      rows_loaded: load.loaded,
      supabase_count: srcCount,
      bigquery_count: bqCount,
      difference: bqCount === null || srcCount === null ? null : bqCount - srcCount,
      parts: exp.parts,
      gcs_prefix: exp.prefix,
      job_id: load.jobId,
      ok,
    };

    /* Logged per table per run, so a mismatch is inspectable afterwards
       rather than living only in a response nobody kept.

       A failure here is a WARNING, not an error: it means the log row was
       not written (most likely because 20260928160000_house_bq_sync_log.sql
       has not been applied yet), which says nothing about whether the mirror
       is correct. Folding it into `errors` would report a perfectly good
       sync as failed. */
    // eslint-disable-next-line no-await-in-loop
    const { error: logErr } = await admin.from('house_bq_sync_log').insert({
      table_name: spec.target,
      rows_exported: exp.exported,
      rows_loaded: load.loaded,
      job_id: load.jobId,
      ran_at: new Date().toISOString(),
      ok,
    });
    if (logErr) warnings.push(`${key}: log ${logErr.message}`);
  }

  return NextResponse.json({
    /* `ok` is a statement about the MIRROR — that BigQuery equals Supabase
       for every table asked for. Warnings do not enter into it. */
    ok: errors.length === 0 && keys.every((k) => report[k]?.ok),
    run_id: runId,
    tables: report,
    errors: errors.slice(0, 20),
    warnings: warnings.slice(0, 20),
  });
}
