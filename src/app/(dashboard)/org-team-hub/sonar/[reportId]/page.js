import { SonarReportPage } from '@/components/org/sonar/SonarReportPage';
import { getUserClient } from '@/lib/supabase';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sonar report | Ezana' };

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * One fund research report, at its own address (?v= opens an earlier
 * version). The row policies decide whether the viewer can read it. Sample
 * reports (ids starting "sample-") are answered from the sample bundle for
 * master admin and demo accounts only.
 */
export default async function OrgSonarReportPage({ params, searchParams }) {
  const supabase = getUserClient();
  const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
  return (
    <SonarReportPage
      reportId={params?.reportId}
      sampleViewer={isCommunityDemoViewer(data?.user || null)}
      initialVersion={one(searchParams?.v)}
    />
  );
}
