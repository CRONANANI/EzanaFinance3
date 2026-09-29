'use client';

/**
 * A segmented control that is a real radio group: role=radiogroup, one
 * role=radio button per option, arrow keys move the value, Home and End jump.
 * Options: [{ value, label, dot? }] where `dot` is a class for a leading
 * 7px dot (the chamber controls).
 */
export default function Segmented({
  label,
  value,
  options,
  onChange,
  mono = false,
  className = '',
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const onKey = (e) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (idx - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next == null) return;
    e.preventDefault();
    onChange(options[next].value);
    e.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
  };
  return (
    <div
      className={`ptk-seg${mono ? ' ptk-seg--mono' : ''} ${className}`.trim()}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
    >
      {options.map((o, i) => (
        <button
          key={o.value ?? 'null'}
          type="button"
          role="radio"
          aria-checked={i === idx}
          tabIndex={i === idx ? 0 : -1}
          className={`ptk-seg-btn${i === idx ? ' is-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.dot ? <i className={`ptk-dot ${o.dot}`} aria-hidden="true" /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
