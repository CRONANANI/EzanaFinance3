/**
 * Sonar Companion: typed page context (Nov 28 2026).
 *
 * Each Ezana page is described by a small structured descriptor, never by scraping the page:
 *
 *   { pageType, workspace: 'personal' | 'organization', entity?: { type, id, symbol? },
 *     organizationId?, objectId?, availableActions: string[], contextVersion }
 *
 * The descriptor comes from the route (contextFromRoute) and, where a page knows more (the
 * selected security, the open pitch), from the page itself (useSonarPageContext merges it).
 * It is a hint for suggestions and for what the reader may choose to include. It is never
 * authorization: the server resolves and checks every organization, entity and object again
 * before any of it is used in research.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-companion.mjs.
 */

export const CONTEXT_VERSION = 'companion-context-v1';

const TICKER = /^[A-Z]{1,5}(?:\.[A-Z])?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sym = (v) => {
  const s = String(v || '')
    .toUpperCase()
    .trim();
  return TICKER.test(s) ? s : null;
};

const PERSONAL = [
  [/^\/(home|home-dashboard|dashboard)(\/|$)/, 'portfolio'],
  [/^\/company-research(\/|$)/, 'company'],
  [/^\/watchlist(\/|$)/, 'watchlist'],
  [/^\/(trading|terminal)(\/|$)/, 'trading'],
  [/^\/for-the-quants(\/|$)/, 'quant'],
  [/^\/(market-analysis|inside-the-capitol|alternative-markets|betting-markets)(\/|$)/, 'market'],
  [/^\/ezana-echo(\/|$)/, 'echo'],
];
const ORG = [
  [/^\/org-team-hub\/pitch/, 'org_pitch'],
  [/^\/org-team-hub\/(research|library)/, 'org_research'],
  [/^\/org-team-hub\/(fund|analytics|portfolio)/, 'org_fund'],
  [/^\/org-team-hub\/meetings?/, 'org_meeting'],
  [/^\/org-team-hub\/assignments?/, 'org_assignment'],
  [/^\/org-team-hub\/(compliance|ips)/, 'org_compliance'],
  [/^\/org-team-hub\/sonar/, 'org_sonar'],
  [/^\/org-(team-hub|trading)/, 'org_home'],
];

/** Routes where the full Sonar workspace is already on screen; the launcher steps aside. */
export const FULL_SONAR = /^\/sonar(\/|$)/;

/**
 * The route's descriptor. `params` is a plain object of search params; `org` is the active
 * membership the client knows ({ orgId } or null).
 */
export function contextFromRoute(pathname = '/', params = {}, { org = null } = {}) {
  const path = String(pathname || '/');
  const org_match = ORG.find(([re]) => re.test(path));
  const personal = PERSONAL.find(([re]) => re.test(path));
  const ticker = sym(
    params.ticker ||
      params.symbol ||
      params.t ||
      (path.match(/\/company-research\/([A-Za-z.]{1,6})(?:\/|$)/) || [])[1],
  );
  const objectId =
    [params.pitch, params.pitchId, params.report, params.reportId, params.meeting, params.id].find(
      (v) => UUID.test(String(v || '')),
    ) || null;
  if (org_match && org?.orgId) {
    return {
      pageType: org_match[1],
      workspace: 'organization',
      organizationId: org.orgId,
      entity: ticker ? { type: 'security', id: ticker, symbol: ticker } : undefined,
      objectId,
      availableActions: [],
      contextVersion: CONTEXT_VERSION,
    };
  }
  return {
    pageType: personal ? personal[1] : 'other',
    workspace: 'personal',
    entity: ticker ? { type: 'security', id: ticker, symbol: ticker } : undefined,
    objectId: null,
    availableActions: [],
    contextVersion: CONTEXT_VERSION,
  };
}

/**
 * Merge what a page registered (useSonarPageContext) over the route descriptor. A page can
 * add an entity, an object id and actions; it cannot move a personal page into an
 * organization, or point at another organization.
 */
export function mergeContext(route, page) {
  if (!page || typeof page !== 'object') return route;
  const entity =
    page.entity && page.entity.id
      ? {
          type: String(page.entity.type || 'security'),
          id: String(page.entity.id),
          symbol: sym(page.entity.symbol) || undefined,
        }
      : route.entity;
  return {
    ...route,
    pageType: page.pageType ? String(page.pageType) : route.pageType,
    entity,
    objectId:
      page.objectId && UUID.test(String(page.objectId)) ? String(page.objectId) : route.objectId,
    availableActions: Array.isArray(page.availableActions)
      ? page.availableActions.map(String).slice(0, 12)
      : route.availableActions,
  };
}

/**
 * The context items the reader sees and can remove before asking. Organization items are
 * offered only in an organization workspace; nothing private is included because a page is
 * merely open: every item is shown, and removable ones can be dropped.
 */
export function contextItems(ctx) {
  if (!ctx) return [];
  const items = [];
  if (ctx.entity?.symbol) items.push({ key: 'entity', label: ctx.entity.symbol, removable: true });
  if (ctx.workspace === 'organization')
    items.push({ key: 'org', label: 'Council workspace', removable: false });
  if (ctx.objectId)
    items.push({
      key: 'object',
      label:
        ctx.pageType === 'org_pitch'
          ? 'This pitch'
          : ctx.pageType === 'org_meeting'
            ? 'This meeting'
            : 'This item',
      removable: true,
    });
  return items;
}

/**
 * The question as sent, with only the context the reader kept. Personal context travels as
 * plain words ("NVDA: ..."); organization records are never pasted into a question, they are
 * resolved on the server by id.
 */
export function composeQuestion(text, ctx, removed = []) {
  const q = String(text || '').trim();
  const drop = new Set(removed);
  const symbol = ctx?.entity?.symbol;
  if (
    symbol &&
    !drop.has('entity') &&
    !new RegExp(`\\b${symbol.replace('.', '\\.')}\\b`, 'i').test(q)
  )
    return `${symbol}: ${q}`;
  return q;
}
