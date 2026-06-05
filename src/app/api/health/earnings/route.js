import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

function getAvKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
}

/**
 * GET /api/health/earnings — diagnostics for the earnings call analyzer.
 * Checks both FMP and Alpha Vantage, plus Supabase tables.
 */
export const GET = withApiGuard(
  async (request, user) => {
    const fmpKey = getFmpKey();
    const avKey = getAvKey();

    const checks = {
      fmp_api_key_configured: !!fmpKey,
      av_api_key_configured: !!avKey,
      transcripts_table_exists: false,
      analysis_table_exists: false,
      transcripts_row_count: null,
      analysis_row_count: null,
      fmp_transcript_probe_ok: false,
      fmp_transcript_probe_status: null,
      av_transcript_probe_ok: false,
      av_transcript_probe_status: null,
      av_transcript_probe_keys: null,
    };

    if (fmpKey) {
      try {
        const url = `https://financialmodelingprep.com/stable/earning-call-transcript?symbol=AAPL&year=2024&quarter=4&apikey=${encodeURIComponent(fmpKey)}`;
        const res = await fetch(url, { cache: 'no-store' });
        checks.fmp_transcript_probe_status = res.status;
        checks.fmp_transcript_probe_ok = res.ok;
      } catch (e) {
        checks.fmp_transcript_probe_status = `error:${e?.message || 'fetch failed'}`;
      }
    }

    if (avKey) {
      try {
        const url = `https://www.alphavantage.co/query?function=EARNINGS_CALL_TRANSCRIPT&symbol=AAPL&quarter=2024Q4&apikey=${avKey}`;
        const res = await fetch(url, { cache: 'no-store' });
        checks.av_transcript_probe_status = res.status;
        if (res.ok) {
          const data = await res.json();
          if (data?.Note || data?.Information) {
            checks.av_transcript_probe_ok = false;
            checks.av_transcript_probe_status = `rate_limited: ${(data.Note || data.Information).slice(0, 100)}`;
          } else {
            checks.av_transcript_probe_ok = true;
            checks.av_transcript_probe_keys = Object.keys(data);
          }
        }
      } catch (e) {
        checks.av_transcript_probe_status = `error:${e?.message || 'fetch failed'}`;
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
        /* table missing */
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

    const hasAnySource = checks.fmp_transcript_probe_ok || checks.av_transcript_probe_ok;
    const hasDb = checks.transcripts_table_exists && checks.analysis_table_exists;
    const healthy = hasAnySource && hasDb;

    const degradedReasons = [];
    if (!checks.fmp_api_key_configured && !checks.av_api_key_configured) {
      degradedReasons.push('Neither FMP_API_KEY nor ALPHA_VANTAGE_API_KEY is configured');
    }
    if (checks.fmp_api_key_configured && !checks.fmp_transcript_probe_ok) {
      degradedReasons.push(
        `FMP transcript probe HTTP ${checks.fmp_transcript_probe_status} — plan may exclude transcripts`,
      );
    }
    if (checks.av_api_key_configured && !checks.av_transcript_probe_ok) {
      degradedReasons.push(`AV transcript probe failed: ${checks.av_transcript_probe_status}`);
    }
    if (!checks.transcripts_table_exists || !checks.analysis_table_exists) {
      degradedReasons.push(
        'Supabase migration for earnings_transcripts / earnings_transcript_analysis not applied',
      );
    }
    if (!urlOk || !keyOk) {
      degradedReasons.push('Supabase URL or SUPABASE_SERVICE_ROLE_KEY missing');
    }

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      degradedReasons: healthy ? [] : degradedReasons,
      checks,
    });
  },
  { requireAuth: false },
);
