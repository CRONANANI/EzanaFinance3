import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { isBigQueryConfigured } from '@/lib/bigquery-client';
import { readCompanyContracts } from '@/lib/bigquery-company-contracts';

/**
 * GET /api/cron/sync-company-contract-history  (weekly, Sundays 04:25 UTC)
 *
 * Ten fiscal years of federal contracts for every listed company in
 * contractor_tickers, read from the warehouse in two queries (by ticker,
 * fiscal year and agency; and the 15 largest awards per ticker), written to
 * company_contract_history and company_contract_top_awards for the Capitol
 * Watch company card. Rows this run did not see are removed afterwards, so a
 * re-matched or retired name key does not linger.
 *
 * ?dry=1 reports the bytes each query would scan and writes nothing. Auth:
 * CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CHUNK = 1000;
const GB = 1024 ** 3;

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

async function upsert(admin, table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const day = (v) => {
  if (!v) return null;
  const s = typeof v === 'object' && v.value ? v.value : String(v);
  return s.slice(0, 10);
};
const num = (v) => {
  const n = Number(typeof v === 'object' && v != null && 'value' in v ? v.value : v);
  return Number.isFinite(n) ? n : null;
};

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isBigQueryConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'GCP_PROJECT_ID and GCP_SERVICE_ACCOUNT_JSON are not set' },
      { status: 500 },
    );
  }
  const started = Date.now();
  const runStart = new Date().toISOString();
  const dry = new URL(request.url).searchParams.get('dry') === '1';
  const admin = getAdminClient();

  /* Every name key that resolves to a listed ticker. */
  const pairs = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('contractor_tickers')
      .select('name_key, ticker, is_public')
      .not('ticker', 'is', null)
      .order('name_key')
      .range(from, from + 999);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    for (const r of data || []) {
      if (r.is_public === false || !r.name_key) continue;
      pairs.push({ key: r.name_key, ticker: String(r.ticker).toUpperCase() });
    }
    if (!data || data.length < 1000) break;
  }

  const out = await readCompanyContracts(pairs, { dryRun: dry });
  const gb = {
    history: out.bytes.history == null ? null : Math.round((out.bytes.history / GB) * 100) / 100,
    top: out.bytes.top == null ? null : Math.round((out.bytes.top / GB) * 100) / 100,
  };
  if (out.error) {
    return NextResponse.json(
      { ok: false, dry, keys: pairs.length, gb, error: out.error },
      { status: 500 },
    );
  }
  if (dry) {
    return NextResponse.json({
      ok: true,
      dry,
      keys: pairs.length,
      tickers: new Set(pairs.map((p) => p.ticker)).size,
      fromFiscalYear: out.fy0,
      gb,
      ms: Date.now() - started,
    });
  }

  try {
    const history = out.history.map((r) => ({
      ticker: r.ticker,
      fiscal_year: Number(r.fiscal_year),
      awarding_agency: r.awarding_agency || 'Unknown agency',
      award_count: num(r.award_count),
      total_amount: num(r.total_amount),
      synced_at: runStart,
    }));
    const top = out.top.map((r) => ({
      ticker: r.ticker,
      generated_award_id: String(r.generated_award_id),
      recipient_name: r.recipient_name || null,
      awarding_agency: r.awarding_agency || null,
      award_amount: num(r.award_amount),
      action_date: day(r.action_date),
      fiscal_year: num(r.fiscal_year),
      synced_at: runStart,
    }));
    await upsert(admin, 'company_contract_history', history, 'ticker,fiscal_year,awarding_agency');
    await upsert(admin, 'company_contract_top_awards', top, 'ticker,generated_award_id');
    /* Only after both writes succeeded: drop what this run did not see. */
    const stale = await Promise.all([
      admin.from('company_contract_history').delete({ count: 'exact' }).lt('synced_at', runStart),
      admin
        .from('company_contract_top_awards')
        .delete({ count: 'exact' })
        .lt('synced_at', runStart),
    ]);
    revalidateTag('hubs');
    return NextResponse.json({
      ok: true,
      keys: pairs.length,
      tickers: new Set(history.map((r) => r.ticker)).size,
      historyRows: history.length,
      topAwards: top.length,
      removed: { history: stale[0].count || 0, top: stale[1].count || 0 },
      fromFiscalYear: out.fy0,
      gb,
      ms: Date.now() - started,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, gb, error: String(e?.message || e), ms: Date.now() - started },
      { status: 500 },
    );
  }
}
