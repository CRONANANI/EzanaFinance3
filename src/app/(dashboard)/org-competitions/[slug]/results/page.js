import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { ResultsClient } from '@/components/org/competitions/ResultsClient';

import { WorkspaceFrame, WorkspaceNotice } from '../_frame';

export const dynamic = 'force-dynamic';

export default async function CompetitionResultsPage({ params }) {
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
    <WorkspaceFrame supabase={supabase} member={member} competition={competition} active="results">
      <ResultsClient competition={competition} isHost={canManageCompetition(member, competition)} />
    </WorkspaceFrame>
  );
}
