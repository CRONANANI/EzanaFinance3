import { getInstitutionalOverview } from '@/lib/titans/store';
import { usd, int, quarterShort } from '@/lib/titans/format';
import InstitutionalClient from './InstitutionalClient';

/**
 * Institutional holdings (13F). Server component: loads the latest complete
 * quarter's overview (filers ranked by reported value, most widely held
 * securities, largest new positions) and hands plain rows to the client
 * dashboard. Empty overview -> honest empty states; the sample rows render
 * only under NEXT_PUBLIC_ALLOW_SAMPLE_DATA in local development.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Institutional holdings (13F) | Ezana',
  description:
    'Quarterly Form 13F-HR holdings from SEC EDGAR: the largest managers, the most widely held securities and the biggest new positions.',
};

export default async function InstitutionalDatasetPage() {
  let overview = null;
  try {
    overview = await getInstitutionalOverview();
  } catch (e) {
    console.error('[titans] institutional overview:', e?.message || e);
  }

  const q = overview ? quarterShort(overview.quarter) : null;
  const filers = (overview?.topFilers || []).map((r, i) => ({
    id: `f-${r.cik || i}`,
    awardId: r.cik, // makes the row open the fund's holdings
    cik: r.cik,
    fund: r.filer || r.cik,
    positions: int(r.positions),
    value: usd(r.valueUsd),
    quarter: q,
  }));
  const widely = (overview?.widelyHeld || []).map((r, i) => ({
    id: `w-${r.cusip || i}`,
    ticker: r.ticker,
    issuer: r.issuer,
    holders: int(r.holders),
    value: usd(r.valueUsd),
    shares: int(r.shares),
    quarter: q,
  }));
  const newPositions = (overview?.newPositions || []).slice(0, 8).map((r) => ({
    name: r.filer || r.cik,
    meta: `${r.ticker || r.issuer || 'Unmapped security'} · new position`,
    value: usd(r.valueUsd),
    tone: 'pos',
  }));

  return (
    <InstitutionalClient
      quarterLabel={overview?.quarterLabel || null}
      stats={
        overview
          ? {
              filers: int(overview.filers),
              withPrior: int(overview.filersWithPrior),
              holdings: int(overview.holdings),
              value: usd(overview.totalValueUsd),
            }
          : null
      }
      filers={filers}
      widely={widely}
      newPositions={newPositions}
    />
  );
}
