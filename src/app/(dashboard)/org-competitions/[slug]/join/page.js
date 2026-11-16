import { notFound } from 'next/navigation';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadConfig } from '@/lib/competitions/onboarding';
import { JoinClient } from '@/components/org/competitions/JoinClient';

import { WorkspaceFrame, WorkspaceNotice } from '../_frame';

export const dynamic = 'force-dynamic';

export default async function CompetitionJoinPage({ params }) {
  const { slug } = await params;
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member) {
    return <WorkspaceNotice>This page is for organizational members only.</WorkspaceNotice>;
  }

  // A not-yet-joined org can't read the competition under RLS, so load the public
  // shape + config via admin; the join API enforces every rule server-side.
  const admin = getAdminClient();
  const { data: competition } = await admin
    .from('pitch_competitions')
    .select('id, host_org_id, name, slug, theme, status')
    .eq('slug', slug)
    .maybeSingle();
  if (!competition) {
    return <WorkspaceNotice>Competition not found.</WorkspaceNotice>;
  }
  // A draft is unpublished: only its host org may see it (ORG-13).
  if (competition.status === 'draft' && competition.host_org_id !== member.org_id) notFound();

  const config = await loadConfig(admin, competition.id);
  const [{ count: myTeams }, { count: myPending }] = await Promise.all([
    admin
      .from('pitch_teams')
      .select('id', { count: 'exact', head: true })
      .eq('competition_id', competition.id)
      .eq('org_id', member.org_id),
    admin
      .from('pitch_join_requests')
      .select('id', { count: 'exact', head: true })
      .eq('competition_id', competition.id)
      .eq('org_id', member.org_id)
      .eq('status', 'pending'),
  ]);

  const isHost = competition.host_org_id === member.org_id;
  const alreadyEntered = (myTeams || 0) > 0;
  return (
    <WorkspaceFrame
      supabase={supabase}
      member={member}
      competition={competition}
      active="rules"
      visitor={!isHost && !alreadyEntered}
    >
      <JoinClient
        competition={competition}
        config={config}
        isHost={isHost}
        alreadyEntered={alreadyEntered}
        hasPending={(myPending || 0) > 0}
      />
    </WorkspaceFrame>
  );
}
