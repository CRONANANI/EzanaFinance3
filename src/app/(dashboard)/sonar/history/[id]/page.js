import PastRunClient from '@/components/sonar/workspace-pages/PastRunClient';

/** One of the reader's past research runs (Sonar research workspace, Nov 13 2026). */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Research run | Sonar | Ezana' };

export default function SonarPastRunPage({ params }) {
  return <PastRunClient id={String(params?.id || '')} />;
}
