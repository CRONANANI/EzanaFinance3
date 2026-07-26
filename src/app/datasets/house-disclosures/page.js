import { getHouseFilings } from '@/lib/house-disclosures-store';
import { HouseDisclosuresClient } from './HouseDisclosuresClient';

/**
 * House financial disclosures (Capitol Watch) — server-fetches the filing INDEX
 * from house_disclosure_filings (populated by ingest-house-disclosures). The
 * client falls back to a clearly-labeled sample until the ingest has run. Trade
 * detail (ticker/amount brackets) is fetched on demand from the Phase 2 tables.
 */
export const revalidate = 1800;
export const dynamic = 'force-dynamic';

export default async function HouseDisclosuresPage() {
  const filings = await getHouseFilings({ limit: 250 });
  return <HouseDisclosuresClient filings={filings} />;
}
