import { WorkspaceHeader } from '@/components/org/competitions/WorkspaceHeader';
import { loadCompetitions } from '@/lib/competitions/loaders';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { workspaceTabs } from '@/lib/org-competitions-model';
import '@/components/org/command-center/command-center.css';
import '@/components/org/competitions/competitions.css';
import '@/styles/home-canvas.css';

/**
 * The frame every sub-page of one event shares: the page root on the canvas
 * and the workspace head (back link, event name, stage, role, Switch event,
 * text tabs). Reads only what the member can already read (RLS): the
 * council's own events, for the Switch event menu.
 *
 * `visitor` is for a council that has not entered the event yet (the join
 * page): it gets the Entry rules tab only, since the other tabs are for
 * entrants.
 */
export async function WorkspaceFrame({
  supabase,
  member,
  competition,
  active,
  visitor = false,
  children,
}) {
  const isHost = competition.host_org_id === member.org_id;
  const canManage = canManageCompetition(member, competition);
  let events = [];
  try {
    events = (await loadCompetitions(supabase, member.org_id))
      .filter((c) => c.status !== 'archived')
      .map((c) => ({ slug: c.slug, name: c.name }));
  } catch {
    events = [];
  }
  const tabs = visitor
    ? [{ key: 'rules', label: 'Entry rules', href: `/org-competitions/${competition.slug}/join` }]
    : workspaceTabs({ slug: competition.slug, isHost, canManage });
  const roleLabel = isHost
    ? canManage
      ? 'Host'
      : 'Host council, read only'
    : visitor
      ? null
      : 'Entrant';

  return (
    <div className="dashboard-page-inset ez-canvas pcx-page">
      <WorkspaceHeader
        name={competition.name}
        status={competition.status}
        roleLabel={roleLabel}
        tabs={tabs}
        active={active}
        events={events}
        currentSlug={competition.slug}
      />
      <div className="pcx-ws__body">{children}</div>
    </div>
  );
}

/** A one-line notice in the page root, for not found and members only. */
export function WorkspaceNotice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas pcx-page">
      <p className="pcx-empty-page">{children}</p>
    </div>
  );
}
