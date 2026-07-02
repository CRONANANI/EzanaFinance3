/**
 * Inferred position status for a member's trade sequence in ONE ticker.
 *
 * ⚠️ INFERENCE, never assertion. STOCK Act disclosures report amount BANDS, not
 * share counts, so actual custody is unknowable from trades alone. The UI MUST
 * label this as inferred (basis footnote) and never present it as authoritative
 * holdings data.
 *
 * Statuses:
 *   'likely-holds' — purchases with no later sale
 *   'sold'         — a full sale is the latest action, or sales clear all buys
 *   'reduced'      — a partial sale after buys (position likely trimmed, not closed)
 *   'unclear'      — sales with no visible prior buy, exchanges/other, or empty
 */
import { isPartialSale } from './normalize-trade';

/**
 * @param {Array} trades canonical trades for one member+ticker (any order).
 * @returns {'likely-holds'|'sold'|'reduced'|'unclear'}
 */
export function inferPositionStatus(trades) {
  const seq = [...(trades || [])]
    .filter(Boolean)
    .sort((a, b) => String(a.tradedAt || '').localeCompare(String(b.tradedAt || '')));
  if (!seq.length) return 'unclear';

  const hasBuy = seq.some((t) => t.side === 'purchase');
  const hasSale = seq.some((t) => t.side === 'sale');
  const last = seq[seq.length - 1];

  // Exchange/other-only, or no buys and no sales → can't infer.
  if (!hasBuy && !hasSale) return 'unclear';

  // No purchases anywhere in the window, but sales present → we never saw the
  // acquisition, so the position is unclear (can't call it a clean exit).
  if (!hasBuy && hasSale) return 'unclear';

  // Latest action is a full/plain sale → treat as sold.
  if (last.side === 'sale' && !isPartialSale(last.sideRaw)) return 'sold';

  // Latest action is a partial sale (after buys) → reduced.
  if (last.side === 'sale' && isPartialSale(last.sideRaw)) return 'reduced';

  // A partial sale occurred at some point after buying, but the latest action is
  // another buy → net still likely holding, though it was trimmed → reduced only
  // if the last event isn't a buy. Latest is a buy here → likely holds.
  if (last.side === 'purchase') {
    const hadPartial = seq.some((t) => isPartialSale(t.sideRaw));
    return hadPartial ? 'reduced' : 'likely-holds';
  }

  // Buys with a trailing exchange/other → unclear.
  return 'unclear';
}

/** Display label + badge tone for a status. */
export function positionStatusMeta(status) {
  switch (status) {
    case 'likely-holds':
      return { label: 'Likely holds', tone: 'pos' };
    case 'sold':
      return { label: 'Sold', tone: 'neg' };
    case 'reduced':
      return { label: 'Reduced', tone: 'warn' };
    default:
      return { label: 'Unclear', tone: 'muted' };
  }
}

export const POSITION_BASIS_NOTE =
  'Inferred from STOCK Act disclosures; filings report amount ranges, not exact holdings.';
