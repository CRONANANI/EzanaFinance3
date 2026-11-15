'use client';

/**
 * TeamHubShell: the shared frame of every Team Hub page. The sidebar on the
 * left, one full-height hairline, then the page.
 *
 *   <TeamHubShell>{children}</TeamHubShell>
 *
 * Used by the layouts of /org-team-hub (all its pages), /org-trading,
 * /org-competitions and /council-rankings. Pages render only their own body
 * and never the sidebar. The dashboard shell above already provides the
 * navigation bar's envelope (max width and side padding), so this adds none.
 *
 * Props:
 *   children  the page
 *   fade      replay a short fade when the route changes (the sidebar sits
 *             outside the faded node and never animates). Default true.
 *   sidebar   optional props passed through to TeamHubSidebar (previews and
 *             tests only; the app passes none)
 *
 * Who may see a Team Hub page is decided on the server, in each layout and
 * route. This component is presentation only.
 */

import { usePathname } from 'next/navigation';
import { TeamHubSidebar } from './TeamHubSidebar';
import './team-hub-shell.css';

export function TeamHubShell({ children, fade = true, sidebar }) {
  const pathname = usePathname();
  return (
    <div className="thub-shell">
      <TeamHubSidebar {...sidebar} />
      <div className="thub-main">
        {fade ? (
          <div key={pathname} className="thub-fade">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default TeamHubShell;
