import ContractorDossierClient from './ContractorDossierClient';
import { DatasetNotConnected, DatasetSampleGate } from '@/components/datasets/DatasetSampleGate';
import { getContractor } from '../../contractor-mock';

// Server shell for the contractor dossier: metadata from the slug, then the
// client component renders the page. The payload is invented enrichment
// (contractor-mock.js, deterministic for any slug), so only admin and demo
// accounts see it; everyone else gets the honest not-connected state.

export async function generateMetadata({ params }) {
  const c = getContractor(params.slug);
  return {
    title: `${c.name} · Contractor Dossier · Ezana Finance`,
    description: `Contractor dossier for ${c.name}. Profile figures are not connected yet.`,
  };
}

export default function ContractorDossierPage({ params }) {
  return (
    <DatasetSampleGate
      isSample
      fallback={<DatasetNotConnected name="Contractor dossier" dimension="Capitol Watch" />}
    >
      <ContractorDossierClient slug={params.slug} />
    </DatasetSampleGate>
  );
}
