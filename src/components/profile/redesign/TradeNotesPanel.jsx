'use client';

import { ProfileTradeNotes } from '../ProfileTradeNotes';
import { Caps } from './Caps';
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
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <Caps>Trade Notes</Caps>
      </div>
      <ProfileTradeNotes userId={userId} isOwn={isOwn} />
    </div>
  );
}
