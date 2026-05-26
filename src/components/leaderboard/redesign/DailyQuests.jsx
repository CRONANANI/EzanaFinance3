'use client';

import { NumberText } from './NumberText';
import { categoryAccents, page, shape, type as typeTokens } from './elo-design-tokens';

export function DailyQuests({ quests, refreshesAt }) {
  return (
    <div
      className="elo-daily-quests"
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: '14px 16px',
        flex: 1,
        minWidth: 300,
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: page.ink }}>Daily Quests</h3>
        <span style={{ fontSize: 11, color: page.inkMuted }}>{refreshesAt}</span>
      </div>

      <div>
        {quests.map((q, i) => (
          <QuestRow key={q.id} quest={q} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}

function QuestRow({ quest, isFirst }) {
  const accentColor = categoryAccents[quest.category] || categoryAccents.PICK;
  const isDone = quest.done;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 50px 1fr auto auto',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderTop: isFirst ? 'none' : `1px solid ${page.border}`,
        opacity: isDone ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: accentColor,
          flexShrink: 0,
        }}
      />

      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: accentColor,
        }}
      >
        {quest.category}
      </span>

      <span
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: page.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textDecoration: isDone ? 'line-through' : 'none',
        }}
      >
        {quest.title}
      </span>

      <NumberText size={11} weight={500} color={page.inkMuted}>
        {quest.progress.current}/{quest.progress.target}
      </NumberText>

      <span
        style={{
          fontFamily: typeTokens.sans,
          fontSize: 11,
          fontWeight: 600,
          color: isDone ? '#15803d' : page.ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        +{quest.xp}
      </span>
    </div>
  );
}
