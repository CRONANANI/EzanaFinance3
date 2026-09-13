import ContractorDossierClient from './ContractorDossierClient';
import { getContractor } from '../../contractor-mock';

// Server shell for the contractor dossier: metadata from the slug, then the
// client component renders the page (payload resolves deterministically, so
// any slug produces a dossier).

export async function generateMetadata({ params }) {
  const c = getContractor(params.slug);
  return {
    title: `${c.name} · Contractor Dossier · Ezana Finance`,
    description: `Federal contracting dossier for ${c.name}: obligations history, agency mix, market context, and congressional activity.`,
  };
}

export default function ContractorDossierPage({ params }) {
  return <ContractorDossierClient slug={params.slug} />;
}
