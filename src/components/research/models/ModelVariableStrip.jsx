'use client';

/**
 * Shared horizontal data register for model cards (Ledger-style).
 */

/**
 * @typedef {Object} ModelVariable
 * @property {string} label
 * @property {number | string} value
 * @property {'percent' | 'currency' | 'multiple' | 'number' | undefined} [format]
 * @property {boolean | 'negative'} [emphasis] — emerald highlight, or red for negative emphasis
 */

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

/**
 * @param {object} props
 * @param {ModelVariable[]} props.variables
 * @param {string} [props.className]
 */
export function ModelVariableStrip({ variables, className = '' }) {
  if (!variables || variables.length === 0) return null;
  return (
    <div className={`reg ${className}`.trim()} role="group" aria-label="Model parameters">
      {variables.map((v) => {
        const valueClass =
          v.emphasis === 'negative'
            ? 'reg-value reg-value--neg'
            : v.emphasis
              ? 'reg-value reg-value--em'
              : 'reg-value';
        return (
          <div key={v.label} className="reg-cell">
            <span className="reg-label lf-mono">{v.label}</span>
            <span className={`${valueClass} lf-mono`}>
              {formatModelVariableValue(v.value, v.format)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default ModelVariableStrip;
