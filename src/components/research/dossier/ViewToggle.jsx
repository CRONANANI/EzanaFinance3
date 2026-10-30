'use client';

const VIEWS = [
  { id: 'company', label: 'Company', icon: 'bi-building' },
  { id: 'industry', label: 'Industry', icon: 'bi-grid-3x3-gap' },
  { id: 'portfolio', label: 'Portfolio', icon: 'bi-pie-chart' },
];

/** Full-width segmented control. Keeps the existing setView / ?view= contract. */
export function ViewToggle({ view, setView }) {
  return (
    <div role="tablist" aria-label="Research view" className="crx-view-toggle">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={view === v.id}
          className="crx-view-toggle-btn"
          onClick={() => setView(v.id)}
        >
          <i className={`bi ${v.icon}`} aria-hidden="true" />
          <span>{v.label}</span>
        </button>
      ))}
    </div>
  );
}
