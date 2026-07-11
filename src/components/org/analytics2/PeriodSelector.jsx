'use client';

const OPTIONS = [
  { key: 'semester', label: 'This semester' },
  { key: 'ytd', label: 'YTD' },
  { key: 'inception', label: 'Since inception' },
];

/** Segmented period control — re-scopes the whole page via `onChange`. */
export function PeriodSelector({ value, onChange, disabled }) {
  return (
    <div className="fa-seg" role="tablist" aria-label="Reporting period">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={value === o.key ? 'is-active' : ''}
          disabled={disabled}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
