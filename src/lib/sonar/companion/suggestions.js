/**
 * Sonar Companion: deterministic contextual suggestions (Nov 28 2026).
 *
 * Suggestions are picked from the page type, the selected entity and the workspace. No model
 * is called to write them, and none is shown that cannot run: every suggestion is one of
 *   kind 'research'  a question sent through the existing Sonar research route (the reader's
 *                    plan and quotas apply; never deep research)
 *   kind 'council'   a council capability run by /api/org/sonar/intelligence (deterministic,
 *                    no model call), only in an organization workspace
 *   kind 'navigate'  a link to the page that does the work
 * A suggestion that needs an entity the page does not have is dropped, not shown disabled.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-companion.mjs.
 */

const r = (id, label, query) => ({ id, kind: 'research', label, query });
const c = (id, label, capability, params = {}) => ({
  id,
  kind: 'council',
  label,
  capability,
  params,
});
const n = (id, label, href) => ({ id, kind: 'navigate', label, href });

const BY_PAGE = {
  portfolio: () => [
    r(
      'pf-sectors',
      'Which sectors do my holdings fall in?',
      'Break down my portfolio holdings by sector using their filed classifications.',
    ),
    r(
      'pf-largest',
      'What should I investigate in my largest holding?',
      'What are the main recent developments and risks for my largest holding?',
    ),
    n('pf-watch', 'Open my watchlist', '/watchlist'),
  ],
  company: (s) =>
    s
      ? [
          r(
            'co-fund',
            `Fundamentals for ${s}`,
            `Fundamental analysis of ${s}: growth, margins, cash flow and leverage from filed figures.`,
          ),
          r(
            'co-peers',
            `Compare ${s} with its peers`,
            `Compare ${s} with its closest peers on filed growth, margins and valuation.`,
          ),
          r(
            'co-13f',
            `Institutional ownership of ${s}`,
            `How has institutional ownership of ${s} changed in recent 13F filings?`,
          ),
          r(
            'co-earn',
            `Explain ${s}'s latest earnings`,
            `Explain ${s}'s latest reported quarter against the prior year.`,
          ),
        ]
      : [],
  watchlist: (s) => [
    ...(s
      ? [r('wl-one', `Research ${s}`, `What changed for ${s} recently, from filings and news?`)]
      : []),
    r(
      'wl-compare',
      'Compare fundamentals across my watchlist',
      'Compare growth, margins and valuation across the securities on my watchlist.',
    ),
  ],
  trading: (s) => [
    ...(s
      ? [
          r(
            'tr-thesis',
            `Evidence for and against ${s}`,
            `Summarize the evidence for and against an investment in ${s}.`,
          ),
        ]
      : []),
    r('tr-exposure', 'Review my sector exposure', 'Break down my portfolio holdings by sector.'),
  ],
  quant: () => [
    r(
      'q-method',
      'Explain backtest methodology',
      'Explain how a disclosure-following backtest avoids look-ahead bias.',
    ),
    n('q-lab', 'Open the Quant Lab', '/for-the-quants'),
  ],
  market: () => [
    r(
      'm-congress',
      'Recent congressional purchases',
      'Which stocks did members of Congress buy most in the last 30 days?',
    ),
    r(
      'm-contracts',
      'Largest new federal contracts',
      'Which companies received the largest federal contract obligations this fiscal year?',
    ),
  ],
  echo: () => [
    r(
      'e-explain',
      'Explain the companies in this article',
      'Explain the main companies and figures discussed in this Ezana Echo article.',
    ),
  ],
  other: () => [
    r(
      'o-market',
      'What moved the market today?',
      'What moved US equity markets in the latest session?',
    ),
  ],
  /* Organization workspace: council capabilities, deterministic and scoped on the server. */
  org_pitch: (s, ctx) => {
    const p = { ...(s ? { ticker: s } : {}), ...(ctx?.objectId ? { pitchId: ctx.objectId } : {}) };
    return [
      c('op-red', 'Challenge this investment thesis', 'org-thesis-red-team', p),
      c('op-check', 'Check the thesis for gaps', 'org-pitch-research', p),
      c('op-mem', 'Compare with previous research', 'org-research-memory', s ? { ticker: s } : {}),
    ];
  },
  org_research: () => [
    c('or-mem', 'Compare this report with newer evidence', 'org-research-memory'),
    c('or-cov', 'Which holdings lack recent research?', 'org-research-coverage'),
  ],
  org_fund: () => [
    c('of-con', 'Analyze fund concentration', 'org-portfolio-analysis'),
    c('of-ips', 'Compare holdings with recorded IPS rules', 'org-policy-observations'),
    c('of-cov', 'Identify coverage gaps', 'org-research-coverage'),
  ],
  org_meeting: () => [
    c('om-brief', 'Prepare a briefing for the next meeting', 'org-meeting-briefing'),
  ],
  org_assignment: (s) => [
    ...(s
      ? [r('oa-co', `Help me research ${s}`, `Fundamental analysis of ${s} from filed figures.`)]
      : []),
    c('oa-cov', 'Which holdings need a research update?', 'org-research-coverage'),
  ],
  org_compliance: () => [
    c('oc-ips', 'Compare holdings with recorded IPS rules', 'org-policy-observations'),
  ],
  org_sonar: () => [
    c('os-con', 'Analyze fund concentration', 'org-portfolio-analysis'),
    c('os-brief', 'Prepare the next meeting briefing', 'org-meeting-briefing'),
  ],
  org_home: () => [
    c('oh-con', 'Analyze fund concentration', 'org-portfolio-analysis'),
    c('oh-cov', 'Which holdings lack recent research?', 'org-research-coverage'),
  ],
};

/**
 * @param ctx   the merged page descriptor
 * @param opts  { enabled, orgMember: boolean }  council suggestions need an active membership
 */
export function suggestionsFor(ctx, { enabled = true, orgMember = false } = {}) {
  if (!enabled || !ctx) return [];
  const fn = BY_PAGE[ctx.pageType] || BY_PAGE.other;
  const list = fn(ctx.entity?.symbol || null, ctx);
  return list
    .filter((s) => s.kind !== 'council' || (ctx.workspace === 'organization' && orgMember))
    .slice(0, 4);
}
