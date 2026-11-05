import SonarReportView from '@/components/org/sonar/SonarReportView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sonar report | Ezana' };

/** One org research report. RLS decides whether the viewer can read it. */
export default function OrgSonarReportPage({ params }) {
  return (
    <div className="dashboard-page-inset">
      <SonarReportView reportId={params?.reportId} />
    </div>
  );
}
