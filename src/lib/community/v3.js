/**
 * Community v3 (Nov 23, 2026): the research community. Pure helpers shared
 * by the API routes and the components (no I/O), so the checks can run them.
 *
 * Post kinds live in community_posts.post_type; a post with no type reads as
 * a 'discussion'. The partner formats (analyst_take, trade_idea,
 * market_brief) keep their partner-only gate; product and announcement are
 * admin-only; the rest are open to every member.
 */

/** The feed filter chips and the post kinds each one shows. */
export const FEED_FILTERS = [
  { key: 'all', label: 'All Posts', kinds: null },
  { key: 'research', label: 'Research', kinds: ['research', 'sonar_share'] },
  { key: 'analysis', label: 'Analysis', kinds: ['analyst_take', 'market_brief'] },
  { key: 'ideas', label: 'Ideas', kinds: ['thesis', 'trade_idea'] },
  { key: 'data', label: 'Data', kinds: ['data_insight'] },
  { key: 'product', label: 'Product', kinds: ['product'] },
  { key: 'announcements', label: 'Announcements', kinds: ['announcement'] },
];

/** Research Builds lists the posts that share a reusable research build. */
export const BUILD_KINDS = ['sonar_share'];

export const FEED_SORTS = [
  { key: 'relevant', label: 'Most Relevant' },
  { key: 'recent', label: 'Recent' },
  { key: 'trending', label: 'Trending' },
  { key: 'discussed', label: 'Most Discussed' },
];

export const HUB_TABS = [
  { key: 'feed', label: 'Feed', icon: 'bi-layers' },
  { key: 'topics', label: 'Topics', icon: 'bi-hash' },
  { key: 'builds', label: 'Research Builds', icon: 'bi-bar-chart-line' },
  { key: 'members', label: 'Members', icon: 'bi-people' },
  { key: 'events', label: 'Events', icon: 'bi-calendar3' },
];

export function normalizeFilter(v) {
  const k = String(v || '').toLowerCase();
  return FEED_FILTERS.some((f) => f.key === k) ? k : 'all';
}
export function normalizeSort(v) {
  const k = String(v || '').toLowerCase();
  return FEED_SORTS.some((f) => f.key === k) ? k : 'relevant';
}
export function normalizeHubTab(v) {
  const k = String(v || '').toLowerCase();
  return HUB_TABS.some((t) => t.key === k) ? k : 'feed';
}
export function kindsForFilter(filter) {
  return FEED_FILTERS.find((f) => f.key === filter)?.kinds || null;
}

/**
 * The composer's post types. `gate`: who may publish it (checked again on
 * the server): 'member', 'partner' or 'admin'. `attach`: what the type
 * links to ('sonar' a shared Sonar report, 'echo' an Echo article).
 * `template`: a structured starting point for the body.
 */
