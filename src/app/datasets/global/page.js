import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

/* Global events and macro. No data source is connected yet: admin and demo
   accounts see the layout with labelled sample content, everyone else an
   honest empty state (DatasetPreviewPage). */
export default function GlobalDatasetPage() {
  return <DatasetPreviewPage slug="global" />;
}
