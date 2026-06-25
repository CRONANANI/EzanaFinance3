import { getContractAwards, formatDisplayDate } from '@/lib/usaspending';
import { GovernmentContractsDashboard } from '@/components/marketing/GovernmentContractsDashboard';
import { CONTRACT_AWARDS_SAMPLE, TOP_RECIPIENTS } from './government-sample';

/**
 * Government Activity dataset page — server component. Fetches live federal
 * contract awards from USAspending.gov at request time (ISR, ~1h) so the data
 * is in the initial HTML, and falls back to the static sample if USAspending
 * is slow / down (never blank, never a 500). The interactive search row lives
 * in the client GovernmentContractsDashboard.
 *
 * Rendered at request time (force-dynamic) so live data is in the initial HTML
 * in production. The ~1h cache is handled in the data layer: src/lib/usaspending
 * memoizes upstream USAspending calls for 1h, so request-time rendering does
 * NOT hammer the public API.
 */
export const dynamic = 'force-dynamic';

const SOURCE = {
  title: 'How we source it',
  body: [
    'Federal contract awards are pulled live from the USAspending.gov API (U.S. Department of the Treasury) — the official public record of federal spending, with no API key required. Lobbying and patent signals come from public LD-1 / LD-2 disclosure filings and patent-office publication data.',
    'Records are normalized and entity-resolved to public companies where an unambiguous match exists, so contract, lobbying, and patent signals surface in Ezana before they reach mainstream coverage. USAspending reports the recipient company name, not a stock ticker — symbols shown are our own resolution of a few large public contractors, and every unmapped recipient displays “—”.',
  ],
};

export default async function GovernmentDatasetPage() {
  const { rows, topRecipients, error } = await getContractAwards({ limit: 15 });
  const isLive = !error && rows.length > 0;

  // Fallback to the static sample (never blank). government-sample.js is left
  // untouched; we only normalize its ISO dates to the same "Mon D, YYYY"
  // display the live mapper produces so live and fallback look identical.
  const tableRows = isLive
    ? rows
    : CONTRACT_AWARDS_SAMPLE.map((r) => ({ ...r, date: formatDisplayDate(r.date) }));
  const leaders = isLive ? topRecipients : TOP_RECIPIENTS;

  return (
    <GovernmentContractsDashboard
      title="Government activity data"
      lead="The data institutions act on — federal contract awards, lobbying spend, and patent filings — entity-resolved to public companies and connected to tickers."
      rows={tableRows}
      topRecipients={leaders}
      isLive={isLive}
      highlightTitle="Top contract recipients this fiscal year"
      highlightDesc="Recipients ranked by total disclosed federal contract value this fiscal year — a read on which firms are winning government dollars right now."
      tableLink={{ href: '/datasets/government/contracts', label: 'View all contracts' }}
      source={SOURCE}
    />
  );
}
