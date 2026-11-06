'use client';

import { cx } from './tokens';
import { describedBy } from './Input';

/**
 * Native select styled to the system. Pass `options` ([{value,label}] or
 * strings) or children. Optional label / hint / error scaffolding.
 */
export function Select({
  label,
  hint,
  error,
  invalid,
  id,
  options,
  className,
  children,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) {
  const isInvalid = invalid || !!error;
  const select = (
    <select
      id={id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy(id, hint, error, ariaDescribedBy)}
      className={cx('ds-select', isInvalid && 'ds-select--invalid', className)}
      {...rest}
    >
      {options
        ? options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })
        : children}
    </select>
  );

  if (!label && !hint && !error) return select;
  return (
    <div className="ds-field">
      {label && (
        <label className="ds-field-label" htmlFor={id}>
          {label}
        </label>
      )}
      {select}
      {error ? (
        <span id={id ? `${id}-desc` : undefined} className="ds-field-error">
          {error}
        </span>
      ) : hint ? (
        <span id={id ? `${id}-desc` : undefined} className="ds-field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
