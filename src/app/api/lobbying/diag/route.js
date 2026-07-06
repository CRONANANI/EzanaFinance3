import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { hasLdaKey, createLdaBudget, listFilings } from '@/lib/lobbying/client';
import { filingAmount, isRegistrationFiling } from '@/lib/lobbying/normalize';

/**
 * GET /api/lobbying/diag?year=2025 — read-only ETL diagnostic (CRON_SECRET
 * bearer). Answers "why is top-spenders empty?" by reporting the DB reality vs.
 * the raw LDA payload, so a data-population bug (null amount / null
 * is_registration) is provable without a SQL console:
 *   - lobbying_filings counts for the year: total, amount>0, amount null,
 *     is_registration false/null/true
 *   - a 20-row sample of the actual stored (amount, is_registration, type) values
 *   - ONE raw LDA list filing: the exact dollar field names/types the LIST
 *     endpoint returns, plus what the normalizer derives from it
 * No writes, no mock data. Auth-gated because it echoes raw upstream payloads.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  // `?key=$CRON_SECRET` fallback for header-less cron/callers (see ingest route).
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function countWhere(admin, year, apply) {
  let q = admin
    .from('lobbying_filings')
    .select('uuid', { count: 'exact', head: true })
    .eq('filing_year', year);
  q = apply ? apply(q) : q;
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || 2025;
  const out = { ok: true, year };

  // ── DB reality ──────────────────────────────────────────────────────────
  if (!supaConfigured()) {
    out.db = { configured: false };
  } else {
    try {
      const admin = getAdminClient();
      out.db = {
        configured: true,
        total: await countWhere(admin, year, null),
        amountPositive: await countWhere(admin, year, (q) => q.gt('amount', 0)),
        amountNull: await countWhere(admin, year, (q) => q.is('amount', null)),
        registrationFalse: await countWhere(admin, year, (q) => q.eq('is_registration', false)),
        registrationNull: await countWhere(admin, year, (q) => q.is('is_registration', null)),
        registrationTrue: await countWhere(admin, year, (q) => q.eq('is_registration', true)),
      };
      const { data: sample } = await admin
        .from('lobbying_filings')
        .select('amount,is_registration,filing_type,filing_type_code,client_name')
        .eq('filing_year', year)
        .limit(20);
      out.db.sample = sample || [];
    } catch (err) {
      out.db = { configured: true, error: err?.message || 'query failed' };
    }
  }

  // ── Raw LDA list payload (the decisive dollar-field check) ────────────────
  if (!hasLdaKey()) {
    out.lda = { keyConfigured: false };
  } else {
    try {
      const res = await listFilings(
        { filingYear: year, ordering: '-dt_posted', page: 1, pageSize: 1 },
        { budget: createLdaBudget(2) },
      );
      if (!res.ok || !Array.isArray(res.data?.results) || !res.data.results.length) {
        out.lda = { keyConfigured: true, ok: res.ok, status: res.status, error: res.error || null };
      } else {
        const f = res.data.results[0];
        out.lda = {
          keyConfigured: true,
          ok: true,
          topLevelKeys: Object.keys(f),
          dollarFields: {
            income: { value: f.income, type: typeof f.income },
            expenses: { value: f.expenses, type: typeof f.expenses },
          },
          filingType: { filing_type: f.filing_type, filing_type_display: f.filing_type_display },
          derived: {
            amount: filingAmount(f),
            isRegistration: isRegistrationFiling(f),
          },
        };
      }
    } catch (err) {
      out.lda = { keyConfigured: true, error: err?.message || 'fetch failed' };
    }
  }

  return NextResponse.json(out);
}
