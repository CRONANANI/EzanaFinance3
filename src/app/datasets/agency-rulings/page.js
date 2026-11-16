import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

export const metadata = {
  title: 'Government agency rulings and decisions | Ezana',
  description: 'Drug approvals, environmental rulings and other major agency decisions.',
};

/* No data source is connected yet: admin and demo accounts see the layout with
   labelled sample content, everyone else an honest empty state. */
export default function Page() {
  return <DatasetPreviewPage slug="agency-rulings" />;
}
