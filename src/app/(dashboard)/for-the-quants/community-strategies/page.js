import Link from 'next/link';
import { getUserClient } from '@/lib/supabase';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { QuantSection } from '@/components/quants/shell/QuantLabShell';
import LeaderboardSample from './LeaderboardSample';

export const dynamic = 'force-dynamic';

/**
 * The strategy leaderboard. There is no real one yet: Quant Lab strategies
 * are private to their author and none has a shared, verified track record
 * to rank. Everyone sees that, in one line. Master admin and demo accounts
 * (checked on the verified session) also see the illustrative rows, labelled
 * Sample content, so the page can be presented.
 */
export default async function CommunityStrategiesPage() {
  let sampleViewer = false;
  try {
    const { data } = await getUserClient().auth.getUser();
    sampleViewer = isCommunityDemoViewer(data?.user || null);
  } catch {
    sampleViewer = false;
  }
  return (
    <QuantSection
      title="Strategy leaderboard"
      actions={sampleViewer ? <span className="qlx-sub">Sample content</span> : null}
    >
      {sampleViewer ? (
        <LeaderboardSample />
      ) : (
        <p className="qlx-empty">
          No leaderboard yet: strategies are private to their author, so there is nothing shared to
          rank.{' '}
          <Link className="qlx-link" href="/for-the-quants/strategy-lab">
            Open Strategy Lab
          </Link>
        </p>
      )}
    </QuantSection>
  );
}
