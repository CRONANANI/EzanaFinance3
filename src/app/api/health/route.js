import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export async function GET() {
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

  return NextResponse.json(checks, { status: allHealthy ? 200 : 503 });
}
