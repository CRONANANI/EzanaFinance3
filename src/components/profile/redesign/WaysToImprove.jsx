'use client';

import { Caps } from './Caps';
import { QuestRow } from './QuestRow';
import { page, shape, density, type as typeTokens } from './profile-design-tokens';

export function WaysToImprove({ quests = [] }) {
  if (quests.length === 0) return null;
  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#b45309' }} aria-hidden>
          💡
        </span>
        <Caps>Ways to Improve</Caps>
      </div>
      <div>
        {quests.map((q, i) => (
          <QuestRow key={q.key} quest={q} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}