export const COMPOSER_TYPES = [
  {
    key: 'discussion',
    label: 'Discussion',
    icon: 'bi-chat-left-text',
    gate: 'member',
    hint: 'A question or a perspective for the community.',
    titleRequired: false,
  },
  {
    key: 'research',
    label: 'Research Analysis',
    icon: 'bi-journal-text',
    gate: 'member',
    hint: 'A research question, your conclusion and the evidence behind it.',
    titleRequired: true,
    template:
      '**Research question**\n\n\n**Conclusion**\n\n\n**Evidence**\n\n\n**Related companies and data sources**\n',
  },
  {
    key: 'thesis',
    label: 'Investment Thesis',
    icon: 'bi-lightbulb',
    gate: 'member',
    hint: 'Your view, its time horizon, the risks and the counterarguments. Not financial advice.',
    titleRequired: true,
    template:
      '**Positioning** (long, short or neutral)\n\n\n**Time horizon**\n\n\n**Supporting arguments**\n\n\n**Risks**\n\n\n**Counterarguments**\n\n\n**Evidence**\n',
  },
  {
    key: 'data_insight',
    label: 'Data Insight',
    icon: 'bi-database',
    gate: 'member',
    hint: 'One observation from a dataset, with its source and method.',
    titleRequired: true,
    template: '**Dataset**\n\n\n**Observation**\n\n\n**Source and method**\n',
  },
  {
    key: 'question',
    label: 'Research Question',
    icon: 'bi-question-circle',
    gate: 'member',
    hint: 'Ask the community for evidence or a second view.',
    titleRequired: true,
  },
  {
    key: 'sonar_share',
    label: 'Sonar Research Share',
    icon: 'bi-broadcast',
    gate: 'member',
    attach: 'sonar',
    hint: 'Share a Sonar report you have made public by link.',
    titleRequired: false,
  },
  {
    key: 'echo_discussion',
    label: 'Ezana Echo Discussion',
    icon: 'bi-newspaper',
    gate: 'member',
    attach: 'echo',
    hint: 'Start a discussion on an Ezana Echo article.',
    titleRequired: false,
  },
  {
    key: 'analyst_take',
    label: 'Analyst Take',
    icon: 'bi-clipboard-data',
    gate: 'partner',
    hint: 'A researched view on a name or theme.',
    titleRequired: true,
  },
  {
    key: 'trade_idea',
    label: 'Trade Idea',
    icon: 'bi-graph-up-arrow',
    gate: 'partner',
    hint: 'An actionable setup. Add a position disclosure.',
    titleRequired: true,
  },
  {
    key: 'market_brief',
    label: 'Market Insight',
    icon: 'bi-activity',
    gate: 'partner',
    hint: 'A short read on what is moving markets.',
    titleRequired: true,
  },
  {
    key: 'product',
    label: 'Product Update',
    icon: 'bi-stars',
    gate: 'admin',
    hint: 'An Ezana product update.',
    titleRequired: true,
  },
  {
    key: 'announcement',
    label: 'Announcement',
    icon: 'bi-megaphone',
    gate: 'admin',
    hint: 'A community announcement.',
    titleRequired: true,
  },
];

export const V3_POST_TYPES = COMPOSER_TYPES.map((t) => t.key);

export function composerTypeFor(key) {
  return COMPOSER_TYPES.find((t) => t.key === key) || COMPOSER_TYPES[0];
}

/** May this member publish this type? `who`: { partner, admin }. */
export function canUseType(key, who = {}) {
  const t = COMPOSER_TYPES.find((x) => x.key === key);
  if (!t) return false;
  if (t.gate === 'admin') return Boolean(who.admin);
  if (t.gate === 'partner') return Boolean(who.partner || who.admin);
  return true;
}

/** The badge a post shows for its kind (null for a plain discussion). */
export function kindBadge(postType) {
  if (!postType || postType === 'discussion') return null;
  const t = COMPOSER_TYPES.find((x) => x.key === postType);
  return t ? { label: t.label, icon: t.icon } : null;
}

/**
 * Supabase error from a function or table that does not exist yet (the v3
 * migration not applied). The routes fall back to what exists today.
 */
export function isMissingSchema(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  return (
    code === '42883' ||
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    /does not exist|could not find the (function|table)|schema cache/i.test(msg)
  );
}

/** The SQL migration's post-type check rejected a new type. */
export function isTypeRejected(error) {
  return (
    String(error?.code || '') === '23514' && /post_type/i.test(String(error?.message || ''))
  );
}

/** "Wed, Dec 10 · 1:00 PM ET" in the session's own timezone. */
export function sessionWhen(startsAt, timezone = 'America/New_York') {
  const t = Date.parse(startsAt);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const day = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  });
  return `${day} · ${time}`;
}

export function sessionDateParts(startsAt, timezone = 'America/New_York') {
  const t = Date.parse(startsAt);
  if (!Number.isFinite(t)) return { month: '', day: '' };
  const d = new Date(t);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: timezone }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: timezone }),
  };
}

export const SESSION_TYPES = {
  research_session: 'Research session',
  workshop: 'Workshop',
  discussion: 'Community discussion',
};
