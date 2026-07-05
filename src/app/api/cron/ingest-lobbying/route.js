import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  hasLdaKey,
  createLdaBudget,
  listFilings,
  getIssueConstants,
  getGovernmentEntityConstants,
  getFilingTypeConstants,
} from '@/lib/lobbying/client';
import { normalizeFiling, normalizeConstants } from '@/lib/lobbying/normalize';

/**
 * Scheduled ingest of recent Senate LDA lobbying filings into Supabase
 * (lobbying_filings) plus a refresh of the filter vocabularies
 * (lobbying_constants). Bounded per run (budget << 120/min): a few pages of the
 * most recently posted current-year filings. The /datasets/government/lobbying
 * page reads Supabase-first, so this keeps the page fast and the key server-only.
 *
 * Auth: CRON_SECRET bearer (same pattern as ingest-fec / ingest-congress).
 * No mock rows are ever written.
 *
 *   curl https://ezana.world/api/cron/ingest-lobbying -H "Authorization: Bearer $CRON_SECRET"
 * Optional: ?year=2026&pages=4
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_YEAR = 2026;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

async function refreshConstants(admin, budget) {
  const jobs = [
    ['issue', getIssueConstants({ budget })],
    ['entity', getGovernmentEntityConstants({ budget })],
    ['filing_type', getFilingTypeConstants({ budget })],
  ];
  let count = 0;
  for (const [kind, p] of jobs) {
    try {
      const res = await p;
      const results = Array.isArray(res?.data?.results) ? res.data.results : res?.data;
      const rows = normalizeConstants(results || []).map((c) => ({
        kind,
        value: String(c.value),
        label: c.label,
        synced_at: new Date().toISOString(),
      }));
      if (rows.length) {
        const { error } = await admin
          .from('lobbying_constants')
          .upsert(rows, { onConflict: 'kind,value' });
        if (!error) count += rows.length;
      }
    } catch {
      /* skip this vocab on error */
    }
  }
  return count;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasLdaKey()) {
    return NextResponse.json(
      { ok: false, error: 'LDA key (Lobbyingdisclosuregov) not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || DEFAULT_YEAR;
  const pages = Math.min(Number(searchParams.get('pages')) || 4, 20);

  const admin = getAdminClient();
  const budget = createLdaBudget(90);

  let filingsUpserted = 0;
  const errors = [];

  for (let page = 1; page <= pages; page++) {
    if (budget.remaining < 2) break;
    try {
      const res = await listFilings(
        { filingYear: year, ordering: '-dt_posted', page, pageSize: 25 },
        { budget },
      );
      if (!res.ok) {
        errors.push(`page ${page}: ${res.error}`);
        break;
      }
      const results = Array.isArray(res.data?.results) ? res.data.results : [];
      if (!results.length) break;

      const rows = results.map((f) => {
        const n = normalizeFiling(f);
        return {
          uuid: n.uuid,
          filing_year: n.year,
          filing_period: n.period,
          dt_posted: n.posted,
          amount: n.amount,
          filing_type: n.type,
          registrant_name: n.registrant,
          registrant_id: n.registrantId,
          client_name: n.client,
          client_id: n.clientId,
          client_description: n.clientDescription,
          issues: n.issues,
          entities: n.entities,
          lobbyists: n.lobbyists,
          lobbyist_count: n.lobbyistCount,
          document_url: n.url,
          synced_at: new Date().toISOString(),
        };
      });
      const valid = rows.filter((r) => r.uuid);
      if (valid.length) {
        const { error } = await admin
          .from('lobbying_filings')
          .upsert(valid, { onConflict: 'uuid' });
        if (error) errors.push(`page ${page}: ${error.message}`);
        else filingsUpserted += valid.length;
      }
      if (!res.data?.next) break; // no more pages
    } catch (e) {
      errors.push(`page ${page}: ${e?.message || 'failed'}`);
      break;
    }
  }

  const constantsUpserted = await refreshConstants(admin, budget);

  return NextResponse.json({
    ok: true,
    year,
    filingsUpserted,
    constantsUpserted,
    requestsUsed: budget.used,
    errors: errors.slice(0, 10),
  });
}
