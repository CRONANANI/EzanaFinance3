import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    // Detailed per-service breakdown is operator-only; anonymous callers get a
    // coarse status + HTTP code (enough for uptime monitors), no recon detail.
    const authed = requireAdminAccess(request, user) === null;
    const checks = { status: 'ok', timestamp: new Date().toISOString(), services: {} };

    try {
      const { data, error } = await supabaseAdmin.from('partners').select('id').limit(1);
      checks.services.database = error ? 'unhealthy' : 'healthy';
    } catch {
      checks.services.database = 'unhealthy';
    }

    try {
      const key = process.env.FINNHUB_API_KEY;
      if (key) {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${key}`);
        checks.services.finnhub = res.ok ? 'healthy' : 'unhealthy';
      } else {
        checks.services.finnhub = 'skipped';
      }
    } catch {
      checks.services.finnhub = 'unhealthy';
    }

    const healthChecks = Object.values(checks.services).filter((s) => s !== 'skipped');
    const allHealthy = healthChecks.length === 0 || healthChecks.every((s) => s === 'healthy');
    checks.status = allHealthy ? 'ok' : 'degraded';

    const httpStatus = allHealthy ? 200 : 503;
    if (!authed) {
      return NextResponse.json(
        { status: checks.status, timestamp: checks.timestamp },
        { status: httpStatus },
      );
    }
    return NextResponse.json(checks, { status: httpStatus });
  },
  { requireAuth: false },
);
