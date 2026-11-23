import DatasetsSonarIndex from './DatasetsSonarIndex';
import { BRAND_COPY } from '@/lib/brand';

export const dynamic = 'force-dynamic';

/* This route is Ezana Sonar's public home (the Ping field leads the page) and the index of
   the datasets behind it (Nov 23, 2026 positioning). */
export const metadata = {
  title: BRAND_COPY.sonar.title,
  description: BRAND_COPY.sonar.description,
  openGraph: {
    type: 'website',
    url: '/datasets',
    title: BRAND_COPY.sonar.title,
    description: BRAND_COPY.sonar.description,
    images: [{ url: '/og/ezana-share.png', width: 1200, height: 630, alt: 'Ezana Sonar' }],
  },
};

export default function DatasetsIndexPage({ searchParams }) {
  return <DatasetsSonarIndex searchParams={searchParams} />;
}
