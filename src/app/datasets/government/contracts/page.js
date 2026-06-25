import { getContractAwards, formatDisplayDate } from '@/lib/usaspending';
import { GovernmentContractsDashboard } from '@/components/marketing/GovernmentContractsDashboard';
import { CONTRACT_AWARDS_SAMPLE, TOP_RECIPIENTS } from '../government-sample';

/**
 * Dedicated Government Contracts page — a drill-down under Government Activity,
 * focused purely on federal contract awards from USAspending.gov. Server
 * component, request-time fetch, static-sample fallback — never blank, never
 * a 500. The ~1h cache lives in the data layer (src/lib/usaspending memoizes
 * upstream calls for 1h), so request-time rendering won't hammer the API.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Government contracts | Ezana',
  description:
    'Live federal contract awards sourced from the USAspending.gov API (U.S. Treasury), updated daily.',
};

const SOURCE = {
  title: 'How we source it',
  body: [
    'Every award on this page is pulled live from the USAspending.gov API (U.S. Department of the Treasury) — the official, public record of federal contract spending. No API key and no third-party aggregator: server-side calls to the spending_by_award endpoint, filtered to contract award types (A/B/C/D) for the current federal fiscal year and ranked by award amount.',
    'USAspending publishes the recipient company name, not a stock ticker. We map a small set of obvious large public contractors to their symbols; every other recipient shows “—”. We never fabricate a ticker or an amount.',
  ],
};

export default async function GovernmentContractsPage() {
  const { rows, topRecipients, error } = await getContractAwards({ limit: 25 });
  const isLive = !error && rows.length > 0;

  const tableRows = isLive
    ? rows
    : CONTRACT_AWARDS_SAMPLE.map((r) => ({ ...r, date: formatDisplayDate(r.date) }));
  const leaders = isLive ? topRecipients : TOP_RECIPIENTS;

  return (
    <GovernmentContractsDashboard
      title="Government contracts"
      lead="Federal contract awards sourced live from USAspending.gov (U.S. Department of the Treasury), updated daily. Filtered to contract award types for the current federal fiscal year and ranked by award value."
      rows={tableRows}
      topRecipients={leaders}
      isLive={isLive}
      highlightTitle="Top contract recipients this fiscal year"
      highlightDesc="Recipients ranked by total disclosed federal contract value this fiscal year."
      source={SOURCE}
    />
  );
}
