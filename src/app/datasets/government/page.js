import { formatDisplayDate } from '@/lib/usaspending';
import { getContractAwardsWithFallback, contractFreshnessNote } from '@/lib/usaspending-store';
import { GovernmentContractsDashboard } from '@/components/marketing/GovernmentContractsDashboard';
import { CONTRACT_AWARDS_SAMPLE, TOP_RECIPIENTS } from './government-sample';

/**
 * Government Activity dataset page — server component.
 *
 * Reads federal contract awards hosted in Supabase (populated by the daily
 * ingest cron) → live USAspending API → static sample, so the page is fast and
 * never blank. The interactive search row lives in the client
 * GovernmentContractsDashboard.
 */
export const dynamic = 'force-dynamic';

const SOURCE = {
  title: 'How we source it',
  body: [
    'Federal contract awards come from the USAspending.gov API (U.S. Department of the Treasury) — the official public record of federal spending, with no API key required. A scheduled job syncs the current fiscal year’s contract awards into Ezana, and the page reads from there (with the live API as a fallback). Lobbying and patent signals come from public LD-1 / LD-2 disclosure filings and patent-office publication data.',
    'Records are normalized and entity-resolved to public companies where an unambiguous match exists. USAspending reports the recipient company name, not a stock ticker — symbols shown are our own resolution of a few large public contractors, and every unmapped recipient displays “—”.',
  ],
};

export default async function GovernmentDatasetPage() {
  const { rows, topRecipients, source, syncedAt } = await getContractAwardsWithFallback({
    limit: 15,
  });

  // Final fallback to the vetted static sample (never blank). government-sample.js
  // is left untouched; we only normalize its ISO dates to the display format.
  const usingSample = source === null;
  const tableRows = usingSample
    ? CONTRACT_AWARDS_SAMPLE.map((r) => ({ ...r, date: formatDisplayDate(r.date) }))
    : rows;
  const leaders = usingSample ? TOP_RECIPIENTS : topRecipients;

  return (
    <GovernmentContractsDashboard
      title="Government activity data"
      lead="The data institutions act on — federal contract awards, lobbying spend, and patent filings — entity-resolved to public companies and connected to tickers."
      rows={tableRows}
      topRecipients={leaders}
      isLive={!usingSample}
      note={contractFreshnessNote(source ?? 'sample', syncedAt)}
      highlightTitle="Top contract recipients this fiscal year"
      highlightDesc="Recipients ranked by total disclosed federal contract value this fiscal year — a read on which firms are winning government dollars right now."
      tableLink={{ href: '/datasets/government/contracts', label: 'View all contracts' }}
      source={SOURCE}
    />
  );
}
