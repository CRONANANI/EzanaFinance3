/**
 * GET /api/health: kept for existing monitors; same answer as /api/readyz
 * (database decides; providers informational; no-store; not rate limited).
 * New monitors should use /api/readyz (readiness) or /api/healthz (liveness).
 */
export { GET } from '../readyz/route';

export const dynamic = 'force-dynamic';
