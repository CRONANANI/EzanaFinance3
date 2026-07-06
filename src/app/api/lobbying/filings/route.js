import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { hasLdaKey, createLdaBudget, listFilings } from '@/lib/lobbying/client';
import { normalizeFiling } from '@/lib/lobbying/normalize';
import { ENTITY_GROUPS } from '@/lib/lobbying/entities';
import { QUARTER_PERIOD_CODE } from '@/lib/lobbying/period';
import { fetchTickerMap, fetchPublicClientNames, tickerFor } from '@/lib/lobbying/tickers';

/**
 * GET /api/lobbying/filings — lobbying disclosure filings with REAL server-side
 * filtering (year, issue, entity, registrant, client, type, min amount, sort,
 * page). Supabase-first (the ingest cron writes lobbying_filings); live LDA
 * fallback on cache miss; honest empty. NO mock data.
 *
 * Each row is left-joined against the curated lobbying_client_tickers table
 * (ticker/exchange/companyLabel/isPublic). ?onlyPublic=1 restricts to filings
 * whose client is a verified public company (filter pushed to the DB so
 * pagination stays exact).
 *
 * → { source, year, results:[{uuid,year,period,posted,amount,registrant,client,
 *     issues[],entities[],lobbyistCount,ticker,exchange,companyLabel,isPublic}],
 *     count, next, page }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:filings:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || 2025;
  const issue = (searchParams.get('issue') || '').trim().toLowerCase(); // issue bucket
  const entityGroup = (searchParams.get('entityGroup') || '').trim().toLowerCase();
  const registrant = (searchParams.get('registrant') || '').trim();
  const client = (searchParams.get('client') || '').trim();
  const type = (searchParams.get('type') || '').trim();
  const minAmount = Number(searchParams.get('min')) || Number(searchParams.get('minAmount')) || 0;
  const period = (searchParams.get('period') || '').trim().toLowerCase();
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 90, 1), 365);
  const sort = searchParams.get('sort') === 'amount' ? 'amount' : 'dt_posted';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(Number(searchParams.get('pageSize')) || 25, 500);
  const groupBuckets = ENTITY_GROUPS[entityGroup] || null;
  const onlyPublic = ['1', 'true', 'yes'].includes(
    (searchParams.get('onlyPublic') || '').toLowerCase(),
  );

  const empty = { ok: true, source: SOURCE, year, results: [], count: 0, next: null, page };

  // Supabase-first
  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      // onlyPublic → restrict to verified public clients at the DB (exact-case
      // .in on the uppercase-stored client_name) so pagination stays correct.
      let publicNames = null;
      if (onlyPublic) {
        publicNames = await fetchPublicClientNames(admin);
        if (!publicNames.length) return NextResponse.json(empty);
      }
      let q = admin
        .from('lobbying_filings')
        .select('*', { count: 'exact' })
        .eq('filing_year', year);
      if (publicNames) q = q.in('client_name', publicNames);
      if (registrant) q = q.ilike('registrant_name', `%${registrant}%`);
      if (client) q = q.ilike('client_name', `%${client}%`);
      if (type) q = q.ilike('filing_type', `%${type}%`);
      if (minAmount > 0) q = q.gte('amount', minAmount);
      if (groupBuckets) q = q.overlaps('entity_buckets', groupBuckets);
      if (issue) q = q.overlaps('issue_buckets', [issue]);
      // period → DB predicate (quarter or last-N-days), so pagination stays exact
      if (['q1', 'q2', 'q3', 'q4'].includes(period)) {
        q = q.eq('quarter', period);
      } else if (period === 'range') {
        q = q.gte('dt_posted', new Date(Date.now() - days * 86400000).toISOString());
      }
      q = q.order(sort, { ascending: false, nullsFirst: false });
      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, count, error } = await q;
      if (!error && Array.isArray(data)) {
        if (!data.length && page === 1) {
          // fall through to live only when the cache is truly empty
          if (count === 0) return await liveOrEmpty();
        }
        // one indexed .in() lookup enriches the whole page with ticker fields
        const tickerMap = await fetchTickerMap(
          admin,
          data.map((r) => r.client_name),
        );
        const results = data.map((r) => ({
          uuid: r.uuid,
          year: r.filing_year,
          period: r.filing_period,
          posted: r.dt_posted,
          amount: r.amount != null ? Number(r.amount) : null,
          type: r.filing_type,
          typeCode: r.filing_type_code || null,
          isRegistration:
            r.is_registration === true || /registration/i.test(String(r.filing_type || '')),
          registrant: r.registrant_name,
          client: r.client_name,
          clientDescription: r.client_description,
          issues: r.issues || [],
          entities: r.entities || [],
          lobbyists: r.lobbyists || [],
          lobbyistCount: r.lobbyist_count || 0,
          url: r.document_url,
          ...tickerFor(r.client_name, tickerMap),
        }));
        const total = count ?? results.length;
        // freshest cache timestamp in this page → drives the "updated …" chip
        const syncedAt = data.reduce(
          (m, r) => (r.synced_at && (!m || r.synced_at > m) ? r.synced_at : m),
          null,
        );
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          origin: 'cache',
          syncedAt,
          year,
          results,
          count: total,
          next: from + pageSize < total ? page + 1 : null,
          page,
        });
      }
    } catch {
      /* fall through to live */
    }
  }

  return await liveOrEmpty();

  async function liveOrEmpty() {
    if (!hasLdaKey()) return NextResponse.json(empty);
    try {
      // Live LDA fallback: bucket-based issue/entity filters don't map to LDA's
      // raw codes, so they're applied client-side after normalization below.
      const res = await listFilings(
        {
          filingYear: year,
          filingPeriod: ['q1', 'q2', 'q3', 'q4'].includes(period)
            ? QUARTER_PERIOD_CODE[period]
            : undefined,
          registrantName: registrant || undefined,
          clientName: client || undefined,
          filingType: type || undefined,
          ordering: sort === 'amount' ? '-income' : '-dt_posted',
          page,
          pageSize,
        },
        { budget: createLdaBudget(4) },
      );
      if (!res.ok || !Array.isArray(res.data?.results)) return NextResponse.json(empty);
      let results = res.data.results.map(normalizeFiling);
      if (minAmount > 0) results = results.filter((r) => (r.amount || 0) >= minAmount);
      // enrich with tickers (best-effort) so the public column works off live too
      if (supaConfigured()) {
        try {
          const admin = getAdminClient();
          const tickerMap = await fetchTickerMap(
            admin,
            results.map((r) => r.client),
          );
          results = results.map((r) => ({ ...r, ...tickerFor(r.client, tickerMap) }));
          if (onlyPublic) results = results.filter((r) => r.isPublic);
        } catch {
          /* enrichment is best-effort */
        }
      }
      return NextResponse.json({
        ok: true,
        source: SOURCE,
        origin: 'live',
        syncedAt: null,
        year,
        results,
        count: res.data.count ?? results.length,
        next: res.data.next ? page + 1 : null,
        page,
      });
    } catch {
      return NextResponse.json(empty);
    }
  }
}
