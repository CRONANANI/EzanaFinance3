import { SonarResearchPage } from '@/components/org/sonar/SonarResearchPage';
import { getUserClient } from '@/lib/supabase';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sonar Research | Ezana' };

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;
const KEYS = [
  'tab',
  'q',
  'status',
  'kind',
  'visibility',
  'ticker',
  'mine',
  'window',
  'pitch',
  'company',
  'question',
  'saveTo',
];

/**
 * /org-team-hub/sonar: the fund's research reports, the research form and
 * research analytics. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell).
 *
 * The tab, filters and analytics window come from the page address. A pitch
 * ("Run research" on a pitch) arrives as ?tab=research&pitch=<id>.
 * `sampleViewer` only tells the page whether to ask for sample content
 * (master admin and demo accounts); the sample route checks again.
 */
export default async function OrgSonarPage({ searchParams }) {
  const supabase = getUserClient();
  const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
  const sampleViewer = isCommunityDemoViewer(data?.user || null);
  const initial = Object.fromEntries(KEYS.map((k) => [k, one(searchParams?.[k])]));
  return <SonarResearchPage sampleViewer={sampleViewer} initial={initial} />;
}
