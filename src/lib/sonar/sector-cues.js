/**
 * What a ping asks of a sector (Nov 4). Pure and client-safe: the
 * understanding layer reads it to pick the sector_screen intent, and the
 * sector screen reads it to order its panels.
 */

export const CONGRESS_CUE =
  /\b(congress(?:ional|man|woman|men|women)?|lawmakers?|politicians?|senators?|representatives|members of (?:the )?(?:house|senate|congress)|capitol hill|stock act)\b/i;
export const CONTRACTS_CUE =
  /\b(contracts?|contractors?|awards?|awarded|pentagon|dod|department of defense|procurement|federal spending|government spending)\b/i;
export const PERFORMANCE_CUE =
  /\b(best|performing|performers?|performance|outperform\w*|winners|gainers|doing (?:the )?(?:best|well)|returns?|rall(?:y|ied|ying))\b/i;

/** True when an industry ping asks for a screen rather than a value chain. */
export function wantsSectorScreen(text) {
  const t = String(text || '');
  return (
    CONGRESS_CUE.test(t) ||
    CONTRACTS_CUE.test(t) ||
    (PERFORMANCE_CUE.test(t) && /\b(stocks?|companies|names|shares|equities)\b/i.test(t))
  );
}

/** The panel order a ping asks for: what it names first, the rest after. */
export function panelOrder(text) {
  const t = String(text || '');
  const asked = [
    [CONGRESS_CUE, 'congress'],
    [PERFORMANCE_CUE, 'performance'],
    [CONTRACTS_CUE, 'contracts'],
  ]
    .map(([re, id]) => [t.search(re), id])
    .filter(([at]) => at >= 0)
    .sort((a, b) => a[0] - b[0])
    .map(([, id]) => id);
  return [...new Set([...asked, 'congress', 'performance', 'contracts'])];
}
