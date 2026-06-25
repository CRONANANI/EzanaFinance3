import { formatDisplayDate } from '@/lib/usaspending';
import { getContractAwardsWithFallback, contractFreshnessNote } from '@/lib/usaspending-store';
import { GovernmentContractsDashboard } from '@/components/marketing/GovernmentContractsDashboard';
import { CONTRACT_AWARDS_SAMPLE, TOP_RECIPIENTS } from '../government-sample';

/**
 * Dedicated Government Contracts page — a drill-down under Government Activity,
 * focused purely on federal contract awards.
 *
 * Data source order: hosted Supabase (daily ingest cron) → live USAspending
 * API → static sample. Reading from Supabase is fast, rate-limit-free, and the
 * normal path; the live API and sample are fallbacks so the page is never blank
 * and never shows fabricated data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Government contracts | Ezana',
  description:
    'Federal contract awards sourced from USAspending.gov (U.S. Treasury), synced daily into Ezana.',
};

const SOURCE = {
  title: 'How we source it',
  body: [
    'Every award on this page is federal contract data from USAspending.gov (U.S. Department of the Treasury) — the official, public record of federal contract spending. No API key and no third-party aggregator: a scheduled job ingests the current federal fiscal year’s contract awards (types A/B/C/D) into Ezana and the page reads from there, with the live USAspending API as a fallback.',
    'USAspending publishes the recipient company name, not a stock ticker. We map a small set of obvious large public contractors to their symbols; every other recipient shows “—”. We never fabricate a ticker or an amount, and every award is validated (real amount, recent date) before it is stored.',
  ],
};

export default async function GovernmentContractsPage() {
  const { rows, topRecipients, source, syncedAt } = await getContractAwardsWithFallback({
    limit: 25,
  });

  // Final fallback: the vetted static sample (never blank). government-sample.js
  // is left untouched; we only normalize its ISO dates to the display format.
  const usingSample = source === null;
  const tableRows = usingSample
    ? CONTRACT_AWARDS_SAMPLE.map((r) => ({ ...r, date: formatDisplayDate(r.date) }))
    : rows;
  const leaders = usingSample ? TOP_RECIPIENTS : topRecipients;

  return (
    <GovernmentContractsDashboard
      title="Government contracts"
      lead="Federal contract awards sourced from USAspending.gov (U.S. Department of the Treasury). Filtered to contract award types for the current federal fiscal year and ranked by award value."
      rows={tableRows}
      topRecipients={leaders}
      isLive={!usingSample}
      note={contractFreshnessNote(source ?? 'sample', syncedAt)}
      highlightTitle="Top contract recipients this fiscal year"
      highlightDesc="Recipients ranked by total disclosed federal contract value this fiscal year."
      source={SOURCE}
    />
  );
}
