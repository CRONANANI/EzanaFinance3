import HistoryClient from '@/components/sonar/workspace-pages/HistoryClient';

/** Research history (Sonar research workspace, Nov 13 2026). */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Research history | Sonar | Ezana' };

export default function SonarHistoryPage() {
  return <HistoryClient />;
}
