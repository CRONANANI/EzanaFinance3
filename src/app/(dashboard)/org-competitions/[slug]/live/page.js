import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { LiveBoardClient } from '@/components/org/competitions/LiveBoardClient';

import { WorkspaceFrame, WorkspaceNotice } from '../_frame';

export const dynamic = 'force-dynamic';

export default async function CompetitionLivePage({ params }) {
  const { slug } = await params;
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member) {
    return <WorkspaceNotice>This page is for organizational members only.</WorkspaceNotice>;
  }
  const competition = await loadCompetition(supabase, slug);
  if (!competition) {
    return (
      <WorkspaceNotice>Competition not found, or you don’t have access to it.</WorkspaceNotice>
    );
  }

  return (
    <WorkspaceFrame supabase={supabase} member={member} competition={competition} active="live">
      <LiveBoardClient competition={competition} />
    </WorkspaceFrame>
  );
}
