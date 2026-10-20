/**
 * GET /api/lobbying/contributions
 *
 * Itemised LD-203 contributions by lobbyists and registrants, newest first or
 * largest first, from lobbying_contribution_items joined to their reports.
 *
 * Params (all optional):
 *   honoree     member or official honoured, substring match (as filed, free text)
 *   payee       committee or entity paid, substring match
 *   registrant  lobbying firm or organisation, substring match
 *   lobbyist    lobbyist name, substring match
 *   year        filing year;  period  mid_year | year_end
 *   type        feca | he | me | ple | pic
 *   min         minimum amount in USD
 *   sort        date (default) | amount
 *   page, pageSize (max 100)
 *
 * → { source, results: [{ uuid, item, type, contributor, payee, honoree,
 *     amount, date, year, period, posted, filerType, registrantId, registrant,
 *     lobbyist, documentUrl }], count, page, pageSize }
 * Public, rate limited by withApiGuard, CDN-cached for ten minutes.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { CONTRIBUTION_PERIODS, ilikeTerm } from '@/lib/lobbying/contributions';

export const dynamic = 'force-dynamic';

const SOURCE = 'Senate LDA (lda.gov), LD-203';
const CACHE = 'public, max-age=120, s-maxage=600, stale-while-revalidate=1800';
const TYPES = ['feca', 'he', 'me', 'ple', 'pic'];
const REPORT_COLS =
  'filing_year, filing_period, dt_posted, filer_type, registrant_id, registrant_name, lobbyist_name, document_url';

function shape(r) {
  const rep = r.report || {};
  return {
    uuid: r.filing_uuid,
    item: r.item_index,
    type: r.contribution_type,
    contributor: r.contributor_name,
    payee: r.payee_name,
    honoree: r.honoree_name,
    amount: r.amount == null ? null : Number(r.amount),
    date: r.contribution_date,
    year: rep.filing_year ?? null,
    period: rep.filing_period ?? null,
    posted: rep.dt_posted ?? null,
    filerType: rep.filer_type ?? null,
    registrantId: rep.registrant_id ?? null,
    registrant: rep.registrant_name ?? null,
    lobbyist: rep.lobbyist_name ?? null,
    documentUrl: rep.document_url ?? null,
  };
}

export const GET = withApiGuard(
  async (request) => {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, Math.floor(Number(sp.get('page')) || 1));
    const pageSize = Math.min(Math.max(Math.floor(Number(sp.get('pageSize')) || 25), 1), 100);
    const empty = { source: SOURCE, results: [], count: 0, page, pageSize };
    if (!isServerSupabaseConfigured()) return NextResponse.json(empty);

    const year = Number(sp.get('year'));
    const period = sp.get('period');
    const type = String(sp.get('type') || '').toLowerCase();
    const min = Number(sp.get('min'));
    const sort = sp.get('sort') === 'amount' ? 'amount' : 'contribution_date';

    const admin = getAdminClient();
    let q = admin
      .from('lobbying_contribution_items')
      .select(
        `filing_uuid, item_index, contribution_type, contributor_name, payee_name, honoree_name, amount, contribution_date, report:lobbying_contribution_reports!inner(${REPORT_COLS})`,
        { count: 'exact' },
      );

    const honoree = ilikeTerm(sp.get('honoree'));
    const payee = ilikeTerm(sp.get('payee'));
    const registrant = ilikeTerm(sp.get('registrant'));
    const lobbyist = ilikeTerm(sp.get('lobbyist'));
    if (honoree) q = q.ilike('honoree_name', honoree);
    if (payee) q = q.ilike('payee_name', payee);
    if (registrant) q = q.ilike('report.registrant_name', registrant);
    if (lobbyist) q = q.ilike('report.lobbyist_name', lobbyist);
    if (Number.isInteger(year) && year >= 2008 && year <= 2100) {
      q = q.eq('report.filing_year', year);
    }
    if (CONTRIBUTION_PERIODS.includes(period)) q = q.eq('report.filing_period', period);
    if (TYPES.includes(type)) q = q.eq('contribution_type', type);
    if (Number.isFinite(min) && min > 0) q = q.gte('amount', min);

    const from = (page - 1) * pageSize;
    const { data, error, count } = await q
      .order(sort, { ascending: false, nullsFirst: false })
      .order('filing_uuid', { ascending: true })
      .order('item_index', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('[lobbying/contributions]', error.message);
      return NextResponse.json(
        { ...empty, error: 'Contributions unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(
      { source: SOURCE, results: (data || []).map(shape), count: count ?? 0, page, pageSize },
      { headers: { 'Cache-Control': CACHE } },
    );
  },
  { requireAuth: false },
);
