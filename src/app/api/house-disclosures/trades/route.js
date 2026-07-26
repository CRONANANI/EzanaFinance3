import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getHouseTrades } from '@/lib/house-disclosures-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/house-disclosures/trades?doc_id=... — parsed trades for one PTR filing.
   Public read (RLS is public), rate-limited via withApiGuard. Reads Supabase only;
   never fetches the Clerk. Amounts are brackets — the UI must not render the
   midpoint as an exact figure. */
export const GET = withApiGuard(
  async (request) => {
    let docId = '';
    try {
      docId = new URL(request.url).searchParams.get('doc_id') || '';
    } catch {
      docId = '';
    }
    if (!docId) {
      return NextResponse.json({ error: 'doc_id is required' }, { status: 400 });
    }
    const trades = await getHouseTrades({ docId });
    return NextResponse.json({ docId, trades });
  },
  { requireAuth: false },
);
