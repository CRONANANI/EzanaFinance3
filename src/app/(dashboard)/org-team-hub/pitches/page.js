import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadPitchBoard } from '@/lib/org-pitch-api-helpers';
import { PitchPipelineClient } from '@/components/org/pitches/PitchPipelineClient';
import '../team-hub.css';
import '../org-pitches.css';
import './pitch-workspace.css';

export const dynamic = 'force-dynamic';

export default async function OrgPitchPipelinePage() {
  // Server-render the initial kanban board so first paint has data (no
  // post-hydration fetch waterfall). The client keeps its own refetch path as
  // the fallback + refresh mechanism — see PitchWorkspace.
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  const initialBoard = member
    ? await loadPitchBoard(supabase, member.org_id, { view: 'kanban' })
    : null;

  return <PitchPipelineClient initialBoard={initialBoard} />;
}
