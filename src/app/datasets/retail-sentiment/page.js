import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

export const metadata = {
  title: 'Retail sentiment | Ezana',
  description: 'Investor discussion and social activity around listed companies.',
};

/* No data source is connected yet: admin and demo accounts see the layout with
   labelled sample content, everyone else an honest empty state. */
export default function Page() {
  return <DatasetPreviewPage slug="retail-sentiment" />;
}
