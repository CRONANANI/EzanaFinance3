// Boot-critical: the app cannot render at all without these. Missing one fails
// fast at runtime in production (but never blocks the build collection phase).
const bootCritical = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// Runtime-feature: needed only at request time by specific routes (not to boot
// or build the app). These warn here and fail fast at the point of use — e.g.
// token-cipher.js throws "TOKEN_ENCRYPTION_KEY is not set" when a SnapTrade /
// Plaid route actually tries to encrypt/decrypt. They must NEVER break the build.
const runtimeFeature = [
  'TOKEN_ENCRYPTION_KEY', // brokerage token encryption (SnapTrade / Plaid)
];

const optional = [
  'FINNHUB_API_KEY',
  'ALPHA_VANTAGE_API_KEY',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'ALPACA_API_KEY',
  'ALPACA_API_SECRET',
  'ANTHROPIC_API_KEY',
];

export function validateEnv() {
  // Next.js sets this during `next build` page-data collection. A runtime secret
  // that isn't set yet must not abort the build of the whole app.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  const missingCritical = bootCritical.filter((key) => !process.env[key]);
  if (missingCritical.length > 0) {
    if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
      throw new Error(`Missing required environment variables: ${missingCritical.join(', ')}`);
    }
    console.warn(`[ENV] Missing boot-critical: ${missingCritical.join(', ')}`);
  }

  const missingRuntime = runtimeFeature.filter((key) => !process.env[key]);
  if (missingRuntime.length > 0) {
    // Warn only — these fail fast at the point of use, not at boot/build.
    console.warn(
      `[ENV] Missing runtime-feature vars (features needing them will error until set): ${missingRuntime.join(', ')}`,
    );
  }

  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`[ENV] Optional env vars not set: ${missingOptional.join(', ')}`);
  }
}
