/**
 * The twelve sections of every Sonar answer (Nov 2026), and who can open them.
 *
 * Every Sonar answer (a quick ping on /datasets, a standard research report, a deep
 * research report) is laid out on the same board (docs/sonar/answer-templates) with the
 * same side navigation. Five sections are open to everyone. Seven more open only on a deep
 * research run by a Starter (or higher) plan, or an org or partner seat; everyone else sees
 * them listed, greyed out and not clickable, with the call to action that unlocks them.
 *
 * Each section has one anchor id on the page (`sa-<key>`), set by the board on the first
 * cell of that section.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-answer-sections.mjs.
 */

export const ANSWER_SECTIONS = [
  { key: 'answer', label: 'Desk summary', tier: 'free' },
  { key: 'metrics', label: 'Key metrics', tier: 'free' },
  { key: 'findings', label: 'Key findings', tier: 'free' },
  { key: 'charts', label: 'Charts and data', tier: 'free' },
  { key: 'sources', label: 'Evidence and sources', tier: 'free' },
  { key: 'team', label: 'Research team', tier: 'deep' },
  { key: 'methodology', label: 'Methodology and limitations', tier: 'deep' },
  { key: 'scenarios', label: 'Scenarios', tier: 'deep' },
  { key: 'monitor', label: 'What to monitor', tier: 'deep' },
  { key: 'risks', label: 'Risks and counterevidence', tier: 'deep' },
  { key: 'relationships', label: 'Relationships', tier: 'deep' },
  { key: 'explorer', label: 'Evidence explorer', tier: 'deep' },
];

export const FREE_KEYS = ANSWER_SECTIONS.filter((s) => s.tier === 'free').map((s) => s.key);
export const DEEP_KEYS = ANSWER_SECTIONS.filter((s) => s.tier === 'deep').map((s) => s.key);

/**
 * Nov 2026: sections that exist only for some subjects. Valuation is a deep section for an
 * answer about one listed company (AAPL, "Is Apple overvalued?", "Compare NVIDIA's valuation
 * with AMD"); it is never listed for a country, commodity or macro question. Counts in the
 * navigation and the call to action are computed, never assumed to be twelve.
 */
export const SCOPED_SECTIONS = [
  { key: 'valuation', label: 'Valuation', tier: 'deep', scope: 'equity', after: 'methodology' },
];
export const SCOPED_KEYS = SCOPED_SECTIONS.map((s) => s.key);

/** The sections an answer has: the core twelve, plus Valuation when the subject is equity. */
export function sectionsFor({ equity = false } = {}) {
  if (!equity) return ANSWER_SECTIONS;
  const out = [];
  for (const s of ANSWER_SECTIONS) {
    out.push(s);
    for (const x of SCOPED_SECTIONS) if (x.scope === 'equity' && x.after === s.key) out.push(x);
  }
  return out;
}

/** The number of deep sections an answer offers. */
export const deepCount = ({ equity = false } = {}) =>
  sectionsFor({ equity }).filter((s) => s.tier === 'deep').length;

/**
 * Whether an answer is about one listed company, so equity valuation applies. `kind` is the
 * dossier kind on a quick ping ('company') or the resolved subject's kind in research.
 */
export function isEquityAnswer({ ticker = null, kind = null } = {}) {
  return Boolean(ticker) && (kind == null || kind === 'company' || kind === 'ticker');
}

/** The page anchor of a section. */
export const sectionId = (key) => `sa-${key}`;

/** Plan tiers (lib/subscription getPlanTier): 0 free, 1 Starter, 2 Advanced, 3 Family, 4 Pro. */
export const STARTER_TIER = 1;

/**
 * Who can open the deep sections, and what to offer when they cannot.
 *
 * @param {{ depth?: 'quick'|'standard'|'deep', planTier?: number|null, isGuest?: boolean,
 *           version?: 'regular'|'org'|'partner'|null }} who
 * @returns {{ unlocked: boolean, cta: null | { kind: 'signup'|'upgrade'|'deep',
 *            title: string, line: string, action: string, href: string|null } }}
 */
