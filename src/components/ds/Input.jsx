'use client';

import { cx } from './tokens';

/* The hint / error text id for a control, so screen readers read it with
   the field (aria-describedby). Only when the control has an id. */
export function describedBy(id, hint, error, own) {
  const mine = id && (error || hint) ? `${id}-desc` : null;
  return [own, mine].filter(Boolean).join(' ') || undefined;
}

function Field({ label, hint, error, htmlFor, children }) {
  if (!label && !hint && !error) return children;
  const descId = htmlFor ? `${htmlFor}-desc` : undefined;
  return (
    <div className="ds-field">
      {label && (
        <label className="ds-field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span id={descId} className="ds-field-error">
          {error}
        </span>
      ) : hint ? (
        <span id={descId} className="ds-field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Text input with optional label / hint / error scaffolding. */
export function Input({
  label,
  hint,
  error,
  invalid,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) {
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy(id, hint, error, ariaDescribedBy)}
        className={cx('ds-input', isInvalid && 'ds-input--invalid', className)}
        {...rest}
      />
    </Field>
  );
}

/** Multi-line input, same field scaffolding as Input. */
export function Textarea({
  label,
  hint,
  error,
  invalid,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) {
  const isInvalid = invalid || !!error;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy(id, hint, error, ariaDescribedBy)}
        className={cx('ds-textarea', isInvalid && 'ds-textarea--invalid', className)}
        {...rest}
      />
    </Field>
  );
}
