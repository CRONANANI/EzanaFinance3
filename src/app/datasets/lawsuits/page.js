import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

export const metadata = {
  title: 'Lawsuits and legal proceedings | Ezana',
  description: 'Class actions, litigation and legal settlements involving listed companies.',
};

/* No data source is connected yet: admin and demo accounts see the layout with
   labelled sample content, everyone else an honest empty state. */
export default function Page() {
  return <DatasetPreviewPage slug="lawsuits" />;
}
