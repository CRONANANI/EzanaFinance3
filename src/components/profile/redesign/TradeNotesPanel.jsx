'use client';

import { ProfileTradeNotes } from '../ProfileTradeNotes';
import { page, shape, density, type as typeTokens } from './profile-design-tokens';

/**
 * Stripe-styled wrapper around the existing ProfileTradeNotes editor (persistence + forms).
 */
export function TradeNotesPanel({ userId, isOwn = false }) {
  if (!isOwn && !userId) return null;

  return (
    <div
      className="profile-stripe-trade-notes"
      style={{
        background: page.surface,
        borderRadius: shape.radius.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <ProfileTradeNotes userId={userId} isOwn={isOwn} />
    </div>
  );
}
