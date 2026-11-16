import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { ScoreboardClient } from '@/components/org/competitions/ScoreboardClient';

import { WorkspaceFrame, WorkspaceNotice } from '../_frame';

export const dynamic = 'force-dynamic';

export default async function CompetitionScoreboardPage({ params }) {
  const { slug } = await params;
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member) {
    return <WorkspaceNotice>This page is for organizational members only.</WorkspaceNotice>;
  }
  const competition = await loadCompetition(supabase, slug);
  if (!competition || !canManageCompetition(member, competition)) {
    return (
      <WorkspaceNotice>The scoreboard is only visible to the host organizers.</WorkspaceNotice>
    );
  }

  return (
    <WorkspaceFrame supabase={supabase} member={member} competition={competition} active="host">
      <ScoreboardClient competition={competition} />
    </WorkspaceFrame>
  );
}
