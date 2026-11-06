'use client';

/**
 * Citation markers for the research report (engine v3). `Cites` renders the
 * evidence markers (S1, S2...) as buttons that jump to the evidence explorer.
 * `RefCites` (Nov 2026, research team) takes a specialist finding's mixed refs
 * (S3, M:metric_id): evidence markers render as `Cites`; metric refs render by
 * their calculation's label and jump to the Methodology section's calculation
 * row. A metric id never shows as text: a ref with no known label is dropped.
 */
import { splitRefs } from '@/lib/sonar/research-state';

export function Cites({ markers, onCite }) {
  if (!markers?.length) return null;
  return (
    <span className="srr-cites">
      {markers.map((m) => (
        <button
          key={m}
          type="button"
          className="srr-cite"
          aria-label={`Evidence ${m}`}
          onClick={() => onCite(m)}
        >
          {m}
        </button>
      ))}
    </span>
  );
}

/**
 * `calcs`: Map of metric id -> { label, linked } where `linked` means the
 * Methodology section has a row to jump to.
 */
export function RefCites({ refs, onCite, calcs }) {
  const { evidence, metrics } = splitRefs(refs);
  const known = metrics.filter((id) => calcs?.get(id)?.label);
  if (!evidence.length && !known.length) return null;
  return (
    <span className="srr-cites">
      {evidence.length ? <Cites markers={evidence} onCite={onCite} /> : null}
      {known.map((id) => {
        const c = calcs.get(id);
        return c.linked ? (
          <button
            key={id}
            type="button"
            className="srr-cite is-calc"
            aria-label={`Calculation: ${c.label}`}
            onClick={() => onCite(`M:${id}`)}
          >
            {c.label}
          </button>
        ) : (
          <span key={id} className="srr-cite is-calc is-static">
            {c.label}
          </span>
        );
      })}
    </span>
  );
}

/** A DOM id for a calculation row; the metric id never renders as text. */
export function calcAnchor(id) {
  return `srr-calc-${String(id).replace(/[^A-Za-z0-9_-]/g, '-')}`;
}
