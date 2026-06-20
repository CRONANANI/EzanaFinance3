'use client';

import { cx } from './tokens';

function Field({ label, hint, error, htmlFor, children }) {
  if (!label && !hint && !error) return children;
  return (
    <div className="ds-field">
      {label && (
        <label className="ds-field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="ds-field-error">{error}</span>
      ) : hint ? (
        <span className="ds-field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

/** Text input with optional label / hint / error scaffolding. */
export function Input({ label, hint, error, invalid, id, className, ...rest }) {
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        aria-invalid={isInvalid || undefined}
        className={cx('ds-input', isInvalid && 'ds-input--invalid', className)}
        {...rest}
      />
    </Field>
  );
}

/** Multi-line input, same field scaffolding as Input. */
export function Textarea({ label, hint, error, invalid, id, className, ...rest }) {
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        aria-invalid={isInvalid || undefined}
        className={cx('ds-textarea', isInvalid && 'ds-textarea--invalid', className)}
        {...rest}
      />
    </Field>
  );
}
