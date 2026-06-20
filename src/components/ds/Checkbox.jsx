'use client';

import { cx } from './tokens';

/** Checkbox with a custom token-styled box + label. */
export function Checkbox({ label, checked, onChange, disabled, className, ...rest }) {
  return (
    <label className={cx('ds-checkbox', className)}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="ds-checkbox-box" aria-hidden="true">
        <i className="bi bi-check-lg" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

/** Toggle switch — same semantics as Checkbox, switch presentation. */
export function Toggle({ label, checked, onChange, disabled, className, ...rest }) {
  return (
    <label className={cx('ds-toggle', className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="ds-toggle-track" aria-hidden="true" />
      {label && <span>{label}</span>}
    </label>
  );
}
