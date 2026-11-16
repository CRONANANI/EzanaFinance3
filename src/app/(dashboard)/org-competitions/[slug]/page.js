import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition, loadStructure } from '@/lib/competitions/loaders';
import { loadConfig, loadDeliverables } from '@/lib/competitions/onboarding';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { isSampleSlug } from '@/lib/org-competitions-model';
import { CommandCenterClient } from '@/components/org/competitions/CommandCenterClient';
import { SampleWorkspace } from '@/components/org/competitions/SampleWorkspace';
import { WorkspaceFrame, WorkspaceNotice } from './_frame';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * The entrant's own view of an event, read through RLS: its team, the host's
 * rules, which deliverables it handed in, its slot, and its result (the
 * result row is readable only after the host reveals).
 */
async function loadEntrant(supabase, member, competition) {
  const [{ data: team }, config] = await Promise.all([
    supabase
      .from('pitch_teams')
      .select('id, team_name, ticker, side, room_id')
      .eq('competition_id', competition.id)
      .eq('org_id', member.org_id)
      .maybeSingle(),
    loadConfig(supabase, competition.id),
  ]);
  if (!team) return { team: null, config, submittedKinds: [], slot: null, result: null };
  const [deliverables, { data: room }, { data: result }] = await Promise.all([
    loadDeliverables(supabase, team.id),
    team.room_id
      ? supabase.from('pitch_rooms').select('name, starts_at').eq('id', team.room_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('pitch_results')
      .select('rank, weighted_total')
      .eq('team_id', team.id)
      .maybeSingle(),
  ]);
  return {
    team: { team_name: team.team_name, ticker: team.ticker, side: team.side },
    config,
    submittedKinds: [...new Set((deliverables || []).map((d) => d.kind))],
    slot: room ? { room: room.name, starts_at: room.starts_at } : null,
    result: competition.results_visible && result ? result : null,
  };
}

export default async function CompetitionWorkspacePage({ params, searchParams }) {
  const { slug } = await params;
  const query = (await searchParams) || {};
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member)
    return <WorkspaceNotice>This page is for organizational members only.</WorkspaceNotice>;

  /* Sample events exist only in the sample bundle (master admin and demo
     accounts). The sample route checks the viewer again. */
  if (isSampleSlug(slug)) {
    const { data } = await supabase.auth.getUser();
    if (!isCommunityDemoViewer(data?.user || null)) {
      return (
        <WorkspaceNotice>Competition not found, or you do not have access to it.</WorkspaceNotice>
      );
    }
    return <SampleWorkspace slug={slug} initialTab={one(query.tab)} />;
  }

  const competition = await loadCompetition(supabase, slug);
  if (!competition) {
    return (
      <WorkspaceNotice>Competition not found, or you do not have access to it.</WorkspaceNotice>
    );
  }
  const isHost = competition.host_org_id === member.org_id;
  const tab = one(query.tab) || 'overview';

  let structure = null;
  try {
    structure = await loadStructure(supabase, competition.id);
  } catch {
    structure = null;
  }
  const entrant = isHost
    ? null
    : await loadEntrant(supabase, member, competition).catch(() => null);
  const canManage = canManageCompetition(member, competition);

  return (
    <WorkspaceFrame
      supabase={supabase}
      member={member}
      competition={competition}
      active={
        canManage && ['structure', 'invitations', 'rubric'].includes(tab) ? 'host' : 'overview'
      }
    >
      <CommandCenterClient
        key={tab}
        initialCompetition={{ ...competition, isHost }}
        initialStructure={structure}
        canManage={canManage}
        initialTab={tab}
        entrant={entrant}
      />
    </WorkspaceFrame>
  );
}
