'use client';

/**
 * The strategy picker used in workspace toolbars. It only renders: the list
 * and the selection come from the caller, which owns the research context.
 */
export function StrategySelector({ strategies, value, onChange, disabled = false }) {
  return (
    <label className="qlx-row">
      <span className="qlx-label">Strategy</span>
      <select
        className="qlx-select"
        value={value || ''}
        disabled={disabled || !strategies.length}
        onChange={(e) => onChange(e.target.value)}
      >
        {!strategies.length && <option value="">No strategies yet</option>}
        {strategies.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · v{s.latest_version}
          </option>
        ))}
      </select>
    </label>
  );
}

export default StrategySelector;
