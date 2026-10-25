/**
 * GET /api/healthz: liveness. No dependencies: answers 200 whenever the
 * function can run. Not rate limited, never cached.
 */
import { NextResponse } from 'next/server';
import { NO_STORE } from '@/lib/health/readiness';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { headers: NO_STORE },
  );
}
