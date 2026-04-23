import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/earnings — diagnostics for the earnings call analyzer (FMP + Supabase).
 * Does not expose secrets. Safe to hit when the research card misbehaves.
 */
export async function GET() {
  const checks = {
    fmp_api_key_configured: !!process.env.FMP_API_KEY,
    transcripts_table_exists: false,
    analysis_table_exists: false,
    transcripts_row_count: null,
    analysis_row_count: null,
    fmp_transcript_probe_ok: false,
    fmp_transcript_probe_status: null,
  };

  if (checks.fmp_api_key_configured) {
    try {
      const url = `https://financialmodelingprep.com/stable/earning-call-transcript?symbol=AAPL&year=2024&quarter=4&apikey=${encodeURIComponent(process.env.FMP_API_KEY)}`;
      const res = await fetch(url, { cache: 'no-store' });
      checks.fmp_transcript_probe_status = res.status;
      checks.fmp_transcript_probe_ok = res.ok;
    } catch (e) {
      checks.fmp_transcript_probe_status = `error:${e?.message || 'fetch failed'}`;
    }
  }

  const urlOk = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyOk = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (urlOk && keyOk) {
    try {
      const { count, error } = await supabaseAdmin
        .from('earnings_transcripts')
        .select('*', { count: 'exact', head: true });
      if (!error) {
        checks.transcripts_table_exists = true;
        checks.transcripts_row_count = count ?? 0;
      }
    } catch {
      /* table missing or client error */
    }

    try {
      const { count, error } = await supabaseAdmin
        .from('earnings_transcript_analysis')
        .select('*', { count: 'exact', head: true });
      if (!error) {
        checks.analysis_table_exists = true;
        checks.analysis_row_count = count ?? 0;
      }
    } catch {
      /* table missing */
    }
  }

  const healthy =
    checks.fmp_api_key_configured &&
    checks.fmp_transcript_probe_ok &&
    checks.transcripts_table_exists &&
    checks.analysis_table_exists;

  const degradedReasons = [];
  if (!checks.fmp_api_key_configured) degradedReasons.push('FMP_API_KEY missing');
  if (checks.fmp_api_key_configured && !checks.fmp_transcript_probe_ok) {
    degradedReasons.push(
      `FMP transcript probe HTTP ${checks.fmp_transcript_probe_status} — plan may exclude transcripts (402/403 common)`,
    );
  }
  if (!checks.transcripts_table_exists || !checks.analysis_table_exists) {
    degradedReasons.push('Supabase migration for earnings_transcripts / earnings_transcript_analysis not applied');
  }
  if (!urlOk || !keyOk) {
    degradedReasons.push('Supabase URL or SUPABASE_SERVICE_ROLE_KEY missing');
  }

  const status = healthy ? 'healthy' : 'degraded';

  return NextResponse.json({
    status,
    degradedReasons: healthy ? [] : degradedReasons,
    checks,
  });
}
