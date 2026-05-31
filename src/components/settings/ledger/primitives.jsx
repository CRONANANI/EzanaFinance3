'use client';

import { ChevronDown } from 'lucide-react';
import { useId } from 'react';

export function LedgerField({ label, mono, full, type = 'text', ...input }) {
  const id = useId();
  return (
    <div className={`sl-field ${full ? 'is-full' : ''}`}>
      <label htmlFor={id} className="sl-flabel">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={`sl-input ${mono ? 'sl-input--mono' : ''}`}
        {...input}
      />
    </div>
  );
}

export function LedgerTextArea({ label, full, rows = 4, ...input }) {
  const id = useId();
  return (
    <div className={`sl-field ${full ? 'is-full' : ''}`}>
      <label htmlFor={id} className="sl-flabel">
        {label}
      </label>
      <textarea id={id} rows={rows} className="sl-input sl-textarea" {...input} />
    </div>
  );
}

export function LedgerSelect({ label, full, children, ...select }) {
  const id = useId();
  return (
    <div className={`sl-field ${full ? 'is-full' : ''}`}>
      <label htmlFor={id} className="sl-flabel">
        {label}
      </label>
      <div className="sl-sel">
        <select id={id} className="sl-input sl-select" {...select}>
          {children}
        </select>
        <ChevronDown className="sl-sel-chev" />
      </div>
    </div>
  );
}

export function LedgerButton({
  variant = 'out',
  as: As = 'button',
  icon: Icon,
  children,
  ...rest
}) {
  return (
    <As className={`sl-btn sl-btn-${variant}`} {...rest}>
      {Icon ? <Icon strokeWidth={1.8} /> : null}
      {children}
    </As>
  );
}

export function LedgerToggle({ checked, onChange, label, hint }) {
  return (
    <label className="sl-toggle-row">
      {(label || hint) && (
        <span className="sl-toggle-text">
          {label && <span className="sl-toggle-label">{label}</span>}
          {hint && <span className="sl-toggle-hint">{hint}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`sl-toggle ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="sl-toggle-knob" />
      </button>
    </label>
  );
}

export function LedgerSegmented({ value, onChange, options }) {
  return (
    <div role="radiogroup" className="sl-seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`sl-seg-btn ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <o.icon strokeWidth={1.8} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LedgerBadge({ variant = 'pos', children, dot }) {
  return (
    <span className={`sl-badge sl-badge-${variant}`}>
      {dot && <span className="sl-badge-dot" />}
      {children}
    </span>
  );
}

export function LedgerMeter({ value, max, caption }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="sl-meter">
      <div className="sl-meter-track">
        <i className="sl-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      {caption !== undefined && (
        <div className="sl-meter-caption num">
          {caption ?? `${value.toLocaleString()} / ${max.toLocaleString()}`}
        </div>
      )}
    </div>
  );
}

export function LedgerTable({ headers, rows, numericCols = [] }) {
  return (
    <table className="sl-dtable">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className={numericCols.includes(i) ? 'is-numeric' : ''}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.cells.map((c, ci) => (
              <td key={ci} className={numericCols.includes(ci) ? 'is-numeric num' : ''}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LedgerRow({ idx, title, helper, children }) {
  return (
    <section className="sl-srow">
      <div className="sl-srow-l">
        {idx ? <div className="sl-srow-idx">{idx}</div> : null}
        <h3 className="sl-srow-h3">{title}</h3>
        {helper ? <p className="sl-srow-help">{helper}</p> : null}
      </div>
      <div className="sl-srow-r">{children}</div>
    </section>
  );
}

export function LedgerSaveBar({ onSave, onCancel, saving, dirty, savedAgo }) {
  return (
    <div className="sl-savebar">
      <LedgerButton variant="pri" onClick={onSave} disabled={saving || dirty === false}>
        {saving ? 'Saving…' : 'Save changes'}
      </LedgerButton>
      {onCancel ? (
        <LedgerButton variant="ghost" onClick={onCancel}>
          Cancel
        </LedgerButton>
      ) : null}
      <span className="sl-savebar-note">
        <span className={`sl-dot ${dirty ? 'sl-dot--amber' : 'sl-dot--em'}`} />
        {dirty ? 'Unsaved changes' : savedAgo ? `Saved ${savedAgo}` : 'All changes saved'}
      </span>
    </div>
  );
}