export function sectionAccess({
  depth = 'quick',
  planTier = null,
  isGuest = true,
  version = 'regular',
  equity = false,
} = {}) {
  const seat = version === 'org' || version === 'partner';
  const paid = !isGuest && (seat || (Number(planTier) || 0) >= STARTER_TIER);
  if (depth === 'deep' && paid) return { unlocked: true, cta: null };
  const title = `${deepCount({ equity })} more sections with deep research`;
  if (isGuest)
    return {
      unlocked: false,
      cta: {
        kind: 'signup',
        title,
        line: 'Create a free account, then join the Starter plan to open the research team, methodology, scenarios and more on every deep research answer.',
        action: 'Sign up free',
        href: `/auth/continue?intent=signup&next=${encodeURIComponent('/pricing?plan=starter')}`,
      },
    };
  if (!paid)
    return {
      unlocked: false,
      cta: {
        kind: 'upgrade',
        title,
        line: 'The Starter plan opens every section on every deep research answer.',
        action: 'Get the Starter plan',
        href: '/pricing?plan=starter',
      },
    };
  return {
    unlocked: false,
    cta: {
      kind: 'deep',
      title,
      line: 'Your plan includes them. Run deep research on this question to open every section.',
      action: 'Run deep research',
      href: null,
    },
  };
}

/**
 * The navigation for one answer: the free sections the page has, then the deep sections
 * (open and present when unlocked; every one of them, locked, when not).
 * present: iterable of section keys the page renders.
 * -> [{ key, label, tier, id, locked }]
 */
export function answerNav(present, { unlocked = false, equity = false } = {}) {
  const have = new Set(present || []);
  const out = [];
  for (const s of sectionsFor({ equity })) {
    if (s.tier === 'free') {
      if (have.has(s.key)) out.push({ ...s, id: sectionId(s.key), locked: false });
    } else if (unlocked) {
      if (have.has(s.key)) out.push({ ...s, id: sectionId(s.key), locked: false });
    } else {
      out.push({ ...s, id: sectionId(s.key), locked: true });
    }
  }
  return out;
}

/** Whether a section's content may render: free always, deep only when unlocked. */
export const canRender = (key, unlocked) =>
  FREE_KEYS.includes(key) || (unlocked && (DEEP_KEYS.includes(key) || SCOPED_KEYS.includes(key)));

/**
 * The first cell of each section carries its anchor. cells: [{ id, section }] in page order
 * -> Map(cell id -> anchor id) for the first cell of each section.
 */
export function anchorCells(cells) {
  const seen = new Set();
  const out = new Map();
  for (const c of cells || []) {
    if (!c?.section || seen.has(c.section)) continue;
    seen.add(c.section);
    out.set(c.id, sectionId(c.section));
  }
  return out;
}

/**
 * The active section for scroll-spy: the last one whose anchor top is above the reading
 * line; at the bottom of the page, the last one. Locked entries are skipped.
 */
export function activeKey(nav, tops, line, atBottom = false) {
  const open = nav.map((s, i) => ({ s, top: tops[i] })).filter((x) => !x.s.locked);
  if (!open.length) return null;
  if (atBottom) return open[open.length - 1].s.key;
  /* The section whose anchor sits closest above the line. Page order is not nav order (Key
     metrics sits beside the executive answer, the research team beside the findings), so the
     nearest anchor wins, not the last one in the list; a tie on one row goes to the earlier
     section in the nav. */
  let cur = open[0].s.key;
  let best = -Infinity;
  for (const x of open) {
    if (!Number.isFinite(x.top) || x.top > line) continue;
    if (x.top > best + 4) {
      best = x.top;
      cur = x.s.key;
    }
  }
  return cur;
}
