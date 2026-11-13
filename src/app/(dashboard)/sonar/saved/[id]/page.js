import SavedItemClient from '@/components/sonar/workspace-pages/SavedItemClient';

/** A saved answer, read-only (Sonar research workspace, Nov 13 2026). */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Saved research | Sonar | Ezana' };

export default function SonarSavedItemPage({ params }) {
  return <SavedItemClient id={String(params?.id || '')} />;
}
