import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getSecFilings, get13FHoldings, getActivistPosition } from '@/lib/sec-filings-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/sec-filings/detail?accession=... — parsed detail for one filing:
   13F → holdings; 13D/13G → the reported stake. Public read (RLS is public),
   rate-limited via withApiGuard. Reads Supabase only; never calls EDGAR. */
export const GET = withApiGuard(
  async (request) => {
    let accessionNo = '';
    try {
      accessionNo = new URL(request.url).searchParams.get('accession') || '';
    } catch {
      accessionNo = '';
    }
    if (!accessionNo) {
      return NextResponse.json({ error: 'accession is required' }, { status: 400 });
    }

    // Resolve the filing's family from the small metadata table (limit-1 lookup).
    const all = await getSecFilings({ limit: 200 });
    const filing = all.find((f) => f.accession_no === accessionNo) || null;
    const family = filing?.form_family || null;

    if (family === 'institutional') {
      const holdings = await get13FHoldings({ accessionNo });
      return NextResponse.json({ family, holdings });
    }
    if (family === 'activist') {
      const position = await getActivistPosition({ accessionNo });
      return NextResponse.json({ family, position });
    }
    // Insider (Form 4) has no parsed detail table in this phase.
    return NextResponse.json({ family, holdings: [], position: null });
  },
  { requireAuth: false },
);
