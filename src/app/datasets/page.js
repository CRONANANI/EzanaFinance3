import DatasetsSonarIndex from './DatasetsSonarIndex';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Datasets | Ezana',
  description:
    'Seven dimensions of public data, every dataset sourced and attributed, all of it feeding Ezana Sonar: congressional trades, federal contracts, SEC filings, patents, macro data and more.',
};

export default function DatasetsIndexPage({ searchParams }) {
  return <DatasetsSonarIndex searchParams={searchParams} />;
}
