/**
 * Sonar exemplary layouts (Nov 21 2026): the approved answer layout for a KIND of question.
 *
 * Every Sonar answer shares one skeleton (SonarAnswerFrame: the contents menu, the composer,
 * the follow-ups and the tools row). What goes inside it comes from the exemplary response
 * for that kind of question. An exemplary brief (./index.js) is a dated, sourced answer to ONE
 * exact question; an exemplary layout is the reviewed arrangement of cards for every question
 * of a kind, filled from that ping's own data. When a ping matches a layout, the board renders
 * the layout's rows in order; a card with nothing to show drops out of its row.
 *
 * Pure and client-safe. Tested in scripts/check-sonar-congress-profile.mjs.
 */

/** The cards a layout may name, and what each one shows. */
export const LAYOUT_CARDS = {
  desk: 'Desk summary: one-line headline and one short paragraph',
  portfolio: 'Estimated portfolio value with 1Y, 3Y, 5Y, 10Y and all-time periods, and key figures',
  findings: 'Key findings: what the full brief adds beyond the desk summary, as bullets',
  lean: 'Trading lean: disclosed purchases against sales, past 12 months, with why it reads so',
  similar: 'Similar portfolios in Congress',
  news: 'News around the subject',
  positions: 'Open positions with portfolio weights',
};

export const EXEMPLARY_LAYOUTS = [
  {
    slug: 'congress-member-profile',
    label: 'A member of Congress',
    example: 'Nancy Pelosi',
    reviewed: '2026-11-21',
    /* A ping that resolves to one member of Congress (dossier kind 'politician'). */
    matches: (live) => live?.dossier?.kind === 'politician',
    rows: [['desk'], ['portfolio', 'findings', 'lean'], ['similar', 'news', 'positions']],
    tools: ['controls', 'sources', 'steps'],
  },
];

/** The exemplary layout for a ping's answer, or null (the board's general layout then). */
export function exemplaryLayoutFor(live, layouts = EXEMPLARY_LAYOUTS) {
  if (!live) return null;
  return layouts.find((l) => typeof l.matches === 'function' && l.matches(live)) || null;
}
