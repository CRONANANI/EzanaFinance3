import { getExecCompTable } from '@/lib/titans/store';
import ExecCompClient from './ExecCompClient';

/**
 * Executive Compensation (pay versus performance). Server component: the
 * latest fiscal year per company from proxy XBRL; details load per company.
 * No sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Executive compensation | Ezana',
  description:
    'CEO pay, compensation actually paid and shareholder return from the pay versus performance tables in company proxy statements, via SEC EDGAR XBRL.',
};

export default async function ExecCompPage() {
  let rows = [];
  try {
    rows = await getExecCompTable();
  } catch (e) {
    console.error('[titans] exec comp:', e?.message || e);
  }
  return <ExecCompClient rows={rows} />;
}
