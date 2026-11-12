import { QuantSection } from '@/components/quants/shell/QuantLabShell';
import { EventStudyCard } from '@/components/quants/lab/EventStudyCard';
import { DatasetRegistryCard } from '@/components/quants/DatasetRegistryCard';

export const metadata = { title: 'Datasets & Research | Quant Lab | Ezana' };

export default function DatasetsResearchPage() {
  return (
    <>
      <EventStudyCard />
      {/* The registry still lists illustrative figures. It is replaced by
          measured coverage when the dataset inventory is built. */}
      <QuantSection title="Dataset registry" actions={<span className="qlx-tag">Sample data</span>}>
        <DatasetRegistryCard />
      </QuantSection>
    </>
  );
}
