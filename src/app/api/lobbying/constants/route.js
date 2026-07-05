import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  hasLdaKey,
  createLdaBudget,
  getIssueConstants,
  getGovernmentEntityConstants,
  getFilingTypeConstants,
} from '@/lib/lobbying/client';
import { normalizeConstants } from '@/lib/lobbying/normalize';

/**
 * GET /api/lobbying/constants  — filter vocabularies (issue areas, government
 * entities, filing types) for the filter-rail dropdowns. Supabase-first
 * (lobbying_constants, refreshed by the cron); live LDA fallback (these
 * endpoints don't count toward the rate limit); honest empty. NO mock data.
 *
 * → { source, issues:[{value,label}], entities:[...], filingTypes:[...] }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:constants:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const empty = { ok: true, source: SOURCE, issues: [], entities: [], filingTypes: [] };

  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data } = await admin.from('lobbying_constants').select('kind,value,label');
      if (Array.isArray(data) && data.length) {
        const pick = (kind) =>
          data
            .filter((r) => r.kind === kind)
            .map((r) => ({ value: r.value, label: r.label }))
            .sort((a, b) => a.label.localeCompare(b.label));
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          issues: pick('issue'),
          entities: pick('entity'),
          filingTypes: pick('filing_type'),
        });
      }
    } catch {
      /* fall through */
    }
  }

  if (!hasLdaKey()) return NextResponse.json(empty);
  try {
    const budget = createLdaBudget(6);
    const [issueRes, entityRes, typeRes] = await Promise.all([
      getIssueConstants({ budget }),
      getGovernmentEntityConstants({ budget }),
      getFilingTypeConstants({ budget }),
    ]);
    const arr = (res) => (Array.isArray(res?.data?.results) ? res.data.results : res?.data || []);
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      issues: normalizeConstants(arr(issueRes)),
      entities: normalizeConstants(arr(entityRes)),
      filingTypes: normalizeConstants(arr(typeRes)),
    });
  } catch {
    return NextResponse.json(empty);
  }
}
