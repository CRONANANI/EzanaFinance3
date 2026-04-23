'use client';

/**
 * Shared horizontal input / transparency strip for model cards.
 * Renders a responsive grid (up to 6 across on large screens).
 */

/**
 * @typedef {Object} ModelVariable
 * @property {string} label
 * @property {number | string} value
 * @property {'percent' | 'currency' | 'multiple' | 'number' | undefined} [format]
 */

/**
 * @param {ModelVariable} variable
 * @param {string} [className] — optional tile wrapper classes (e.g. gold tint on DCF)
 */
function VariableTile({ variable, className = '' }) {
  const formatted = formatValue(/** @type {any} */ (variable.value), variable.format);
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${className}`.trim()}>
      <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {variable.label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {formatted}
      </span>
    </div>
  );
}

/**
 * @param {number | string} value
 * @param {ModelVariable['format']} [format]
 * @returns {string}
 */
export function formatModelVariableValue(value, format) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(2)}%`;
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'multiple':
      return `${value.toFixed(2)}x`;
    case 'number':
      return value.toFixed(2);
    default:
      return value.toString();
  }
}

const formatValue = formatModelVariableValue;

/**
 * @param {object} props
 * @param {ModelVariable[]} props.variables
 * @param {string} [props.className]
 * @param {string} [props.innerClassName] — for grid container
 */
export function ModelVariableStrip({ variables, className = '', innerClassName = '' }) {
  if (!variables || variables.length === 0) return null;
  return (
    <div
      className={`grid grid-cols-2 gap-3 rounded-lg border border-border/40 bg-muted/30 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-6 ${className}`.trim()}
    >
      {variables.map((v) => (
        <VariableTile key={v.label} variable={v} className={innerClassName} />
      ))}
    </div>
  );
}

export default ModelVariableStrip;
