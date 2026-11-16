import DatasetPreviewPage from '@/components/datasets/DatasetPreviewPage';

export const metadata = {
  title: 'Regulatory investigations and enforcement | Ezana',
  description: 'Enforcement actions and investigations by federal regulators.',
};

/* No data source is connected yet: admin and demo accounts see the layout with
   labelled sample content, everyone else an honest empty state. */
export default function Page() {
  return <DatasetPreviewPage slug="enforcement" />;
}
