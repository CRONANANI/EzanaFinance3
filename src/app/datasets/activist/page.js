import { getActivistStakes } from '@/lib/titans/store';
import { int, pct, shortDate } from '@/lib/titans/format';
import ActivistClient from './ActivistClient';

/**
 * Activist & block positions (Schedule 13D / 13G). Server component: loads the
 * newest parsed stakes and hands plain rows to the client dashboard. Empty ->
 * honest empty state; samples only under NEXT_PUBLIC_ALLOW_SAMPLE_DATA in
 * local development.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Activist and block positions (Schedule 13D/13G) | Ezana',
  description:
    'Schedule 13D and 13G filings from SEC EDGAR: who crossed 5% of which company, with the reported stake.',
};

const FORM_LABEL = { '13D': 'Schedule 13D', '13G': 'Schedule 13G' };

export default async function ActivistDatasetPage() {
  let stakes = [];
  try {
    stakes = await getActivistStakes({ limit: 150 });
  } catch (e) {
    console.error('[titans] activist stakes:', e?.message || e);
  }
  const rows = stakes.map((s) => ({
    id: s.accessionNo,
    filer: s.filer || 'Unknown filer',
    ticker: s.ticker,
    subject: s.subject,
    form: `${FORM_LABEL[s.form] || 'Schedule 13D/13G'}${s.isAmendment ? '/A' : ''}`,
    percent: pct(s.percentOfClass),
    shares: int(s.shares),
    eventDate: shortDate(s.eventDate),
    date: shortDate(s.filedAt),
    href: s.href,
  }));
  return <ActivistClient rows={rows} />;
}
