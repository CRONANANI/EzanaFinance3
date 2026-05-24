'use client';

const LENSES = ['Signal', 'Latest', 'Friends', 'Discussions', 'Legendary'];

const SKILL_OPTIONS = ['All', 'Apprentice+', 'Journeyman+', 'Master+', 'Oracle only'];

export function LensBar({
  activeLens,
  onLensChange,
  convictionMin = 0,
  onConvictionMinChange,
  skillFilter = 'All',
  onSkillFilterChange,
}) {
  return (
    <div
      className="evo-lens-bar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '10px 12px',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {LENSES.map((lens) => (
          <button
            key={lens}
            type="button"
            onClick={() => onLensChange?.(lens)}
            className={activeLens === lens ? 'ez-pill' : 'ez-pill ez-pill--ghost'}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              background: activeLens === lens ? undefined : 'transparent',
            }}
          >
            {lens}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border-secondary)' }} />

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        Min conviction
        <span
          className="ez-mono"
          style={{ fontWeight: 700, color: 'var(--text-primary)', minWidth: 36 }}
        >
          {convictionMin}%
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={convictionMin}
          onChange={(e) => onConvictionMinChange?.(+e.target.value)}
          style={{ width: 100, accentColor: 'var(--emerald)' }}
        />
      </label>

      <div style={{ width: 1, height: 28, background: 'var(--border-secondary)' }} />

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        Skill
        <select
          value={skillFilter}
          onChange={(e) => onSkillFilterChange?.(e.target.value)}
          style={{
            background: 'var(--surface-input)',
            border: '1px solid var(--border-input)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {SKILL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
