'use client';

import { categoryAccents, page, shape } from './elo-design-tokens';

export function DailyQuests({ quests, refreshesAt }) {
  return (
    <div
      className="elo-daily-quests"
      style={{
        background: page.card,
        border: `2px solid ${page.cardLine}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadowCard,
        padding: 20,
        flex: 1,
        minWidth: 320,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: page.ink,
            letterSpacing: '-0.2px',
            fontFamily: 'var(--font-display, Nunito, system-ui, sans-serif)',
          }}
        >
          Daily Quests
        </h3>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: page.inkMuted,
            letterSpacing: 0.4,
          }}
        >
          Refresh in {refreshesAt}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {quests.map((q) => (
          <QuestRow key={q.id} quest={q} />
        ))}
      </div>
    </div>
  );
}

function QuestRow({ quest }) {
  const acc = categoryAccents[quest.category] || categoryAccents.PICK;
  const isDone = quest.done;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: isDone ? '#fafaf9' : '#ffffff',
        border: `1.5px solid ${page.cardLine}`,
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: acc.accent,
        }}
      />

      <div style={{ flex: 1, marginLeft: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              background: acc.soft,
              color: acc.accent,
              fontSize: 9,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 999,
              letterSpacing: 0.5,
            }}
          >
            {quest.category}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: isDone ? '#15803d' : page.inkMuted,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isDone
              ? `${quest.progress.target}/${quest.progress.target} · DONE`
              : `${quest.progress.current}/${quest.progress.target}`}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: page.ink,
            textDecoration: isDone ? 'line-through' : 'none',
            opacity: isDone ? 0.55 : 1,
          }}
        >
          {quest.title}
        </div>
      </div>

      <span
        style={{
          background: isDone ? '#dcfce7' : '#fef3c7',
          color: isDone ? '#15803d' : '#92400e',
          fontSize: 11,
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: 999,
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        +{quest.xp}
      </span>
    </div>
  );
}
