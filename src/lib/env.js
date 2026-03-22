const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const optional = [
  'FINNHUB_API_KEY',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'ALPACA_API_KEY',
  'ALPACA_API_SECRET',
  'ANTHROPIC_API_KEY',
];

export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    console.warn(`[ENV] Missing required (may cause runtime errors): ${missing.join(', ')}`);
  }

  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`[ENV] Optional env vars not set: ${missingOptional.join(', ')}`);
  }
}
