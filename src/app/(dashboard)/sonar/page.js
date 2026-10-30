import DatasetsSonarIndex from '@/app/datasets/DatasetsSonarIndex';
import '@/app/datasets/ds-canvas.css';
import '@/app/datasets/ds-align.css';
/* ds-cards.css styles the index's .dso-dimcard shells under .ds-shell (no
   outline, no halo), exactly as on /datasets. */
import '@/app/datasets/ds-cards.css';

/** Ezana Sonar for signed-in users: the same Sonar as /datasets (hero, stage,
    dimension cards, band results), inside the app shell. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Sonar | Ezana' };

export default function SonarPage({ searchParams }) {
  return (
    <div className="ds-shell ds-shell--search ds-shell--in-app" data-nav-theme="datasets">
      <DatasetsSonarIndex searchParams={searchParams} stage="app" />
    </div>
  );
}
