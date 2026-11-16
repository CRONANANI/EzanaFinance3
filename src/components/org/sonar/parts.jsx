'use client';

/**
 * Small pieces shared by the Sonar Research page and the single report.
 * Status, kind and visibility are words with an icon, never a filled chip.
 */
import { Skel } from '@/components/org/command-center/parts';
import {
  KIND_ICON,
  MANDATE_TONE,
  NA,
  STATUS_VIEW,
  VISIBILITY_ICON,
  kindLabel,
  mandateScreen,
  statusLabel,
  visibilityLabel,
} from '@/lib/org-sonar-research-model';

export function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon${tone ? ` tcc-${tone}` : ''}`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`}>
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

export function StatusText({ status }) {
  const v = STATUS_VIEW[status];
  if (!v) return <span className="tcc-na">{NA}</span>;
  return (
    <span className={`osp-word tcc-${v.tone}`}>
      <i className={`bi ${v.icon}`} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

export function KindText({ kind, plain = false }) {
  return (
    <span className="osp-word">
      {plain ? null : (
        <i className={`bi ${KIND_ICON[kind] || 'bi-file-text'}`} aria-hidden="true" />
      )}
      {kindLabel(kind)}
    </span>
  );
}

export function VisibilityText({ visibility, label = null }) {
  return (
    <span className="osp-word" title={visibilityLabel(visibility)}>
      <i className={`bi ${VISIBILITY_ICON[visibility] || 'bi-eye'}`} aria-hidden="true" />
      {label || visibilityLabel(visibility)}
    </span>
  );
}

/** "Mandate screen: Within mandate", a description of the screen, never advice. */
export function MandateText({ summary, prefix = true }) {
  const m = mandateScreen(summary);
  if (!m) return null;
  return (
    <span
      className="osp-mandate"
      title="Sonar's screen of the company against the fund mandate. The committee decides."
    >
      {prefix ? <span className="osp-mandate__label">Mandate screen:</span> : null}
      <span className={`tcc-${MANDATE_TONE[m.step]}`}>{m.label}</span>
    </span>
  );
}

export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="osp-skel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i}>
          <Skel w="100%" h={16} />
        </span>
      ))}
    </div>
  );
}

/**
 * A filter shown as text: "Status: All", emerald when a value is chosen. A
 * native select underneath keeps it usable by keyboard, screen reader and touch.
 */
export function TextSelect({ label, value, onChange, options, allLabel = 'All' }) {
  const chosen = options.find((o) => o.value === value);
  return (
    <label className={`osp-select${value ? ' is-on' : ''}`}>
      <span className="osp-select__text" aria-hidden="true">
        {label}: {chosen ? chosen.label : allLabel}
        <i className="bi bi-chevron-down" />
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
