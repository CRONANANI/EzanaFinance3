import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { loadJoinRequests } from '@/lib/competitions/onboarding';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { RequestsClient } from '@/components/org/competitions/RequestsClient';

import { WorkspaceFrame, WorkspaceNotice } from '../_frame';

export const dynamic = 'force-dynamic';

export default async function CompetitionRequestsPage({ params }) {
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
  const requests = await loadJoinRequests(supabase, competition.id);

  return (
    <WorkspaceFrame supabase={supabase} member={member} competition={competition} active="host">
      <RequestsClient
        competition={competition}
        initialRequests={requests}
        canManage={canManageCompetition(member, competition)}
      />
    </WorkspaceFrame>
  );
}
