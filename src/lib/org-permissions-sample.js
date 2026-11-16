/**
 * Sample content for Team Permissions (/org-team-hub/permissions).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/permissions/sample, so the page can be reviewed and presented
 * from a council with few members. Real councils never receive it, and the
 * page labels it "Sample content" while it shows. Nothing here is read from
 * or written to the database: a grant or revoke made while it shows is
 * checked by the same rules the server uses and stays on the page.
 *
 * It is the same sample council every rebuilt Team Hub page shows: the nine
 * invented members, the four sector teams and the reporting lines of the Org
 * chart sample (analysts report to their team's portfolio manager, portfolio
 * managers to an executive viewer or else to the senior portfolio manager).
 * Members, ranks and reporting lines are taken from that bundle, never typed
 * again. What this file adds is the stored extras and a few viewpoints, so
 * the page can be previewed as a portfolio manager, a senior portfolio
 * manager and an analyst (view only).
 *
 * Pure: no React, no fetch, no server imports. Every payload carries is_demo.
 */
import { buildOrgChartSample } from './org-chart-sample.js';
import { buildPayload, roleLabel } from './org-permissions-model.js';

const DAY = 86400000;
const memberOf = (n) => `sample-member-${String(n).padStart(3, '0')}`;

/* [member number, right, granted by (member number or 'manager'), days ago] */
const EXTRAS = [
  [1, 'manage_positions', 4, 33], // Amara Tesfaye, by Chidi Okoye
  [1, 'flag_positions', 4, 61], // granted before her promotion to senior analyst
  [2, 'flag_positions', 5, 19], // Mikael Bekele, by Ingrid Lindqvist
  [9, 'send_to_team', 5, 12], // Tomas Alvarez, by Ingrid Lindqvist
  [9, 'view_team_analytics', 3, 70], // by Selam Haile, before Tomas moved teams
  [7, 'approve_deliverables', 3, 26], // Elena Rossi, by Selam Haile
  [6, 'create_events', 'manager', 21], // Daniel Park, by his manager
];

/* Viewpoints offered by "Preview as", besides the viewer's own. */
const PREVIEWS = [
  [5, 'Ingrid Lindqvist, portfolio manager'],
  [3, 'Selam Haile, senior portfolio manager'],
  [2, 'Mikael Bekele, analyst (view only)'],
];

/**
 * @param {{ userId?: string, memberId?: string, role: string, tier?: string,
 *           displayName?: string, title?: string, subRole?: string, now?: number }} viewer
 */
export function buildPermissionsSample(viewer) {
  const now = viewer.now ?? Date.now();
  const { chart } = buildOrgChartSample({ ...viewer, now });
  const me = chart.viewer?.id || viewer.memberId || 'sample-member-me';
  const people = chart.members.map((m) => ({
    id: m.id,
    user_id: m.user_id || null,
    org_id: 'sample',
    display_name: m.display_name,
    role: m.role,
    sub_role: m.sub_role || null,
    tier: m.tier || null,
    title: m.id === me ? viewer.title || null : null,
    reports_to: m.reports_to || null,
    is_active: true,
  }));
  const byId = new Map(people.map((p) => [p.id, p]));
  const names = new Map(people.map((p) => [p.id, p.display_name]));

  const iso = (days) => new Date(now - days * DAY).toISOString();
  const extraRows = EXTRAS.map(([n, key, by, days]) => {
    const id = memberOf(n);
    const grantor = by === 'manager' ? byId.get(id)?.reports_to : memberOf(by);
    return {
      org_member_id: id,
      permission_key: key,
      granted_by: grantor || null,
      granted_at: iso(days),
    };
  }).filter((r) => byId.has(r.org_member_id));

  const payloadFor = (viewerRow) => {
    const reports = people.filter((p) => p.reports_to === viewerRow.id && p.id !== me);
    const ids = new Set(reports.map((r) => r.id));
    return {
      ...buildPayload({
        viewer: viewerRow,
        viewerExtraRows: extraRows.filter((r) => r.org_member_id === viewerRow.id),
        reports,
        extraRows: extraRows.filter((r) => ids.has(r.org_member_id)),
        names,
      }),
      is_demo: true,
    };
  };

  const meRow = byId.get(me);
  const views = [];
  if (meRow) views.push({ key: 'me', label: `You, ${roleLabel(meRow).toLowerCase()}` });
  for (const [n, label] of PREVIEWS)
    if (byId.has(memberOf(n))) views.push({ key: memberOf(n), label });

  const payloads = {};
  for (const v of views) payloads[v.key] = payloadFor(v.key === 'me' ? meRow : byId.get(v.key));

  /* Start on the viewer's own view when someone reports to them, otherwise
     on the portfolio manager preview. */
  const initial =
    payloads.me && payloads.me.reports.length ? 'me' : views.find((v) => v.key !== 'me')?.key;

  return { views, payloads, initial: initial || 'me', is_demo: true };
}
