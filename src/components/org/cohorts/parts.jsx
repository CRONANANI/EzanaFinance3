'use client';

import { Dropdown, MenuItem } from '@/components/ds';
import { Skel } from '@/components/org/command-center/parts';
import {
  LIFECYCLE_ICON,
  LIFECYCLE_LABEL,
  LIFECYCLE_TONE,
  NA,
  initialsOf,
} from '@/lib/org-cohorts-model';

/** A text-only menu trigger (label and chevron) over a ds Dropdown. */
export function TextMenu({ label, value, options, onChange, align = 'left', ariaLabel }) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown
      align={align}
      className="coh-menu"
      trigger={
        <span className={`coh-menu__trigger${value ? ' is-on' : ''}`} aria-label={ariaLabel}>
          {current && value ? current.label : label}
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </span>
      }
    >
      {options.map((o) => (
        <MenuItem
          key={o.value || 'all'}
          icon={o.value === value ? 'bi-check-lg' : undefined}
          className={o.value === value ? 'coh-menu__on' : 'coh-menu__off'}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </MenuItem>
      ))}
    </Dropdown>
  );
}

/** Lifecycle status as text with an optional icon. Never a chip. */
export function Lifecycle({ status }) {
  const tone = LIFECYCLE_TONE[status] || 'muted';
  const icon = LIFECYCLE_ICON[status];
  return (
    <span className={`coh-status coh-tone--${tone}`}>
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {LIFECYCLE_LABEL[status] || status || NA}
    </span>
  );
}

export function Initials({ name, size = 'sm' }) {
  return (
    <span className={`coh-initials coh-initials--${size}`} aria-hidden="true">
      {initialsOf(name) || '?'}
    </span>
  );
}

/** Skeleton rows in a table's final column grid. */
export function TableSkeleton({ cols = 6, rows = 5 }) {
  return (
    <div className="coh-skel" aria-hidden="true">
      {Array.from({ length: rows + 1 }).map((_, r) => (
        <div
          key={r}
          className="coh-skel__row"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Skel
              key={c}
              w={`${r === 0 ? 50 : 60 + ((r * 7 + c * 13) % 35)}%`}
              h={r === 0 ? 9 : 12}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A KPI cell: 28px icon, 12px grey label, 18px mono value. */
export function Kpi({ icon, label, loading, na, text = false, warn = false, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span
        className={`tcc-kpi__value${text ? ' coh-kpi__text' : ' tcc-mono'}${na ? ' tcc-na' : ''}${warn ? ' tcc-warn' : ''}`}
      >
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

/** Inline error with Retry; the rest of the page keeps working. */
export function SectionError({ message, onRetry }) {
  return (
    <p className="tcc-state tcc-state--error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Retry
        </button>
      )}
    </p>
  );
}

/** One line and one action. */
export function EmptyLine({ children, action, onAction }) {
  return (
    <p className="tcc-state">
      <span>{children}</span>
      {action && onAction && (
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onAction}>
          {action}
        </button>
      )}
    </p>
  );
}

/** A sortable header cell: a button carrying aria-sort on its th. */
export function SortHead({ label, k, sort, onSort, numeric = false, className = '' }) {
  const on = sort.key === k;
  return (
    <th
      scope="col"
      className={`${numeric ? 'coh-num ' : ''}${className}`.trim()}
      aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className={`coh-sort${on ? ' is-on' : ''}`} onClick={() => onSort(k)}>
        {label}
        {on && (
          <i
            className={`bi ${sort.dir === 1 ? 'bi-arrow-up' : 'bi-arrow-down'}`}
            aria-hidden="true"
          />
        )}
      </button>
    </th>
  );
}

/** Key and value rows for a side column or a dialog. */
export function Pairs({ rows }) {
  return (
    <dl className="coh-pairs">
      {rows.map(([k, v, opts = {}]) => (
        <div key={k} className="coh-pairs__row">
          <dt>{k}</dt>
          <dd
            className={
              `${opts.mono ? 'tcc-mono' : ''}${opts.na ? ' tcc-na' : ''}`.trim() || undefined
            }
          >
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Sample content note shown inside dialogs while sample content is on. */
export function SampleNote({ on }) {
  if (!on) return null;
  return (
    <p className="coh-note">
      Sample content is showing. Changes apply to this page only and are not saved.
    </p>
  );
}
