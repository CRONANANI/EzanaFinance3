import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ROLES = ['trader', 'quant_firm', 'institution', 'developer', 'other'];
const VOLUMES = ['<10k', '10-100k', '100k-1M', '1M+'];
const DATASETS = ['congress', 'lobbying', 'fec', 'contracts', 'predictions', 'news'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/ezana-api/request-access
 * Intake for the /ezana-api "Request API access" form. Public (no auth), rate
 * limited per IP, validated, then written to `api_access_requests` via the
 * service-role client (RLS-bypassing) — the table has no public insert policy.
 */
export const POST = withApiGuard(
  async (request) => {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`ezana-api-request:${ip}`, { limit: 5, window: '600 s' });
    if (!rl.success) return rateLimitResponse(rl);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();
    const company = String(body?.company || '').trim();
    const role = String(body?.role || '').trim();
    const useCase = String(body?.useCase || '').trim();
    const volume = String(body?.volume || '').trim();
    const datasets = Array.isArray(body?.datasets)
      ? [...new Set(body.datasets.filter((d) => DATASETS.includes(d)))]
      : [];

    const fields = {};
    if (!name || name.length > 120) fields.name = 'Your name is required.';
    if (!EMAIL_RE.test(email) || email.length > 200)
      fields.email = 'A valid work email is required.';
    if (company.length > 160) fields.company = 'Company name is too long.';
    if (role && !ROLES.includes(role)) fields.role = 'Invalid role.';
    if (!useCase) fields.useCase = 'Tell us how you will use the Ezana API.';
    else if (useCase.length < 5 || useCase.length > 2000)
      fields.useCase = 'Please give a little more detail (5–2000 characters).';
    if (volume && !VOLUMES.includes(volume)) fields.volume = 'Invalid volume.';
    if (Object.keys(fields).length > 0) {
      return NextResponse.json(
        { error: 'Please fix the highlighted fields.', fields },
        { status: 400 },
      );
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Request intake is temporarily unavailable. Please email api@ezana.world.' },
        { status: 503 },
      );
    }

    try {
      const supabase = createServerSupabaseClient();
      const { error } = await supabase.from('api_access_requests').insert({
        name,
        email,
        company: company || null,
        role: role || null,
        use_case: useCase,
        datasets,
        volume: volume || null,
      });
      if (error) {
        console.error('[ezana-api/request-access] insert failed:', error.message);
        return NextResponse.json(
          { error: 'Could not save your request. Please try again or email api@ezana.world.' },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[ezana-api/request-access] error:', err);
      return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 });
    }
  },
  { requireAuth: false },
);
