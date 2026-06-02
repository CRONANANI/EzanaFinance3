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
    <div className="lensbar">
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {LENSES.map((lens) => (
          <button
            key={lens}
            type="button"
            onClick={() => onLensChange?.(lens)}
            className={`lpill ${activeLens === lens ? 'on' : ''}`}
          >
            {lens}
          </button>
        ))}
      </div>

      <div className="div" aria-hidden />

      <div className="lens-ctrl">
        <label htmlFor="conviction-min">Min conviction</label>
        <span className="ez-mono">{convictionMin}%</span>
        <input
          id="conviction-min"
          type="range"
          min="0"
          max="100"
          value={convictionMin}
          onChange={(e) => onConvictionMinChange?.(+e.target.value)}
        />
      </div>

      <div className="div" aria-hidden />

      <div className="lens-ctrl">
        <label htmlFor="skill-filter">Skill</label>
        <select
          id="skill-filter"
          className="sel"
          value={skillFilter}
          onChange={(e) => onSkillFilterChange?.(e.target.value)}
        >
          {SKILL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
