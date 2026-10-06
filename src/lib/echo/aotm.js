/**
 * Article of the Month history, newest first. Lives on its own so the Echo
 * home can import it without pulling the whole article catalogue (every
 * ezana-echo-article-* module) into its client bundle; ezana-echo-mock.js
 * re-exports it for existing importers.
 */
/** Article-of-the-Month history: index 0 is the CURRENT month. The Echo home
 *  banner renders index 0 by default and offers previous months in a dropdown.
 *  When a new AOTM is crowned: prepend it here AND move the `articleOfMonth`
 *  flag to its article file (flag = fallback if this list ever fails to resolve). */
export const AOTM_HISTORY = [
  // August 2026 re-crowned to the cow/tokenization article (was johnny-mnemonic).
  { month: 'August 2026', articleId: 'tokenization-collateral-2026' },
  { month: 'July 2026', articleId: 'ballroom-donors-federal-contracts-2026' },
];
