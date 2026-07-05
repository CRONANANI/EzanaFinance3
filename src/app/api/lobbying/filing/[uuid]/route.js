import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { hasLdaKey, createLdaBudget, getFiling } from '@/lib/lobbying/client';
import { normalizeFilingDetail } from '@/lib/lobbying/normalize';

/**
 * GET /api/lobbying/filing/[uuid]  — single lobbying filing detail for the
 * drill-down modal: client, registrant, all issues + descriptions, government
 * entities targeted, named lobbyists (revolving-door flag), amount, posted
 * date, official document link. Supabase-first (cache); live LDA fallback;
 * honest empty ({ filing: null }). NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`lobbying:filing:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const uuid = params?.uuid;
  if (!uuid) return NextResponse.json({ ok: false, error: 'uuid required' }, { status: 400 });

  const empty = { ok: true, source: SOURCE, filing: null };

  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('lobbying_filings')
        .select('*')
        .eq('uuid', uuid)
        .maybeSingle();
      if (data) {
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          filing: {
            uuid: data.uuid,
            year: data.filing_year,
            period: data.filing_period,
            posted: data.dt_posted,
            amount: data.amount != null ? Number(data.amount) : null,
            type: data.filing_type,
            registrant: data.registrant_name,
            client: data.client_name,
            clientDescription: data.client_description,
            issues: data.issues || [],
            entities: data.entities || [],
            lobbyists: data.lobbyists || [],
            lobbyistCount: data.lobbyist_count || 0,
            url: data.document_url,
          },
        });
      }
    } catch {
      /* fall through */
    }
  }

  if (!hasLdaKey()) return NextResponse.json(empty);
  try {
    const res = await getFiling(uuid, { budget: createLdaBudget(2) });
    if (!res.ok || !res.data) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, filing: normalizeFilingDetail(res.data) });
  } catch {
    return NextResponse.json(empty);
  }
}
