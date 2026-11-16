import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

export const metadata = {
  title: 'Platform community signals | Ezana',
  description: 'What Ezana members are watching and discussing, in aggregate.',
};

/* No data source is connected yet: admin and demo accounts see the layout with
   labelled sample content, everyone else an honest empty state. */
export default function Page() {
  return <DatasetPreviewPage slug="community-signals" />;
}
