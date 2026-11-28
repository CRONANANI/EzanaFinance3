'use client';

/**
 * SonarVersionComparison (Nov 28 2026): what the council believed then, beside what is on
 * record now. The left column is the approved version exactly as approved, with its version
 * number and date; it is never edited. The right column lists the newer approved findings.
 * Assumptions read Confirmed or Contradicted only when a recorded monitor tested them;
 * everything else reads Untested.
 *
 * payload.data: versionComparison() from lib/org-sonar/intelligence/briefing.js
 */
import '../charts/sonar-research-library.css';

const MARK = {
  confirmed: ['bi-check-circle', 'Confirmed', 'var(--srl-pos)'],
  contradicted: ['bi-x-circle', 'Contradicted', 'var(--srl-neg)'],
  untested: ['bi-question-circle', 'Untested', 'var(--srl-faint)'],
};

export function SonarVersionComparison({ payload }) {
  const d = payload?.data || {};
  if (!d.original) return null;
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
        }}
      >
        <section aria-label="Original version">
          <p className="srl-labels">
            <span>Version {d.original.version}</span>
            <span>{String(d.original.date || '').slice(0, 10) || 'Date not recorded'}</span>
            <span>As approved</span>
          </p>
          <ul className="srl-feed">
            {(d.original.findings || []).map((f, i) => (
              <li key={f.id || i} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                {f.text}
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Current evidence">
          <p className="srl-labels">
            <span>Current</span>
            <span>
              {d.current?.asOf ? String(d.current.asOf).slice(0, 10) : 'No newer approved research'}
            </span>
          </p>
          <ul className="srl-feed">
            {(d.newFindings || []).length ? (
              d.newFindings.map((f, i) => (
                <li key={f.id || i} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                  {f.text}
                </li>
              ))
            ) : (
              <li style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>No new findings on record.</li>
            )}
          </ul>
        </section>
      </div>
      {(d.assumptions || []).length ? (
        <section aria-label="Assumptions" style={{ marginTop: 14 }}>
          <ul className="srl-feed">
            {d.assumptions.map((a, i) => {
              const [icon, label, color] = MARK[a.status] || MARK.untested;
              return (
                <li key={i} style={{ gridTemplateColumns: '22px minmax(0, 1fr)' }}>
                  <i className={`bi ${icon}`} aria-hidden="true" style={{ color, marginTop: 2 }} />
                  <span>
                    <span style={{ color: 'var(--srl-text)' }}>{String(a.assumption)}</span>{' '}
                    <span className="srl-labels" style={{ display: 'inline-flex' }}>
                      {label}
                    </span>
                    <span style={{ display: 'block' }}>{a.basis}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default SonarVersionComparison;
