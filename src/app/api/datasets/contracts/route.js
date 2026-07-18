import { NextResponse } from 'next/server';
import { getContractAwardsPage, getContractCoverage } from '@/lib/usaspending-store';

/**
 * GET /api/datasets/contracts — server-side paginated + filtered access to the
 * hosted USAspending contract awards, so the Government Contracts page can scale
 * past the old ~100-row cap without loading the whole table client-side.
 *
 * Query params: fiscalYear, agency, recipient, minAmount, maxAmount,
 *   sort=amount|date|recipient, order=asc|desc, page, pageSize, coverage=1.
 * Public read (RLS-allowed). Returns { rows, total, page, pageSize, coverage? }.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const result = await getContractAwardsPage({
    fiscalYear: searchParams.get('fiscalYear'),
    agency: searchParams.get('agency') || '',
    recipient: searchParams.get('recipient') || '',
    minAmount: searchParams.get('minAmount'),
    maxAmount: searchParams.get('maxAmount'),
    sort: searchParams.get('sort') || 'amount',
    order: searchParams.get('order') || 'desc',
    page: searchParams.get('page') || 1,
    pageSize: searchParams.get('pageSize') || 50,
  });

  const payload = {
    rows: result.rows,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    error: result.error || undefined,
  };

  // Optional coverage window (FY range + per-FY counts) in the same round-trip.
  if (searchParams.get('coverage') === '1') {
    payload.coverage = await getContractCoverage();
  }

  return NextResponse.json(payload, { status: result.error ? 200 : 200 });
}
