import { Suspense } from 'react';
import SonarWorkspace from '@/components/org/sonar/SonarWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sonar Research | Ezana' };

/** Sonar for organizations: the fund's research reports and runs. Access is
    gated by the org-team-hub layout (active org members only). */
export default function OrgSonarPage() {
  return (
    <div className="dashboard-page-inset">
      <Suspense fallback={null}>
        <SonarWorkspace />
      </Suspense>
    </div>
  );
}
