import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

/* Consumer Whispers. No data source is connected yet: admin and demo accounts
   see the layout with labelled sample content, everyone else an honest empty
   state (DatasetPreviewPage). */
export default function AlternativeDatasetPage() {
  return <DatasetPreviewPage slug="alternative" />;
}
