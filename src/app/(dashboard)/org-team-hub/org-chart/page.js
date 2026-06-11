import { OrgChartClient } from './OrgChartClient';

export const metadata = {
  title: 'Organization Chart | Ezana Finance',
  description:
    'Per-university investment council org chart with term tracking, sector coverage, and faculty advisor oversight.',
};

export default function OrgChartPage() {
  return <OrgChartClient />;
}
