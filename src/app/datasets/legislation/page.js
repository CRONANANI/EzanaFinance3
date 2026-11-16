import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

export const metadata = {
  title: 'New laws and policy legislation | Ezana',
  description: 'Congressional bills, new legislation and policy changes.',
};

/* No data source is connected yet: admin and demo accounts see the layout with
   labelled sample content, everyone else an honest empty state. */
export default function Page() {
  return <DatasetPreviewPage slug="legislation" />;
}
